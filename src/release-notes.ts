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
function buildReleaseNotes(results: VitestReport.VitestResults) {
    // combine tests from all suites into one arrray:
    const assertions = (results.testResults ?? []).flatMap(
        (suite) => suite.assertionResults ?? []
    );

    const summaries: Summary[] = assertions.map((assertion) => ({
        name: assertion.title,
        passed: assertion.status === 'passed',
        status: assertion.status,
        points: assertion.meta?.points ?? 0,
        maxPoints: assertion.meta?.maxPoints ?? 0
    }));

    const head = buildHead(summaries, results);
    const table = buildTable(summaries);
    const log = buildLog(assertions);

    return [head, table, log].join('\n\n');
}


function buildHead(summaries: Summary[], results: VitestReport.VitestResults) {

    const scores = summaries.reduce((acc, cur) => ({
        points: acc.points + cur.points,
        maxPoints: acc.maxPoints + cur.maxPoints,
        passed: acc.passed + (cur.passed ? 1 : 0)
    }), { points: 0, maxPoints: 0, passed: 0 });

    let lines = [`# Autograding report`,
        `Score: **${scores.points} / ${scores.maxPoints}**`,
        `Passed: **${scores.passed} / ${summaries.length}**`,
    ];

    // If there is a message at the suite level, include it in the release notes.
    // This may include feedback that applies to the entire submission, such as
    // compilation errors or other issues that prevented the suite from running.
    if (results.testResults?.[0]?.message) {
        lines.push(
            `## Message`,
            code(results.testResults[0].message)
        )
    }

    return lines.join(`\n\n`);
}

function buildTable(summaries: Summary[]) {
    const lines = [
        `| Ok? | Test name | Status | Points |`,
        `| --- | --- | --- | --- |`
    ];

    lines.push(
        ...summaries
            .map(test => [icon(test), test.name, test.status, `${test.points} / ${test.maxPoints}`])
            .map(columns => "| " + columns.join(' | ') + " |")
    );

    return `## Test cases\n\n` + lines.join('\n');
}

function buildLog(testCases: VitestReport.VitestAssertion[]): string {

    const testCaseLogs = testCases.map(test => {
        const commandLogs = test.meta?.logs ? test.meta.logs.map(buildCommandLog) : [];
        const points = test.meta.maxPoints ? `(${test.meta.points ?? 0} / ${test.meta.maxPoints} points)` : '';

        return [
            `### ${test.title} ${points} [${icon(test)} ${test.status}]`,

            test.meta?.description,

            commandLogs.length > 0 ? commandLogs.join('\n\n') : 'No logs available.',

            test.failureMessages?.length > 0 ? code(test.failureMessages.map(message => "❌ " + message.split('\n')[0]).join('\n\n')) : ''
        ]
            .filter(line => line) // exclude empty lines
            .join('\n\n');
    });

    return ["## Logs", ...testCaseLogs].join('\n\n');
}

function buildCommandLog(log: VitestReport.RunLog): string {
    // Combine stdout and stderr. If neither is present, show [ no output ].
    const combinedOutputs = [log.stdout?.trim(), log.stderr?.trim()].filter(s => !!s).join('\n\n') || '[ no output ]';

    return code(`$ ${log.command}\n\n${combinedOutputs}`);
}

const code = (text: string) => `\`\`\`\n${text}\n\`\`\``;

const icon = (s: { status: string }) => ({ passed: '✅', failed: '❌', skipped: '⚠️' })[s.status] || '⚠️';

async function main(): Promise<void> {
    const inputPath = process.argv[2];
    const outputPath = process.argv[3];

    if (!inputPath || !outputPath) {
        console.error('Usage: filename <input-path> <output-path>');
        process.exit(1);
    }

    const raw = await readFile(inputPath, 'utf-8');
    const parsed = JSON.parse(raw) as VitestReport.VitestResults;
    const notes = buildReleaseNotes(parsed);

    await writeFile(outputPath, notes, 'utf-8');
}

main().catch((error: unknown) => {
    const message = Error.isError(error) ? error.message : String(error);
    console.error(`Failed to build release notes: ${message} `);
    process.exit(1);
});
