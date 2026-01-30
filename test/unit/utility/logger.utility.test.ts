import type { LogLevel } from "@nestjs/common";

import { LoggerUtility } from "@utility/logger.utility";
import { describe, expect, it } from "vitest";

const getLevels = (): Array<LogLevel> => (LoggerUtility as unknown as { getLogLevelsFromEnv: () => Array<LogLevel> }).getLogLevelsFromEnv();

describe("LoggerUtility", () => {
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
});
