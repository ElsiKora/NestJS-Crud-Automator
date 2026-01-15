import type { LogLevel } from "@nestjs/common";

import { ConsoleLogger, Injectable } from "@nestjs/common";
import { config } from "dotenv";

config();

/**
 * Custom logger that extends NestJS's ConsoleLogger with environment-based log level filtering
 */
@Injectable()
export class LoggerUtility extends ConsoleLogger {
	private static readonly ENV_LOG_LEVEL_KEY: string = "NCD_LOG_LEVEL";

	constructor(context?: string) {
		super(context ?? "DefaultContext", {
			logLevels: LoggerUtility.getLogLevelsFromEnv(),
		});
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
}
