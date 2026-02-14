import fs from 'fs/promises';
import path from 'path';

const KNOWLEDGE_FILE = path.join(process.cwd(), 'data', 'knowledge_rules.json');

// Ensure data directory exists
async function ensureDataDir() {
    const dataDir = path.dirname(KNOWLEDGE_FILE);
    try {
        await fs.access(dataDir);
    } catch {
        await fs.mkdir(dataDir, { recursive: true });
    }
}

let cachedKnowledge = null;
let writeQueue = Promise.resolve(); // Sequential write lock

export async function getKnowledge() {
    if (cachedKnowledge) return cachedKnowledge;

    await ensureDataDir();
    try {
        const data = await fs.readFile(KNOWLEDGE_FILE, 'utf8');
        cachedKnowledge = JSON.parse(data);
    } catch {
        cachedKnowledge = {
            overrides: {},
            patterns: []
        };
    }
    return cachedKnowledge;
}

// Helper to normalize strings for robust keyword matching
function cleanString(str) {
    if (!str) return '';
    return str.toLowerCase()
        .normalize('NFC')
        .replace(/[\.\_\-\(\)\[\]\s+]/g, ' ') // Replace dots, underscores, dashes, brackets with spaces
        .replace(/\s+/g, ' ')                // Collapse multiple spaces
        .trim();
}

export async function learnPattern(item, targetCategory, targetSub) {
    // Lock the write process to prevent concurrent corruption
    return writeQueue = writeQueue.then(async () => {
        const knowledge = await getKnowledge();

        let rawName = item.name;
        try {
            rawName = decodeURIComponent(item.name);
        } catch { }

        const ext = path.extname(rawName).toLowerCase();
        const keyword = cleanString(rawName.replace(ext, ''));

        if (!keyword || keyword.length < 2) return knowledge;

        const newPattern = {
            keyword: keyword,
            ext: ext,
            primary: targetCategory,
            sub: targetSub || 'Manual'
        };

        // Prevent duplicates
        const idx = knowledge.patterns.findIndex(p =>
            cleanString(p.keyword) === keyword && p.ext === newPattern.ext
        );

        if (idx !== -1) {
            knowledge.patterns[idx] = newPattern;
        } else {
            knowledge.patterns.push(newPattern);
        }

        await fs.writeFile(KNOWLEDGE_FILE, JSON.stringify(knowledge, null, 2));
        cachedKnowledge = knowledge;
        console.log(`[Knowledge] Learned: "${keyword}" -> ${targetCategory}`);

        return knowledge;
    });
}

export async function getMatch(fileName) {
    const knowledge = await getKnowledge();

    // Clean the incoming filename for comparison
    const targetClean = cleanString(fileName);

    // Sort patterns by keyword length (descending) to match most specific (longest) keyword first
    const sorted = [...knowledge.patterns].sort((a, b) => b.keyword.length - a.keyword.length);

    for (const p of sorted) {
        const patternClean = cleanString(p.keyword);

        if (targetClean.includes(patternClean)) {
            return {
                primary: p.primary,
                sub: p.sub,
                isLearned: true
            };
        }
    }
    return null;
}
