import { readFileSync, writeFileSync } from "node:fs";
import { MarkdownReport } from "./reporter.ts";
import { runSuite } from "./runner.ts";
import type { TestSuite } from "./types.ts";


function main(filePath: string, options: Record<string, string>) {
    const suite: TestSuite = JSON.parse(readFileSync(filePath, "utf-8"));
    const report = runSuite(suite);

    const markdownReport = new MarkdownReport(report);

    if (options["markdown-output"]) {
        const outputFile = options["markdown-output"];
        writeFileSync(outputFile, markdownReport.toString(), "utf-8");
    }

    if (options["status-output"]) {
        const statusFile = options["status-output"];
        const scores = markdownReport.scores;
        writeFileSync(statusFile, `Score: ${scores.score} / ${scores.maxScore}`, "utf-8");
    }
}

(() => {
    const { suiteFileArg, kwArgs } = parseArgs();
    main(suiteFileArg, kwArgs);
})();


function parseArgs() {
    const args = process.argv.slice(2);
    const [suiteFilePath, ...restArgs] = process.argv.slice(2);
    const kwArgs: Record<string, string> = {};

    if (args.includes("--help") || args.includes("-h")) {
        console.log(`Usage: node ${process.argv[1]} <suite-file> [--key value ...]`);
        process.exit(0);
    }

    if (!suiteFilePath) {
        console.error("Error: No test suite file specified.");
        process.exit(1);
    }

    if (restArgs.length % 2 !== 0) {
        console.error("Error: Additional arguments must be in key-value pairs.");
        process.exit(1);
    }

    for (let i = 0; i < restArgs.length; i += 2) {
        const [key, value] = restArgs.slice(i, i + 2);

        if (!key.startsWith("--")) {
            console.error(`Error: Invalid key format '${key}'. Keys must start with '--'.`);
            process.exit(1);
        }
        kwArgs[key.substring(2)] = value;
    }

    return { suiteFileArg: suiteFilePath, kwArgs };
}
