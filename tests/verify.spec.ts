import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

let releaseNotes: string;
let resultJsonRaw: string;

beforeAll(async () => {
    releaseNotes = await readFile(resolve(process.cwd(), 'release-notes.md'), 'utf8');
    resultJsonRaw = await readFile(resolve(process.cwd(), 'result.json'), 'utf8');
});

describe('release-notes.md', () => {
    it('matches snapshot', () => {
        const contents = stripEnvironmentDetails(releaseNotes);

        expect(contents).toMatchSnapshot();
    });
});

describe('result.json', () => {
    it('matches snapshot', () => {
        const resultJson = JSON.parse(resultJsonRaw);

        // ignore datetime field in snapshot tests since it will be different on every test run
        resultJson["datetime"] = expect.any(String);

        expect(resultJson).toMatchSnapshot();
    });
});

/**
 * Replaces variable data, such as working directory paths and line
 * numbers in stack traces with placeholders so snapshots are less flaky
 * across different environments, test runs and dependency versions.
 */
function stripEnvironmentDetails(report: string): string {
    return ignoreErrorLineDetails(ignoreWorkingDirectory(report));
}

/**
 * Working directory paths can be different across environments and runs, so this function
 * replaces all occurrences of the current working directory in the given report with
 * a placeholder string.
 *
 * This is useful for making test snapshots more stable and not dependent on the specific
 * environment where the tests are run.
 */
function ignoreWorkingDirectory(report: string): string {
    return report.replaceAll(process.cwd(), '<WORKING_DIRECTORY>');
}

function ignoreErrorLineDetails(report: string): string {
    // find file paths followed by line numbers in error stack traces and replace them:
    const errorLinePattern = /at file:[\S]+:\d+:\d+/g;

    return report.replace(errorLinePattern, 'at file://<ERROR_LINE_DETAILS>');
}

