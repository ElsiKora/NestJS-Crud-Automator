import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const GUIDE: string = readFileSync("docs/guides/testing/page.mdx", "utf8");

/**
 * Reads the guide sample of a spec file, as the reader copies it.
 * @param {string} filename - File name the guide gives the sample
 * @returns {string} The sample code
 */
const readSample = (filename: string): string => {
	const start: number = GUIDE.indexOf(`\`\`\`typescript filename="${filename}" copy\n`);
	const codeStart: number = GUIDE.indexOf("\n", start) + 1;

	expect(start).toBeGreaterThanOrEqual(0);

	return GUIDE.slice(codeStart, GUIDE.indexOf("```", codeStart));
};

// The specs next to this file run the guide's samples; only the package import differs, because the specs run from source.
describe("Testing guide samples (E2E)", () => {
	it.each([
		["user.controller.spec.ts", "test/e2e/testing-guide/in-memory-repository.e2e.test.ts"],
		["user.cursor-controller.spec.ts", "test/e2e/testing-guide/cursor-controller.e2e.test.ts"],
	])("%s is the code of %s", (filename: string, specFile: string) => {
		expect(readSample(filename)).toBe(readFileSync(specFile, "utf8").replace('from "../../../src/index"', 'from "@elsikora/nestjs-crud-automator"'));
	});
});
