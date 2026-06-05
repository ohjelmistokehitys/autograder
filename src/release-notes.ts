import { readFile, writeFile } from 'node:fs/promises';
import {
    type VitestReport
} from './types';

type Summary = {
    name: string;
    passed: boolean;
    status: string;
    points: number;
    maxPoints: number;
};

/**
 * Takes in a Vitest JSON report and transforms it into a Markdown formatted release notes file.
 */
function buildScoreReleaseNotes(vitest: VitestReport.VitestResults) {
    // combine tests from all suites into one arrray:
    const assertions = (vitest.testResults ?? []).flatMap(
        (suite) => suite.assertionResults ?? []
    );

    const summaries: Summary[] = assertions.map((assertion) => ({
        name: assertion.title,
        passed: assertion.status === 'passed',
        status: assertion.status,
        points: assertion.meta?.points ?? 0,
        maxPoints: assertion.meta?.maxPoints ?? 0
    }));

    const head = buildHead(summaries);
    const table = buildTable(summaries);
    const log = buildLog(assertions);

    return [head, table, log].map(dedent).join('\n\n');
}






main().catch((error: unknown) => {
    const message = Error.isError(error) ? error.message : String(error);
    console.error(`Failed to build release notes: ${message} `);
    process.exit(1);
});

/**
 * Removes leading indentation from a multiline string, based on the first line's indentation.
 */
function dedent(text: string) {
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) {
        return text.trim();
    }

    const firstIndentedLine = lines.find(line => line.match(/^\s+\S/));
    if (!firstIndentedLine) {
        return text.trim();
    }

    const indentMatch = firstIndentedLine.match(/^(\s+)/);
    const indent = indentMatch ? indentMatch[1] : '';

    const dedentedLines = lines.map(line => line.startsWith(indent) ? line.slice(indent.length) : line);
    return dedentedLines.join('\n').trim();

}


function buildHead(summaries: Summary[]) {

    const scores = summaries.reduce((acc, cur) => ({
        points: acc.points + cur.points,
        maxPoints: acc.maxPoints + cur.maxPoints,
        passed: acc.passed + (cur.passed ? 1 : 0)
    }), { points: 0, maxPoints: 0, passed: 0 });

    const head = `
        # Autograding report

        Score: **${scores.points} / ${scores.maxPoints}**

        Passed: **${scores.passed} / ${summaries.length}**
    `;

    return dedent(head);
}

function buildTable(summaries: Summary[]) {
    const tableHead = dedent(`
        ## Test cases

        | Ok? | Test name | Status | Points |
        | --- | --- | --- | --- |
    `);

    const tableBody = summaries
        .map(test => [test.passed ? '✅' : '❌', test.name, test.status, `${test.points} / ${test.maxPoints}`])
        .map(columns => "| " + columns.join(' | ') + " |")
        .join('\n')

    return tableHead + "\n" + tableBody;
}

function buildLog(testCases: VitestReport.VitestAssertion[]): string {
    const testCaseLogs = testCases.map(test => {
        const commandLogs = test.meta?.logs ? test.meta.logs.map(buildCommandLog) : [];
        const points = test.meta.points && test.meta.maxPoints ? `(${test.meta.points} / ${test.meta.maxPoints} points)` : '';
        const icon = test.status === 'passed' ? '✅' : '❌';

        return `
            ### ${icon} ${test.title} ${points}

            ${test.meta?.description ?? ''}

            ${commandLogs.length > 0 ? commandLogs.join('\n\n') : 'No logs available.'}

            ${test.failureMessages?.length > 0 ? `~~~\n` + test.failureMessages.map(message => "❌ " + message.split('\n')[0]).join('\n\n') + `\n~~~` : ''}
        `;
    });

    return ["## Logs", ...testCaseLogs].map(dedent).join("\n\n");
}

function buildCommandLog(log: VitestReport.RunLog): string {
    const outputs = [];

    if (log.stdout?.trim()) {
        outputs.push(log.stdout.trim());
    }

    if (log.stderr?.trim()) {
        outputs.push(log.stderr.trim());
    }

    return dedent(`
        ~~~
        $ ${log.command}

        ${outputs.length > 0 ? outputs.join('\n\n') : '[ no output ]'}
        ~~~
    `);
}

async function main(): Promise<void> {
    const inputPath = process.argv[2];
    const outputPath = process.argv[3];

    if (!inputPath || !outputPath) {
        console.error('Usage: filename <input-path> <output-path>');
        process.exit(1);
    }

    const raw = await readFile(inputPath, 'utf-8');
    const parsed = JSON.parse(raw) as VitestReport.VitestResults;
    const notes = buildScoreReleaseNotes(parsed);

    await writeFile(outputPath, notes, 'utf-8');
}
