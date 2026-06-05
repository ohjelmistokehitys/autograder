# Autograder Utilities

This repository contains a small TypeScript-based autograding toolkit built around Vitest. The toolkit provides the following capabilities:

1. Running command-based test suites with structured metadata (points, descriptions, logs).
2. Building [Classroom50](https://github.com/foundation50/Classroom50)-compatible `result.json` reports from Vitest JSON output.
3. Generating human-readable release notes in Markdown format from the same Vitest output.


## Test suite runner ([runner.ts](./src/runner.ts))

The runner utilities allow you to define test suites with commands to run, expected output, points, and timeouts. You can use these utilities inside your Vitest specs to create command-driven autograding tests.

For example, the following test suite runs a simple "Hello world" command and checks its output:

```ts
runSuite({
    defaults: {
        timeout: { seconds: 5 },
        points: 1
    },

    tests: [
        {
            name: "Run simple built-in command",
            description: "Simple experiment that compares the output of a command to an expected string.",
            $run: "echo 'Hello world!'",
            contains: "Hello world!"
        },
        {
            name: "Run JUnit tests with Gradle",
            description: "A more complex test that runs a Gradle command and has its custom points and timeout.",
            $run: "./gradlew test",
            points: 10,
            timeout: { seconds: 30 }
        },
        {
            name: "Run Python tests with pytest",
            description: "This test has a setup command that runs before the main command. Also, the $run field can be a string or an array of strings to run multiple commands in sequence.",
            $setup: "pip install pytest",
            $run: ["pytest first_tests.py", "pytest additional_tests.py"],
            contains: ["Hello world!", "All tests passed!"],
            points: 10,
            timeout: { minutes: 1 }
        }
    ]
});
```

Attributes prefixed with `$` have special meaning. The `$setup` and `$run` fields specify commands to run for setup and testing, respectively. These commands will be executed in the shell using the `zx` library, which provides a convenient API for running shell commands in Node.js. The `$run` field can be either a string (for a single command) or an array of strings (for multiple commands to run in sequence). The runner will execute these commands and capture their output for grading.

The runner can run multiple test suites in a single run and each suite can have their own points, timeouts and setup commands. See more examples in `tests/example.spec.ts`.

Grading the results of each test can be based on the presence or absence of specified strings in the command output, or by comparing the output of the command to another command. The runner captures all command output and error logs for each test case, which can be included in the final grading report. If a test case fails, the runner will include the relevant logs and error messages in the final report to help with debugging.

More fine grained control over points can be achieved by running unit tests in smaller chunks and making each a separate test case. For example, instead of running all JUnit tests in one command, you could run each test class separately and assign points to each. This also makes it easier to identify which specific tests are failing and provide more targeted feedback in the release notes.


## Report generator ([reporter.ts](./src/reporter.ts))

The report generator takes the raw JSON output from Vitest and transforms it into a `result.json` file that follows the [Classroom50 contract](https://github.com/foundation50/classroom50/wiki/Autograders#the-resultjson-contract). This includes calculating the total score and maximum score. The report generator requires [Classroom50 specific environment variables](https://github.com/foundation50/classroom50/wiki/Autograders#contract) to populate metadata fields in the report, such as `CLASSROOM`, `ASSIGNMENT`, `USERNAME`, `SUBMISSION_TAG`, `COMMIT_URL`, and `RELEASE_URL`. These need to be provided in the environment where the report generator is being run.


## Release notes generator ([release-notes.ts](./src/release-notes.ts))

The release notes generator also takes the same Vitest JSON output and produces a human-readable `release-notes.md` file. This file includes a summary of the total score, pass/fail counts, a table of test cases with their points, and detailed logs for each test case. This is useful for providing feedback to students on their submissions, showing them which tests passed or failed and what the output was for each command that was run.


## Typical Workflow

1. Run tests with Vitest and export JSON results.

    ```
    npm test
    ```

2. Build the Classroom-compatible `result.json` report from Vitest output.

    ```
    npm run report
    ```

3. Build Markdown release notes from the same Vitest output.

    ```
    npm run release-notes
    ```
