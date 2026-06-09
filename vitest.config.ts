import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        reporters: [
            'default',
            ['./src/classroom50reporter.ts', { outputFile: 'result.json' }],
            ['json', { outputFile: 'vitest-output.json' }]
        ],
    },
})
