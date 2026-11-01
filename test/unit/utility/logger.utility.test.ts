import type { LogLevel } from "@nestjs/common";

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { LoggerUtility } from "@utility/logger.utility";
import { afterEach, describe, expect, it, vi } from "vitest";

const getLevels = (): Array<LogLevel> => (LoggerUtility as unknown as { getLogLevelsFromEnv: () => Array<LogLevel> }).getLogLevelsFromEnv();

describe("LoggerUtility", () => {
	afterEach(() => {
		delete process.env.NCD_LOG_LEVEL;
	});

	it("reads NCD_LOG_LEVEL at the first message, after ConfigModule loaded it from .env", async () => {
		const directory: string = mkdtempSync(join(tmpdir(), "crud-automator-config-"));
		const envFilePath: string = join(directory, ".env");

		delete process.env.NCD_LOG_LEVEL;
		// Package loggers are created when their module is imported, before the application loads .env
		const logger: LoggerUtility = LoggerUtility.getLogger("Lazy");

		writeFileSync(envFilePath, "NCD_LOG_LEVEL=debug\n");

		try {
			const moduleReference = await Test.createTestingModule({ imports: [ConfigModule.forRoot({ envFilePath })] }).compile();

			expect(process.env.NCD_LOG_LEVEL).toBe("debug");
			expect(logger.isLevelEnabled("debug")).toBe(true);
			expect(logger.isLevelEnabled("verbose")).toBe(false);

			await moduleReference.close();
		} finally {
			rmSync(directory, { force: true, recursive: true });
		}
	});

	it("keeps the levels of the first message and lets setLogLevels override them", () => {
		process.env.NCD_LOG_LEVEL = "error";
		const logger: LoggerUtility = LoggerUtility.getLogger("Resolved");

		expect(logger.isLevelEnabled("warn")).toBe(false);
		process.env.NCD_LOG_LEVEL = "debug";
		expect(logger.isLevelEnabled("debug")).toBe(false);

		const explicitLogger: LoggerUtility = LoggerUtility.getLogger("Explicit");

		explicitLogger.setLogLevels(["warn"]);
		expect(explicitLogger.isLevelEnabled("warn")).toBe(true);
		expect(explicitLogger.isLevelEnabled("debug")).toBe(false);
	});

	it("returns log levels based on environment variable", () => {
		const original = process.env.NCD_LOG_LEVEL;

		try {
			process.env.NCD_LOG_LEVEL = "debug";
			expect(getLevels()).toEqual(["error", "warn", "log", "debug"]);

			process.env.NCD_LOG_LEVEL = "none";
			expect(getLevels()).toEqual([]);

			process.env.NCD_LOG_LEVEL = "warn";
			expect(getLevels()).toEqual(["error", "warn"]);

			process.env.NCD_LOG_LEVEL = "unknown";
			expect(getLevels()).toEqual(["error", "warn", "log"]);

			delete process.env.NCD_LOG_LEVEL;
			expect(getLevels()).toEqual(["error", "warn", "log"]);
		} finally {
			if (original === undefined) {
				delete process.env.NCD_LOG_LEVEL;
			} else {
				process.env.NCD_LOG_LEVEL = original;
			}
		}
	});

	it("creates loggers with namespaced context", () => {
		const logger = LoggerUtility.getLogger("Test");

		expect(logger).toBeInstanceOf(LoggerUtility);
		expect((logger as unknown as { context?: string }).context).toBe("NestJS-Crud-Automator/Test");
	});

	it("does not load a .env file from the working directory on import", async () => {
		const directory: string = mkdtempSync(join(tmpdir(), "crud-automator-env-"));
		const originalDirectory: string = process.cwd();

		writeFileSync(join(directory, ".env"), "NCD_DOTENV_PROBE=loaded\n");

		try {
			process.chdir(directory);
			vi.resetModules();
			await import("@utility/logger.utility");

			expect(process.env.NCD_DOTENV_PROBE).toBeUndefined();
		} finally {
			process.chdir(originalDirectory);
			rmSync(directory, { force: true, recursive: true });
			delete process.env.NCD_DOTENV_PROBE;
		}
	});
});
