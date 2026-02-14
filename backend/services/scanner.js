import fs from 'fs/promises';
import path from 'path';
import { classifyFile } from './classifier.js';

console.log('>>> SCANNER SERVICE V15 (ULTIMATE RECOVERY) LOADED');

/**
 * Fast sampling to determine folder category.
 */
async function getFolderCategory(dirPath) {
    let votes = { PROGRAMS: 0, GAMES: 0, DOCUMENTS: 0, MEDIA: 0, DOWNLOADS: 0, OTHERS: 0 };
    let totalSize = 0;
    let fileCount = 0;

    try {
        const items = await fs.readdir(dirPath);
        // Sample up to 50 items for accuracy/speed balance
        for (const name of items.slice(0, 50)) {
            if (name.startsWith('.')) continue;
            const fullPath = path.join(dirPath, name);
            try {
                const s = await fs.stat(fullPath);
                if (s.isFile()) {
                    fileCount++;
                    totalSize += s.size;
                    const c = await classifyFile(name);
                    votes[c.primary] = (votes[c.primary] || 0) + 1;
                }
            } catch { }
        }
    } catch { }

    let dominant = 'OTHERS';
    let maxVotes = 0;
    for (const [cat, count] of Object.entries(votes)) {
        if (count > maxVotes) {
            maxVotes = count;
            dominant = cat;
        }
    }

    return { primary: dominant, size: totalSize, fileCount };
}

export async function scanDirectory(dirPath, onBatchFound = null, recursive = false, shouldAbort = () => false) {
    console.log(`[Scanner V15] Target: ${dirPath}`);

    // Attempt to access the directory with multiple normalization attempts
    const absolutePath = path.resolve(dirPath);
    let items = [];
    try {
        items = await fs.readdir(absolutePath, { withFileTypes: true });
    } catch (e) {
        console.warn(`[Scanner V15] Failed raw path, trying NFC...`);
        items = await fs.readdir(absolutePath.normalize('NFC'), { withFileTypes: true });
    }

    console.log(`[Scanner V15] Entries found: ${items.length}`);

    const results = [];
    // Sequential processing to ensure every file is handled without freezing the loop
    for (const item of items) {
        if (shouldAbort()) break;
        if (item.name.startsWith('.')) continue;

        const fullPath = path.join(absolutePath, item.name);
        try {
            let unit = {
                name: item.name,
                path: fullPath,
                isFolder: item.isDirectory(),
                relDir: '.',
                mtime: new Date()
            };

            // Uniform classification for both files and folders using Knowledge Engine first
            const c = await classifyFile(item.name);
            unit.primary = c.primary;
            unit.sub = c.sub;

            if (item.isDirectory()) {
                const info = await getFolderCategory(fullPath);
                // Keep info like size/count, but let classifier (Knowledge) override primary if match found
                if (c.primary === 'OTHERS' || !c.isLearned) {
                    unit.primary = info.primary;
                }
                unit.sub = 'Folder';
                unit.size = info.size;
                unit.fileCount = info.fileCount;
            } else {
                const s = await fs.stat(fullPath);
                unit.size = s.size;
                unit.fileCount = 1;
                unit.mtime = s.mtime;
            }

            results.push(unit);
            if (onBatchFound) {
                onBatchFound([unit]); // Stream individually for maximum visibility
            }

            // Short pause to allow event loop to breathe and SSE to flush
            await new Promise(r => setTimeout(r, 1));
        } catch (err) {
            // Silently skip inaccessible items
            console.warn(`[Scanner V15] Skipping ${item.name}: ${err.message}`);
        }
    }

    console.log(`[Scanner V15] Scan Finished. Total Units: ${results.length}`);
    return results;
}
