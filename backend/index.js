import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { scanDirectory } from './services/scanner.js';
import { findDuplicates } from './services/duplicateFinder.js';
import { learnPattern } from './services/knowledge.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Core Endpoints
app.get('/api/status', (req, res) => {
    res.json({ status: 'online', timestamp: new Date() });
});

app.post('/api/connect-nas', (req, res) => {
    const { server } = req.body;
    if (!server) return res.status(400).json({ error: 'Server address is required' });

    const address = server.includes('://') ? server : `smb://${server}`;
    console.log(`[NAS] Attempting to connect to: ${address}`);

    const command = `open "${address}"`;
    console.log(`[NAS] Executing command: ${command}`);

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`[NAS] Connect failed:`, error);
            console.error(`[NAS] stderr: ${stderr}`);
            return res.status(500).json({ error: `Connection failed: ${error.message}` });
        }
        console.log(`[NAS] Dialog triggered successfully. stdout: ${stdout}`);
        res.json({ message: 'Connection dialog opened' });
    });
});

app.post('/api/browse', async (req, res) => {
    const { path: dirPath } = req.body;
    const targetPath = (dirPath === undefined || dirPath === null || dirPath === '')
        ? '/Users/innnnnnnnnnnmbp/Downloads'
        : dirPath;

    try {
        const items = await fs.readdir(targetPath, { withFileTypes: true });
        const contents = await Promise.all(items
            .filter(item => !item.name.startsWith('.'))
            .map(async item => {
                const fullPath = join(targetPath, item.name);
                let size = 0;
                try {
                    const s = await fs.stat(fullPath);
                    size = s.size;
                } catch { }
                return {
                    name: item.name,
                    path: fullPath,
                    isFolder: item.isDirectory(),
                    size
                };
            }));

        const roots = [
            { name: 'Root (/)', path: '/' },
            { name: 'Volumes (NAS)', path: '/Volumes' },
            { name: 'Home', path: '/Users/innnnnnnnnnnmbp' },
            { name: 'Downloads', path: '/Users/innnnnnnnnnnmbp/Downloads' }
        ];

        const parentPath = targetPath === '/' ? null : dirname(targetPath);

        res.json({
            current: targetPath,
            parent: parentPath,
            directories: contents.filter(c => c.isFolder).sort((a, b) => a.name.localeCompare(b.name)),
            files: contents.filter(c => !c.isFolder).sort((a, b) => a.name.localeCompare(b.name)),
            roots
        });
    } catch (error) {
        console.error(`Browse failed for ${targetPath}:`, error);
        let errorMsg = error.message;
        if (error.code === 'EACCES') {
            errorMsg = 'Permission denied. Please ensure the terminal has Full Disk Access in System Settings.';
        }
        res.status(500).json({ error: errorMsg });
    }
});

app.get('/api/scan-stream', async (req, res) => {
    const { directory, recursive } = req.query;
    if (!directory) return res.status(400).json({ error: 'Directory is required' });

    const decodedPath = decodeURIComponent(directory);
    console.log(`[Stream API] Target Path: "${decodedPath}"`);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Initial comment to flush headers immediately
    res.write(': sse-start\n\n');
    if (res.flush) res.flush();

    // Keep-alive heartbeat every 15 seconds
    const keepAlive = setInterval(() => {
        res.write(': keepalive\n\n');
        if (res.flush) res.flush();
    }, 15000);

    let isAborted = false;
    req.on('close', () => {
        isAborted = true;
        console.log('[Stream] Client closed connection.');
    });

    const isRecursive = recursive === 'true';
    console.log(`[Stream] SCAN START: ${decodedPath} (Unit Mode)`);

    try {
        await scanDirectory(decodedPath, (batch) => {
            if (isAborted) return;
            try {
                const payload = JSON.stringify({ type: 'files', data: batch });
                res.write(`data: ${payload}\n\n`);
                if (res.flush) res.flush();
            } catch (e) {
                console.error('[Stream] Data serialization error:', e);
            }
        }, isRecursive, () => isAborted);

        if (!isAborted) {
            res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
            if (res.flush) res.flush();
        }
    } catch (error) {
        if (!isAborted) {
            console.error('[Stream] FATAL:', error);
            res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
            if (res.flush) res.flush();
        }
    } finally {
        console.log(`[Stream] Closing stream for: ${directory}`);
        clearInterval(keepAlive);
        res.end();
    }
});

