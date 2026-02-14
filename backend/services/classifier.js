import path from 'path';
import { getMatch } from './knowledge.js';

const EXT_RULES = {
    PROGRAMS: ['.exe', '.msi', '.dmg', '.pkg', '.app'],
    GAMES: ['.bin', '.cue', '.nds', '.cia', '.apk', '.nes', '.smc', '.sfc', '.gb', '.gbc', '.gba', '.iso'],
    DOCUMENTS: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.md', '.epub', '.pages', '.numbers'],
    MEDIA: ['.jpg', '.jpeg', '.png', '.gif', '.heic', '.mp4', '.mkv', '.mov', '.mp3', '.wav', '.flac', '.bmp', '.svg', '.avi', '.wmv'],
    DOWNLOADS: ['.zip', '.rar', '.7z', '.tar', '.gz']
};

export const classifyFile = async (name) => {
    const ext = path.extname(name).toLowerCase();

    // 1. Check Learned Knowledge (User Overrides)
    const knownMatch = await getMatch(name);
    if (knownMatch) {
        console.log(`[Classifier] Knowledge Hit: "${name}" -> ${knownMatch.primary}`);
        return { ...knownMatch, isLearned: true };
    }

    // 2. Pure Extension Matching
    for (const [category, extensions] of Object.entries(EXT_RULES)) {
        if (extensions.includes(ext)) {
            return {
                primary: category,
                sub: 'System',
                ext
            };
        }
    }

    return {
        primary: 'OTHERS',
        sub: 'Misc',
        ext
    };
};
