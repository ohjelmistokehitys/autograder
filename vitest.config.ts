import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        reporters: [
            'default',
            ['./src/reporters/classroom50reporter.ts', { outputFile: 'result.json' }],
            ['./src/reporters/release-notes-reporter.ts', { outputFile: 'release-notes.md' }],
            ['json', { outputFile: 'vitest-output.json' }]
        ],
    },
})