app.post('/api/execute-category', async (req, res) => {
    const { baseDir, category, files } = req.body;
    if (!baseDir || !category || !files) return res.status(400).json({ error: 'Missing parameters' });

    console.log(`[Execute] Category: ${category}, Files: ${files.length}`);

    const results = { moved: 0, failed: 0, errors: [] };
    const createdDirs = new Set();

    for (const file of files) {
        // Robust Move with Retries (for NAS stability)
        let attempts = 0;
        let success = false;

        while (attempts < 3 && !success) {
            try {
                const targetDir = join(baseDir, file.primary, file.sub);
                const targetPath = join(targetDir, file.name);

                // Only mkdir if we haven't in this session to reduce NAS overhead
                if (!createdDirs.has(targetDir)) {
                    await fs.mkdir(targetDir, { recursive: true });
                    createdDirs.add(targetDir);
                }

                await fs.rename(file.path, targetPath);
                results.moved++;
                success = true;
            } catch (error) {
                attempts++;
                if (attempts === 3) {
                    console.error(`[Execute] Final failure for ${file.path}:`, error.message);
                    results.failed++;
                    results.errors.push({ file: file.name, error: error.message });
                } else {
                    // Small wait before retry to let NAS catch up
                    await new Promise(r => setTimeout(r, 200));
                }
            }
        }
    }

    res.json(results);
});

app.post('/api/batch-action', async (req, res) => {
    const { action, files } = req.body;
    if (!action || !files) return res.status(400).json({ error: 'Action and files required' });

    console.log(`[Batch] ${action} for ${files.length} files`);

    if (action === 'delete') {
        const results = { deleted: 0, failed: 0 };
        for (const filePath of files) {
            try {
                await fs.rm(filePath, { recursive: true, force: true });
                results.deleted++;
            } catch (error) {
                console.error(`[Batch Delete] Failed for ${filePath}:`, error.message);
                results.failed++;
            }
        }
        return res.json(results);
    }

    if (action === 'move') {
        const { targetCategory, targetSub, baseDir } = req.body.meta || {};
        const results = { moved: 0, failed: 0 };

        for (const filePath of files) {
            try {
                const fileName = path.basename(filePath);
                const targetDir = path.join(baseDir, targetCategory, targetSub || 'Manual');
                const targetPath = path.join(targetDir, fileName);

                await fs.mkdir(targetDir, { recursive: true });
                await fs.rename(filePath, targetPath);

                // Automatic Learning
                await learnPattern({ name: fileName }, targetCategory, targetSub || 'Manual');

                results.moved++;
            } catch (error) {
                console.error(`[Batch Move] Failed for ${filePath}:`, error.message);
                results.failed++;
            }
        }
        return res.json(results);
    }

    res.status(400).json({ error: 'Unsupported action' });
});

app.post('/api/scan', async (req, res) => {
    const { directory, recursive = false } = req.body;
    if (!directory) return res.status(400).json({ error: 'Directory path is required' });

    try {
        const files = await scanDirectory(directory, null, recursive);
        const duplicates = findDuplicates(files);

        const categorized = files.reduce((acc, file) => {
            if (!acc[file.primary]) acc[file.primary] = { count: 0, size: 0, subCategories: {} };
            acc[file.primary].count++;
            acc[file.primary].size += file.size;
            if (!acc[file.primary].subCategories[file.sub]) acc[file.primary].subCategories[file.sub] = [];
            acc[file.primary].subCategories[file.sub].push(file);
            return acc;
        }, {});

        res.json({
            stats: {
                totalFiles: files.length,
                totalSize: files.reduce((acc, f) => acc + f.size, 0),
                duplicateSize: duplicates.reduce((acc, d) => acc + d.totalSize, 0)
            },
            categorized,
            duplicates
        });
    } catch (error) {
        console.error('Scan failed:', error);
        res.status(500).json({ error: 'Failed to scan directory: ' + error.message });
    }
});

app.delete('/api/file', async (req, res) => {
    const { filePath } = req.body;
    if (!filePath) return res.status(400).json({ error: 'File path is required' });

    try {
        await fs.rm(filePath, { recursive: true, force: true });
        res.json({ message: 'Item deleted successfully' });
    } catch (error) {
        console.error('Delete failed:', error);
        res.status(500).json({ error: 'Failed to delete item: ' + error.message });
    }
});

app.post('/api/learn', async (req, res) => {
    const { item, targetCategory, targetSub } = req.body;
    if (!item || !targetCategory) return res.status(400).json({ error: 'Item and target category required' });

    try {
        const knowledge = await learnPattern(item, targetCategory, targetSub);
        res.json({ success: true, knowledge });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
