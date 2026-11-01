import type { LogLevel } from "@nestjs/common";

import { ConsoleLogger, Injectable } from "@nestjs/common";

/**
 * Custom logger that extends NestJS's ConsoleLogger with environment-based log level filtering.
 * It reads `NCD_LOG_LEVEL` from `process.env` only and never loads a `.env` file.
 * The level is read when the logger handles its first message, not when it is created, so a value
 * that the application loads after importing the package, for example with `@nestjs/config`, still applies.
 */
@Injectable()
export class LoggerUtility extends ConsoleLogger {
	private static readonly ENV_LOG_LEVEL_KEY: string = "NCD_LOG_LEVEL";

	private hasResolvedLogLevels: boolean = false;

	constructor(context?: string) {
		super(context ?? "DefaultContext");
	}

	/**
	 * Static method to create a logger with a specific context
	 * @param {string} context - The context name for the logger
	 * @returns {LoggerUtility} A new logger instance with the specified context
	 */
	public static getLogger(context?: string): LoggerUtility {
		return new LoggerUtility(`NestJS-Crud-Automator/${context ?? "Core"}`);
	}

	/**
	 * Get the current log level from environment variable
	 * @returns {Array<LogLevel>} Array of enabled log levels based on environment configuration
	 * @private
	 */
	private static getLogLevelsFromEnv(): Array<LogLevel> {
		const logLevel: string | undefined = process.env[this.ENV_LOG_LEVEL_KEY];

		if (!logLevel) {
			// Default log levels if not specified in env
			return ["error", "warn", "log"];
		}

		switch (logLevel.toLowerCase()) {
			case "debug": {
				return ["error", "warn", "log", "debug"];
			}

			case "error": {
				return ["error"];
			}

			case "log": {
				return ["error", "warn", "log"];
			}

			case "none": {
				return [];
			}

			case "verbose": {
				return ["error", "warn", "log", "debug", "verbose"];
			}

			case "warn": {
				return ["error", "warn"];
			}

			default: {
				return ["error", "warn", "log"];
			}
		}
	}

	/**
	 * Checks a level, reading `NCD_LOG_LEVEL` first when this logger has not resolved its levels yet.
	 * @param {LogLevel} level - Level of the message about to be logged.
	 * @returns {boolean} Whether messages of this level are printed.
	 */
	public override isLevelEnabled(level: LogLevel): boolean {
		if (!this.hasResolvedLogLevels) {
			this.setLogLevels(LoggerUtility.getLogLevelsFromEnv());
		}

		return super.isLevelEnabled(level);
	}

	/**
	 * Sets the levels explicitly; later messages no longer read `NCD_LOG_LEVEL`.
	 * @param {Array<LogLevel>} levels - Levels to print.
	 * @returns {void}
	 */
	public override setLogLevels(levels: Array<LogLevel>): void {
		this.hasResolvedLogLevels = true;
		super.setLogLevels(levels);
	}
}
