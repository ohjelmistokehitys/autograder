# Autograder Utilities

This repository contains a small TypeScript-based autograding toolkit built on top of Vitest.

It provides three pieces that work together:

1. A command-driven [test runner](./src/runner/runner.ts) for writing autograding specs in Vitest.
2. A custom [Vitest reporter that writes Classroom50-compatible](./src/reporters/classroom-json.ts) `result.json` output.
3. A custom [Vitest reporter that writes human-readable](./src/reporters/release-notes.ts) `release-notes.md` feedback.

Both output files are generated during the Vitest run itself, assuming that the [configuration](./vitest.config.ts) is set up to use the custom reporters.

These tools are designed to work in an Unix-like environment with `bash` and such tools available. They should not work in a pure Windows environment without WSL, Docker or similar setup. This repository contains a development container configuration, which is a recommended way to use and develop the utilities. For running the autograder in production, you should use a CI environment such as GitHub actions.

## Test Suite Runner

The runner in [src/runner/runner.ts](./src/runner/runner.ts) lets you define suites whose test cases execute shell commands, capture logs, and assign scores.

Each suite defines:

- a `name` and `description`
- a `defaultTimeout`
- a `defaultScore`
- optional lifecycle hooks such as `beforeAll`, `beforeEach`, `afterEach`, and `afterAll`
- a list of tests

Each test case can define:

- `$run` for the command to execute
- optional `$setup` to prepare the environment before `$run`
- `contains` and `notContains` assertions for output matching
- optional `$compareRun` for command-to-command comparisons
- optional `score` override per test
- optional `customGrader` for custom scoring logic

Commands are executed with `zx` through `bash`, and the runner stores command logs in Vitest task metadata so the reporters can include them in generated outputs.

Example:

```ts
import { runSuite } from '../src/runner/runner.js'; // or '@ohjelmistokehitys/autograder';

runSuite({
    name: 'Example test suite',
    description: 'Demonstrates command-based autograding with Vitest.',
    defaultTimeout: { seconds: 5 },
    defaultScore: 10,

    beforeAll: "echo 'Setting up test environment...'",

    tests: [
        {
            name: 'Run a Node.js program',
            description: 'Executes the demo script and verifies its output.',
            $run: 'node demo/hello.js',
            contains: 'Hello from JavaScript!'
        },
        {
            name: 'Compile and run Java',
            description: 'Compiles the demo Java program before running it.',
            $setup: 'javac demo/Hello.java',
            $run: 'java -cp demo Hello',
            contains: 'Hello from Java!',
            score: 20,
            timeout: { seconds: 30 }
        },
        {
            name: 'Custom grading example',
            description: 'Uses a custom grader to award partial credit.',
            $run: "echo 'Random points for this example!'",
            score: 80,
            customGrader: async ({ logs, testCase, testSuite }) => {
                const score = Math.floor((testCase.score ?? testSuite.defaultScore) * 0.5);

                logs.push({
                    command: 'Custom grader',
                    stdout: `Awarded ${score} points based on custom grading logic.`,
                    ok: true
                });

                return { score };
            }
        }
    ]
});
```

For a fuller example, see [tests/example.spec.ts](./tests/example.spec.ts).

## Custom Reporters

The reporters are configured in [vitest.config.ts](./vitest.config.ts):

- [src/reporters/classroom-json.ts](./src/reporters/classroom-json.ts) writes `result.json`
- [src/reporters/release-notes.ts](./src/reporters/release-notes.ts) writes `release-notes.md`
- Vitest's built-in JSON reporter also writes `vitest-output.json` for inspection, but it is not directly required.

A normal Vitest run can produce all outputs in one pass as long as they are configured as reporters in `vitest.config.ts`.

### `result.json`

The Classroom JSON reporter writes a [Classroom50](https://github.com/foundation50/classroom50/wiki/Autograders#the-resultjson-contract)-compatible `result.json` file.

It collects test metadata and scores from the Vitest run and combines that with Classroom environment variables such as:

- `CLASSROOM`
- `ASSIGNMENT`
- `USERNAME`
- `SUBMISSION_TAG`
- `COMMIT_URL`
- `RELEASE_URL`

### `release-notes.md`

The release notes reporter writes a Markdown report that includes:

- suite name and description
- total score and pass count
- a summary table of test cases
- command logs and failure output for each test case

This makes it suitable for publishing student-facing grading feedback.

### Adding Reporters to Projects

Reporters can be added to any Vitest project by importing them and including them in the `reporters` array in `vitest.config.ts`. See example configuration in [vitest.config.ts](./vitest.config.ts) or below:

```ts
import { defineConfig } from 'vitest/config';
import { ClassroomJsonReporter, ReleaseNotesReporter } from '@ohjelmistokehitys/autograder';

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
```

If your autograding setup does not live in the repository root, adjust the `resultFile` and `notesFile` paths accordingly, for example `../result.json` and `../release-notes.md`.

## Typical Workflow During Development

The main test flow is driven through npm scripts in [package.json](./package.json).

Run the example suite and generate output files:

```sh
npm run test:example
```

Verify the generated `result.json` and `release-notes.md` against snapshots:

```sh
npm run test:verify
```

Run the full local workflow:

```sh
npm test
```

This does the following:

1. Removes old `result.json` and `release-notes.md` files.
2. Runs the example suite.
3. Runs the snapshot verification suite.

If you want to clear generated outputs manually, use:

```sh
npm run test:clean
```

## Typical Workflow in Student Repositories

In a student repository, you would typically include the test suite runner and the custom reporters as dependencies, and configure the npm scripts to run the tests and generate feedback. You would not include the snapshot verification or example test suites in the student repository.

In short, the student repository's workflow would look like this:

```sh
npm install

# assuming that vitest.config.ts is set up to use the custom reporters
npx vitest run
```
