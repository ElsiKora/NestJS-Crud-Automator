import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const PRIVATE_SWAGGER_IMPORT_PATTERN: RegExp = /@nestjs\/swagger\/dist/;
const SCANNED_PATHS: ReadonlyArray<string> = ["rollup.config.js", "scripts", "src", "test"];
const SCANNED_FILE_PATTERN: RegExp = /\.(?:[cm]?js|ts)$/;

/**
 * Lists source files below a path, keeping the path itself when it is a file.
 * @param {string} scannedPath Path relative to the repository root.
 * @returns {Array<string>} Source file paths.
 */
function listSourceFiles(scannedPath: string): Array<string> {
	if (!statSync(scannedPath).isDirectory()) {
		return [scannedPath];
	}

	return readdirSync(scannedPath, { recursive: true, encoding: "utf8" })
		.map((entryPath: string): string => path.join(scannedPath, entryPath))
		.filter((entryPath: string): boolean => SCANNED_FILE_PATTERN.test(entryPath) && statSync(entryPath).isFile());
}

describe("swagger public imports", () => {
	it("does not import private @nestjs/swagger paths anywhere in the repository", () => {
		const sourceFiles: Array<string> = SCANNED_PATHS.flatMap((scannedPath: string): Array<string> => listSourceFiles(scannedPath));
		const offendingFiles: Array<string> = sourceFiles.filter((filePath: string): boolean => PRIVATE_SWAGGER_IMPORT_PATTERN.test(readFileSync(filePath, "utf8")));

		expect(sourceFiles.length).toBeGreaterThan(0);
		expect(offendingFiles).toEqual([]);
	});
});
