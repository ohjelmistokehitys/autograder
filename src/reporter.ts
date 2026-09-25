import { TestReport } from './models.ts';
import type { AutogradingReport, RunLog } from './types.ts';

/**
 * Class for generating a markdown report from a test run.
 */
export class MarkdownReport {
    readonly report: AutogradingReport;

    constructor(report: AutogradingReport) {
        this.report = report;
    }

    /**
     * Builds the full markdown report, including a summary of test results and detailed sections for each test case.
     */
    toString(): string {
        return [
            this.headLines(),
            this.summaryLines(),
            this.testCaseLines()
        ].flat().join('\n\n');
    }

    private get suite() {
        return this.report.suite;
    }

    private get testReports() {
        return this.report.results.map(r => new TestReport(r));
    }

    get scores() {
        return {
            score: sum(this.testReports.map(result => result.score)),
            maxScore: sum(this.testReports.map(result => result.maxScore)),
        };
    }

    /**
     * Builds the header section of the markdown report, including potential suite level errors.
     */
    private headLines(): string[] {
        const { name, description } = this.suite;

        const { score, maxScore } = this.scores;
        const passed = this.testReports.filter(result => result.passed).length;
        const total = this.testReports.length;

        let lines = [
            `# ${name}`,
            description,
            '----',
            `Score: **${score} / ${maxScore}**`,
            `Passed: **${passed} / ${total}**`,
            '----',
        ];

        if (this.report.error) {
            lines.push(
                `## An error occurred while running the test suite`,
                caution(this.report.error)
            );
        }

        return lines;
    }

    /**
     * Builds the summary section of the markdown report, including a table of all test cases.
     */
    private summaryLines(): string[] {
        const header = [
            `| Ok? | Test name | Status | Points |`,
            `| --- | --------- | ------ | ------ |`
        ];

        const rows = this.testReports
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
    private testCaseLines(): string[] {
        const testCaseReports = this.testReports.map(test => {
            const commandLogs = test.logs.map((log) => this.commandLog(log));
            const score = test.maxScore ? `(${test.score ?? 0} / ${test.maxScore} points)` : '';

            return [
                `<a name="${test.anchor}"></a>`, // anchor for linking from the summary table

                `### ${test.name} ${score} [${test.icon} ${test.status}]`,

                test.description,

                ...commandLogs,

                test.error ? caution(code(test.error)) : '',

                test.skipped ? warning('This test was skipped. See logs and the full report for more information.') : ''
            ].filter(line => line) // exclude potential empty lines
        });


        return ["## Test cases", ...testCaseReports.flat()];
    }

    /**
     * Builds a code block for the given command log, including the actual command and its outputs.
     */
    private commandLog(log: RunLog): string {

        const command = prefixLines(log.command, '$ ');

        // Combine stdout and stderr, but only if they exist
        const outputs = [log.stdout?.trim(), log.stderr?.trim()].filter((s): s is string => !!s);

        if (outputs.length === 0) {
            outputs.push('[ no output ]');
        }

        // creates code blocks for the command and all outputs and wraps them in a block quote
        return blockQuote(
            (log.input ? `Input: ${log.input}\n\n` : '') +
            [command, ...outputs].map(s => code(s)).join('\n\n')
        );
    }
}

/** Adds a github markdown caution notice using a block quote. */
const caution = (text: string) => blockQuote(`[!CAUTION]\n${text}`);

/** Adds a github markdown warning notice using a block quote. */
const warning = (text: string) => blockQuote(`[!WARNING]\n${text}`);

/** Wraps the given string into a Markdown code block */
const code = (text: string) => `\`\`\`\n${text}\n\`\`\``;

/** Wraps the given string into a Markdown block quote */
const blockQuote = (text: string) => prefixLines(text, '> ');

/** Sums an array of numbers. */
const sum = (arr: number[]) => arr.reduce((acc, cur) => acc + cur, 0);

/** Removes potential indentation and adds the given prefix to each line in the given text */
const prefixLines = (text: string, prefix: string) => text.split('\n').map(line => `${prefix}${line}`).join('\n');
