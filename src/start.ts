import { startVitest } from 'vitest/node';
import { ClassroomJsonReporter, ReleaseNotesReporter } from './index.js';

const vitest = await startVitest(
    'test',
    [
        // CLI filters
        'tests/example.spec.ts' // TODO: make this more flexible, e.g. by accepting CLI arguments
    ],
    {
        // override test config
        reporters: [
            'default',
            new ClassroomJsonReporter({ resultFile: 'result.json' }),
            new ReleaseNotesReporter({ notesFile: 'release-notes.md' }),
            ['json', { outputFile: 'vitest-output.json' }]
        ],
        watch: false,
    },
    {
        // override Vite config
    },
    {
        // custom Vitest options
    },
);
const testModules = vitest.state.getTestModules();

for (const testModule of testModules) {
    console.log(testModule.moduleId, testModule.ok() ? 'passed' : 'failed');
}
