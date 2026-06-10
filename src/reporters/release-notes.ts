import fs from 'node:fs';
import { TestModule, TestSuite, Vitest } from 'vitest/node';
import type { Reporter } from 'vitest/reporters';
import { RunLog } from '../types.js';
import { TestResult } from './models/test-result.js';

/** Default output file, if none is specified in the reporter options. */
const DEFAULT_NOTES_FILE = 'release-notes.md';

export type ReporterOptions = {
    /** The file path where the test results will be written. */
    notesFile?: string
}

/**
 * Generates a markdown file containing release notes for the test run. The release notes
 * include a summary of the test results and output from each test case, formatted in markdown.
 */
export default class ReleaseNotesReporter implements Reporter {
    private readonly notesFile;
    private ctx!: Vitest;

    constructor(options: ReporterOptions) {
        this.notesFile = options.notesFile ?? DEFAULT_NOTES_FILE;
    }

    onInit(vitest: Vitest) {
        this.ctx = vitest;
    }

    async onTestRunEnd(testModules: ReadonlyArray<TestModule>) {
        const output = new MarkdownReport(testModules).build();

        this.ctx.logger.log(`Writing results to ${this.notesFile}`);
        fs.writeFileSync(this.notesFile, output, 'utf-8');
    }
}

/**
 * Class for generating a markdown report from a test run.
 */
class MarkdownReport {
    readonly suite: TestSuite;
    readonly testResults: TestResult[];

    constructor(testModules: ReadonlyArray<TestModule>) {
        this.suite = [...testModules[0].children.suites()][0];

        // combine TestCases from all suites into one arrray of TestResult objects
        this.testResults = testModules.flatMap(
            (module) => [...module.children.allTests()]
        ).map(test => new TestResult(test));
    }

    /**
     * Builds the full markdown report, including a summary of test results and detailed sections for each test case.
     */
    build(): string {
        return [
            this.headLines(),
            this.summaryLines(),
            this.testCaseLines()
        ].flat().join('\n\n');
    }

    /**
     * Builds the header section of the markdown report, including potential suite level errors.
     */
    headLines(): string[] {
        const name = this.suite.name;
        const { description } = this.suite.meta();

        const scores = {
            score: sum(this.testResults.map(result => result.score)),
            maxScore: sum(this.testResults.map(result => result.maxScore)),
            passed: this.testResults.filter(result => result.passed).length
        };

        let lines = [
            `# ${name}`,
            trimIndentation(description ?? ''),
            '----',
            `Score: **${scores.score} / ${scores.maxScore}**`,
            `Passed: **${scores.passed} / ${this.testResults.length}**`,
            '----',
        ];

        // if there were any suite level errors that prevented tests from running, include them in the report
        if (this.suite.errors().length > 0) {
            lines.push(
                `## Errors that prevented tests from running`,
                ...this.suite.errors().map(err => code(`❌ ${err.message}`))
            );
        }

        return lines;
    }

    /**
     * Builds the summary section of the markdown report, including a table of all test cases.
     */
    summaryLines(): string[] {
        const header = [
            `| Ok? | Test name | Status | Points |`,
            `| --- | --- | --- | --- |`
        ];

        const rows = this.testResults
            .map(test => [
                test.icon,
                `[${test.name}](#${test.anchor})`, // link to the log section for this test case
                test.status,
                `${test.score} / ${test.maxScore}`
            ])
            .map(row => `| ${row.join(' | ')} |`);

        const table = [...header, ...rows].join('\n');

        return [`## Summary`, table];
    }

    /**
     * Builds the detailed section for each test case.
     */
    testCaseLines(): string[] {
        const testCaseReports = this.testResults.map(test => {
            const commandLogs = test.logs.map((log) => this.commandLog(log));
            const score = test.maxScore ? `(${test.score ?? 0} / ${test.maxScore} points)` : '';

            return [
                `<a name="${test.anchor}"><!-- anchor for linking from the table of contents --></a>`,

                `### ${test.name} ${score} [${test.icon} ${test.status}]`,

                trimIndentation(test.description),

                ...commandLogs,

                ...test.failureMessages.map(failure => code(`❌ ${failure}`))
            ]
                .filter(line => line) // exclude potential empty lines
        });

        return ["## Test cases", ...testCaseReports.flat()];
    }

    /**
     * Builds a code block for the given command log, including the actual command and its outputs.
     */
    private commandLog(log: RunLog): string {
        // Combine stdout and stderr, but only if they exist
        const combinedOutputs = [log.stdout?.trim(), log.stderr?.trim()].filter(s => s);

        if (combinedOutputs.length === 0) {
            combinedOutputs.push('[ no output ]');
        }
        const command = prefixLines(log.command, '$ ');
        return code([command, ...combinedOutputs].join('\n\n'));
    }
}

/** Wraps the given string into a Markdown code block */
const code = (text: string) => `\`\`\`\n${text}\n\`\`\``;

/** Trims indentation from all lines in a string */
const trimIndentation = (str: string) => str.trim().split('\n').map(line => line.trim()).join('\n');

/** Sums an array of numbers. */
const sum = (arr: number[]) => arr.reduce((acc, cur) => acc + cur, 0);

/** Removes potential indentation and adds the given prefix to each line in the given text */
const prefixLines = (text: string, prefix: string) => trimIndentation(text).split('\n').map(line => `${prefix}${line}`).join('\n');

