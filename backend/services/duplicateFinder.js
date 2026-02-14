export function findDuplicates(files) {
    const hashGroups = {};

    // Group by hash
    files.forEach(file => {
        if (file.hash) {
            if (!hashGroups[file.hash]) {
                hashGroups[file.hash] = [];
            }
            hashGroups[file.hash].push(file);
        }
    });

    // Filter groups with more than one file
    const duplicates = Object.entries(hashGroups)
        .filter(([hash, group]) => group.length > 1)
        .map(([hash, group]) => ({
            hash,
            files: group,
            totalSize: group.reduce((acc, f) => acc + f.size, 0) - group[0].size, // Potential savings
            count: group.length
        }));

    return duplicates;
}

export function findSimilar(files) {
    // Simple similarity: same name and similar size (within 10%) but different hash
    // This is more complex, for now we just return basic duplicates.
    return [];
}
