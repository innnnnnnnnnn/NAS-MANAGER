import { scanDirectory } from './services/scanner.js';
import path from 'path';

async function test() {
    const target = '/Users/innnnnnnnnnnmbp/Downloads';
    console.log('Testing scan for:', target);
    try {
        const results = await scanDirectory(target, (batch) => {
            console.log(`Found batch of ${batch.length} files`);
        }, true);
        console.log('Total files found:', results.length);
    } catch (err) {
        console.error('Scan failed:', err);
    }
}

test();
