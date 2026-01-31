import { FormatUnknownForLog } from "@utility/format-unknown-for-log.utility";
import { describe, expect, it } from "vitest";

describe("FormatUnknownForLog", () => {
	it("formats primitives and nullish values", () => {
		expect(FormatUnknownForLog("text")).toBe("text");
		expect(FormatUnknownForLog(42)).toBe("42");
		expect(FormatUnknownForLog(true)).toBe("true");
		expect(FormatUnknownForLog(10n)).toBe("10");
		expect(FormatUnknownForLog(null)).toBe("null");
		expect(FormatUnknownForLog(undefined)).toBe("undefined");
	});

	it("formats objects and falls back on circular values", () => {
		expect(FormatUnknownForLog({ a: 1 })).toBe('{"a":1}');

		const circular: Record<string, unknown> = {};
		circular.self = circular;

		expect(FormatUnknownForLog(circular)).toBe("[object Object]");
	});
});
