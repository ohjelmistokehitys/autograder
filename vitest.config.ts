import { loadEnvFile } from 'node:process';
import { defineConfig } from 'vitest/config';

// This is not a part of the example. It just loads environment variables from a .env file,
// which are expected to be present in the actual autograding environment automatically.
loadEnvFile('./example.env');

export default defineConfig({
    test: {
        reporters: [
            'default',
            ['./src/reporters/classroom-json.ts', { resultFile: 'result.json' }],
            ['./src/reporters/release-notes.ts', { notesFile: 'release-notes.md' }],
            ['json', { outputFile: 'vitest-output.json' }]
        ],
    },
})
