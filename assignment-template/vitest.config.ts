import { ClassroomJsonReporter, ReleaseNotesReporter } from '@ohjelmistokehitys/autograder';
import { defineConfig } from 'vitest/config';

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
