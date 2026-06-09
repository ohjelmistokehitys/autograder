import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        reporters: [
            'default',
            ['./autograding-reporters/src/classroom50reporter.ts', { outputFile: 'result.json' }],
            ['./autograding-reporters/src/release-notes-reporter.ts', { outputFile: 'release-notes.md' }],
            ['json', { outputFile: 'vitest-output.json' }]
        ],
    },
})
