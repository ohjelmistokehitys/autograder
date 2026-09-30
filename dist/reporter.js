export class AutogradingReport {
    results;
    suite;
    constructor(suite, results) {
        this.suite = suite;
        this.results = results;
    }
    get passed() {
        return this.results.every(run => run.status === "passed");
    }
    get score() {
        return this.results.reduce((sum, run) => sum + (run.status === "passed" ? (run.test.score ?? 0) : 0), 0);
    }
    get maxScore() {
        return this.suite.tests.reduce((sum, test) => sum + (test.score ?? 0), 0);
    }
    /**
     * Builds the full markdown report, including a summary of test results and detailed sections for each test case.
     */
    toMarkdown() {
        return [
            this.headerLines(),
            this.summaryLines(),
            this.testCaseLines()
        ].flat().join('\n\n');
    }
    /**
     * Builds the header section of the markdown report, including potential suite level errors.
     */
    headerLines() {
        const { name, description } = this.suite;
        const passed = this.results.filter(result => result.status === 'passed').length;
        const total = this.results.length;
        let lines = [
            `# ${name}`,
            description,
            '----',
            `Score: **${this.score} / ${this.maxScore}**`,
            `Passed: **${passed} / ${total}**`,
            '----',
        ];
        return lines;
    }
    /**
     * Builds the summary section of the markdown report, including a table of all test cases.
     */
    summaryLines() {
        const header = [
            `| Ok? | Test name | Status | Points |`,
            `| --- | --------- | ------ | ------ |`
        ];
        // Build a markdown table with each test case's details
        const rows = this.results
            .map(result => [
            statusIcon(result.status),
            `[${result.test.name}](#${anchor(result.test.name)})`, // link to the log section for this test case
            result.status,
            `${result.status === 'passed' ? (result.test.score ?? 0) : 0} / ${result.test.score ?? 0}`
        ])
            .map(columns => `| ${columns.join(' | ')} |`);
        const table = [...header, ...rows].join('\n');
        return [`## Summary`, table];
    }
    /**
     * Builds the detailed section for each test case.
     */
    testCaseLines() {
        const testCases = this.results.map((result, i, all) => {
            const test = result.test;
            const commandLogs = result.logs.map((log) => this.commandLog(log));
            return [
                `<a name="${anchor(test.name)}"></a>`, // anchor for linking from the summary table
                `### ${i + 1} / ${all.length}. ${test.name}`,
                test.description,
                ...commandLogs,
                result.errors?.length ? caution(`The following checks failed:\n` + prefixLines(result.errors.join('\n'), " - ")) : '',
                result.status === 'skipped' ? warning('This test was skipped. See logs and the full report for more information.') : '',
                `${statusIcon(result.status)} ${result.status}`,
                `Score: ${result.status === 'passed' ? (test.score ?? 0) : 0} / ${test.score ?? 0}`,
                `-`.repeat(40)
            ].filter(line => line); // exclude potential empty lines
        });
        return ["## Test cases", ...testCases.flat()];
    }
    /**
     * Builds a code block for the given command log, including the actual command and its outputs.
     */
    commandLog(log) {
        const func = log.ok ? blockQuote : caution;
        return func(code((log.input ? `[user input: ${log.input}]\n\n` : '') +
            `$ ${log.cmd}` +
            '\n\n' +
            log.output || '[ no output ]'));
    }
}
export function statusIcon(status) {
    const icons = {
        "passed": "✅",
        "failed": "❌",
        "skipped": "⚠️"
    };
    return icons[status] || "❓";
}
/** Adds a github markdown caution notice using a block quote. */
const caution = (text) => blockQuote(`[!CAUTION]\n${text}`);
/** Adds a github markdown warning notice using a block quote. */
const warning = (text) => blockQuote(`[!WARNING]\n${text}`);
/** Wraps the given string into a Markdown code block */
const code = (text) => `\`\`\`\n${text}\n\`\`\``;
/** Wraps the given string into a Markdown block quote */
const blockQuote = (text) => prefixLines(text, '> ');
/** Removes potential indentation and adds the given prefix to each line in the given text */
const prefixLines = (text, prefix) => text.split('\n').map(line => `${prefix}${line}`).join('\n');
/** An alphanumeric identifier for the given string, suitable for use in URLs. */
const anchor = (text) => text.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
