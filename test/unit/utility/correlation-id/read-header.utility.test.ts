import { CorrelationIDReadHeader } from "@utility/correlation-id/read-header.utility";
import { describe, expect, it } from "vitest";

describe("CorrelationIDReadHeader", () => {
	it.each([
		["1 character", "a"],
		["128 characters", "a".repeat(128)],
		["letters and digits", "AZaz09"],
		["a dot", "a.b"],
		["an underscore", "a_b"],
		["a colon", "a:b"],
		["a dash", "a-b"],
		["a UUID", "3f2504e0-4f89-41d3-9a0c-0305e82c3301"],
	])("accepts %s", (_label: string, value: string) => {
		expect(CorrelationIDReadHeader(value)).toBe(value);
	});

	it.each<[string, Array<string> | string | undefined]>([
		["a missing header", undefined],
		["0 characters", ""],
		["129 characters", "a".repeat(129)],
		["a space", "a b"],
		["a slash", "a/b"],
		["a comma", "a,b"],
		["a percent sign", "a%b"],
		["a quote", 'a"b'],
		["a tab", "a\tb"],
		["surrounding whitespace", " a "],
		["a CR", "a\rb"],
		["an LF", "a\nb"],
		["a trailing LF, which the m flag would accept", "a\n"],
		["a leading LF, which the m flag would accept", "\na"],
		["a CRLF line of its own, which the m flag would accept", "bad value\r\nok"],
		["the Kelvin sign U+212A, which the i flag would accept", "K"],
		["the long s U+017F, which the i flag would accept", "ſ"],
		["a non-ASCII letter", "ï"],
		["a repeated header", ["a", "b"]],
		["an array with one valid value", ["a"]],
	])("rejects %s", (_label: string, value: Array<string> | string | undefined) => {
		expect(CorrelationIDReadHeader(value)).toBeUndefined();
	});
});
