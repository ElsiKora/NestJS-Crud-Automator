import { ErrorException } from "@utility/error/exception.utility";
import { describe, expect, it } from "vitest";

describe("ErrorException", () => {
	it("prefixes errors with library identifier", () => {
		const error = ErrorException("Test error");

		expect(error).toBeInstanceOf(Error);
		expect(error.message).toBe("[NestJS-Crud-Automator] Test error");
	});
});
