import { loadEnvFile } from 'node:process';
import { defineConfig } from 'vitest/config';
import { ClassroomJsonReporter, ReleaseNotesReporter } from './src';

// This is not a part of the example. It just loads environment variables from a .env file,
// which are expected to be present in the actual autograding environment automatically.
loadEnvFile('./example.env');

export default defineConfig({
    test: {
        reporters: [
            'default',
            new ClassroomJsonReporter({ resultFile: 'result.json' }),
            new ReleaseNotesReporter({ notesFile: 'release-notes.md' }),
            ['json', { outputFile: 'vitest-output.json' }]
        ],
    },
});
