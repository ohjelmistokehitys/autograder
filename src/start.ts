import { readFileSync, writeFileSync } from "node:fs";
import { TestRunner } from "./runner.ts";
import type { TestSuite } from "./types.ts";

async function main(filePath: string, markdownOutputPath: string, statusOutputPath: string) {
    const suite: TestSuite = JSON.parse(readFileSync(filePath, "utf-8"));
    const report = await new TestRunner(suite).run();

    writeFileSync(markdownOutputPath, report.toMarkdown(), "utf-8");

    const status = {
        state: report.passed ? "success" : "failure",
        context: "Autograder",
        description: `Score: ${report.score}/${report.maxScore}`
    };

    writeFileSync(statusOutputPath, JSON.stringify(status, null, 2), "utf-8");

    if (process.env.GITHUB_STEP_SUMMARY) {
        writeFileSync(process.env.GITHUB_STEP_SUMMARY, report.toMarkdown(), "utf-8");
    }

    if (process.env.GITHUB_OUTPUT) {
        writeFileSync(process.env.GITHUB_OUTPUT, `status_state=${status.state}\nstatus_description=Score: ${status.description}`, "utf-8");
    }

    if (!report.passed) {
        process.exit(1);
    }
}

const suiteFileArg = process.argv[2] ?? "tests.json";
const markdownOutputArg = process.argv[3] ?? "summary.md";
const statusOutputArg = process.argv[4] ?? "status.json";
await main(suiteFileArg, markdownOutputArg, statusOutputArg);
