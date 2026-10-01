import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        reporters: [
            'default',
            ['github-actions', { jobSummary: { enabled: false } }],
        ],
    },
});
