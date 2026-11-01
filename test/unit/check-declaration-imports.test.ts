import type { SpawnSyncReturns } from "node:child_process";

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const SCRIPT_PATH: string = path.resolve("scripts/check-declaration-imports.cjs");
const SIDE_EFFECT_MESSAGE: string = "writes to the console or process streams, or loads a .env file";
const SOURCE_MAP_MESSAGE: string = "has source maps";

const temporaryDirectories: Array<string> = [];

/**
 * Runs the postbuild check against a temporary project whose dist holds the given files.
 * @param {Record<string, string>} distributionFiles File contents by path relative to dist.
 * @returns {SpawnSyncReturns<string>} The finished check process.
 */
function runCheck(distributionFiles: Record<string, string>): SpawnSyncReturns<string> {
	const projectDirectory: string = mkdtempSync(path.join(tmpdir(), "crud-automator-dist-check-"));
	temporaryDirectories.push(projectDirectory);
	writeFileSync(path.join(projectDirectory, "package.json"), JSON.stringify({ dependencies: {}, name: "dist-check-fixture" }));

	for (const [filePath, fileContent] of Object.entries(distributionFiles)) {
		const absolutePath: string = path.join(projectDirectory, "dist", filePath);
		mkdirSync(path.dirname(absolutePath), { recursive: true });
		writeFileSync(absolutePath, fileContent);
	}

	return spawnSync(process.execPath, [SCRIPT_PATH], { cwd: projectDirectory, encoding: "utf8" });
}

afterEach(() => {
	for (const directory of temporaryDirectories.splice(0)) {
		rmSync(directory, { force: true, recursive: true });
	}
});

describe("check-declaration-imports", () => {
	it.each([
		["plain output", "export const value = 1;\n"],
		["console and process streams in a line comment", '// console.log("x"); process.stdout.write("x"); loadEnvFile();\nexport const value = 1;\n'],
		["console, process streams and loadEnvFile in JSDoc", '/**\n * Example: console.log("x"); process.stderr.write("x"); process.loadEnvFile();\n */\nexport const value = 1;\n'],
		["a URL with // before console", 'export const url = "https://example.com"; // console.log(url)\n'],
		["object keys named console and loadEnvFile", "export const options = { console: 1, loadEnvFile: 2 };\n"],
		["methods named console and loadEnvFile", "export class Sink {\n\tconsole() {}\n\tloadEnvFile() {}\n}\nnew Sink().console();\nnew Sink().loadEnvFile();\n"],
		["locals named console and loadEnvFile", 'const console = { log() {} };\nconsole.log("x");\nfunction loadEnvFile() {}\nloadEnvFile();\nexport const value = 1;\n'],
		["a parameter named console", 'export function write(console) {\n\tconsole.log("x");\n}\n'],
		["a local named process", "const process = { stdout: 1 };\nexport const value = process.stdout;\n"],
	])("passes %s", (_name: string, fileContent: string) => {
		const result: SpawnSyncReturns<string> = runCheck({ "index.js": fileContent });

		expect(result.stderr).toBe("");
		expect(result.status).toBe(0);
	});

	it.each([
		["console.log", 'console.log("x");\n', "console"],
		["console with a bracket member", 'console["warn"]("x");\n', "console"],
		["console after a template literal", "const message = `a${String(1)}`;\nconsole.warn(message);\n", "console"],
		["console inside a method", "export class Logger {\n\twarn(message) {\n\t\tconsole.warn(message);\n\t}\n}\n", "console"],
		["process.stdout", 'process.stdout.write("x");\n', "process.stdout"],
		["process.stderr", 'process.stderr.write("x");\n', "process.stderr"],
		["process.stderr with a bracket member", 'process["stderr"].write("x");\n', "process.stderr"],
		["process.loadEnvFile", "process.loadEnvFile();\n", "loadEnvFile"],
		["loadEnvFile imported from node:process", 'import { loadEnvFile } from "node:process";\nloadEnvFile();\n', "loadEnvFile"],
		["a dotenv import", 'import "dotenv/config";\n', '"dotenv/config"'],
		["a .env path", 'import { readFileSync } from "node:fs";\nexport const environment = readFileSync(".env", "utf8");\n', '".env"'],
	])("fails on %s", (_name: string, fileContent: string, problem: string) => {
		const result: SpawnSyncReturns<string> = runCheck({ "index.js": fileContent });

		expect(result.status).toBe(1);
		expect(result.stderr).toContain(SIDE_EFFECT_MESSAGE);
		expect(result.stderr).toContain(`dist/index.js: ${problem} at line`);
	});

	it("fails on a .map file", () => {
		const result: SpawnSyncReturns<string> = runCheck({ "index.js": "export const value = 1;\n", "index.js.map": "{}" });

		expect(result.status).toBe(1);
		expect(result.stderr).toContain(SOURCE_MAP_MESSAGE);
		expect(result.stderr).toContain("dist/index.js.map");
	});

	it("fails on a sourceMappingURL comment", () => {
		const result: SpawnSyncReturns<string> = runCheck({ "index.js": "export const value = 1;\n//# sourceMappingURL=index.js.map\n" });

		expect(result.status).toBe(1);
		expect(result.stderr).toContain(SOURCE_MAP_MESSAGE);
		expect(result.stderr).toContain("dist/index.js (sourceMappingURL)");
	});
});
