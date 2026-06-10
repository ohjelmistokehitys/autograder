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
        expect(releaseNotes).toMatchSnapshot();
    });
});

describe('result.json', () => {
    it('matches snapshot', () => {
        const resultJson = JSON.parse(resultJsonRaw);
        resultJson["datetime"] = expect.any(String);

        expect(resultJson).toMatchSnapshot();
    });
});
