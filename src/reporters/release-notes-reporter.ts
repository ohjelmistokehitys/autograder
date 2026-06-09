import fs from 'node:fs';
import { TaskMeta } from 'vitest';
import { TestCase, TestModule, TestSuite, Vitest } from 'vitest/node';
import type { Reporter } from 'vitest/reporters';
import { RunLog } from '../types';

/** Default output file, if none is specified in the reporter options. */
const DEFAULT_OUTPUT_FILE = 'release-notes.md';

/** The default score to be awarded for each test case, if a test metadata doesn't specify a score. */
const DEFAULT_SCORE = 1;

export type ReporterOptions = {
    /** The file path where the test results will be written. */
    outputFile?: string
}

/**
 * Generates a markdown file containing release notes for the test run. The release notes
 * include a summary of the test results and output from each test case, formatted in markdown.
 */
export default class ReleaseNotesReporter implements Reporter {
    private readonly outputFile;
    private ctx!: Vitest;

    constructor(options: ReporterOptions) {
        this.outputFile = options.outputFile ?? DEFAULT_OUTPUT_FILE;
    }

    onInit(vitest: Vitest) {
        this.ctx = vitest;
    }

    async onTestRunEnd(testModules: ReadonlyArray<TestModule>) {
        const output = MarkdownReport.build(testModules)

        this.ctx.logger.log(`Writing results to ${this.outputFile}`);
        fs.writeFileSync(this.outputFile, output, 'utf-8');
    }



}

const sum = (arr: number[]) => arr.reduce((acc, cur) => acc + cur, 0);


/**
 * A wrapper around Vitest's TestCase that provides access to properties and methods for generating test reports.
 */
class TestResult {

    constructor(readonly test: TestCase) { }

    /**
     * The maximum score for the test case. If a max score was added to the test metadata during
     * test execution, that score is used. Otherwise, the default score is used.
     */
    get maxScore(): number {
        return this.meta.maxScore ?? DEFAULT_SCORE;
    }

    get name() {
        return this.test.name;
    }

    get description() {
        return this.test.meta()?.description ?? '';
    }

    get icon() {
        return ({ passed: '✅', failed: '❌', skipped: '⚠️', pending: '⏳' })[this.status] || '⚠️';
    }

    /**
     * The score for the test case. If a score was added to the test metadata during test execution,
     * that score is used. Otherwise, if the test passed without throwing an error, the default score
     * is awarded. If no score was added to the metadata and the test failed, 0 points are awarded.
     */
    get score(): number {
        return this.meta.score ?? (this.passed ? DEFAULT_SCORE : 0);
    }

    get passed(): boolean {
        return this.status === 'passed';
    }

    get logs(): RunLog[] {
        return this.meta.logs ?? [];
    }

    get failureMessages(): string[] {
        return this.test.result().errors?.map(e => e.stack?.split('\n')[0] || e.message) || [];
    }

    /** An alphanumeric identifier for the test case, suitable for use in URLs or anchors. */
    get anchor() {
        return this.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    }

    get status() {
        return this.test.result().state;
    }

    private get meta(): TaskMeta {
        return this.test.meta() ?? {};
    }
}

// FIXME: Remove static keywords
class MarkdownReport {

    static build(testModules: ReadonlyArray<TestModule>): string {
        if (testModules.length === 0) {
            return '# No tests were run';
        }

        const suite = [...testModules[0].children.suites()][0];

        // combine tests from all suites into one arrray:
        const testResults = testModules.flatMap(
            (module) => [...module.children.allTests()]
        ).map(test => new TestResult(test));

        const head = this.buildHead(suite, testResults);
        const table = this.buildTable(testResults);
        const reports = this.buildReports(testResults);

        return [head, table, reports].join('\n\n');
    }


    static buildHead(suite: TestSuite, testResults: TestResult[]) {
        const name = suite.name;
        const { description } = suite.meta();

        const scores = {
            score: sum(testResults.map(result => result.score)),
            maxScore: sum(testResults.map(result => result.maxScore)),
            passed: testResults.filter(result => result.passed).length
        };

        let lines = [`# ${name}`,
        description ? trimIndentation(description) : undefined,
            '----',
        `Score: **${scores.score} / ${scores.maxScore}**`,
        `Passed: **${scores.passed} / ${testResults.length}**`,
            '----',
        ];

        // if there were any suite level errors that prevented tests from running, include them in the report
        if (suite.errors().length > 0) {
            lines.push(
                `## Errors that prevented tests from running`,
                ...suite.errors().map(err => code(err.message))
            );
        }

        return lines.join(`\n\n`);
    }

    static buildTable(testResults: TestResult[]) {
        const titles = [
            `| Ok? | Test name | Status | Points |`,
            `| --- | --- | --- | --- |`
        ];

        const rows = testResults
            .map(test => [
                test.icon,
                `[${test.name}](#${test.anchor})`, // link to the log section for this test case
                test.status,
                `${test.score} / ${test.maxScore}`
            ])
            .map(columns => "| " + columns.join(' | ') + " |")

        return `## Summary\n\n` + titles.concat(rows).join('\n');
    }

    static buildReports(testCases: TestResult[]): string {

        const testCaseReports = testCases.map(test => {
            const commandLogs = test.logs.map(MarkdownReport.buildCommandLog);
            const score = test.maxScore ? `(${test.score ?? 0} / ${test.maxScore} points)` : '';

            return [
                `<a name="${test.anchor}"><!-- anchor for linking from the table of contents --></a>`,

                `### ${test.name} ${score} [${test.icon} ${test.status}]`,

                trimIndentation(test.description),

                ...commandLogs,

                ...test.failureMessages.map(failure => code("❌ " + failure))
            ]
                .filter(line => line) // exclude empty lines
                .join('\n\n');
        });

        return ["## Test cases", ...testCaseReports].join('\n\n');
    }

    static buildCommandLog(log: RunLog): string {
        // Combine stdout and stderr, but only if they exist
        const combinedOutputs = [log.stdout?.trim(), log.stderr?.trim()].filter(s => s);

        if (combinedOutputs.length === 0) {
            combinedOutputs.push('[ no output ]');
        }

        return code([`$ ${log.command}`, ...combinedOutputs].join('\n\n'));
    }


}

/** Wraps the given string into a Markdown code block */
function code(text: string) {
    return `\`\`\`\n${text}\n\`\`\``;
}

/** Trims indentation from all lines in a string */
function trimIndentation(str: string) {
    return str.trim().split('\n').map(line => line.trim()).join('\n');
}
