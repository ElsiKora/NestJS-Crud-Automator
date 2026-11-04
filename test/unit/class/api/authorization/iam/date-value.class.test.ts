import type { IApiAuthorizationIamDateValue } from "@interface/class/api/authorization";

import { ApiAuthorizationIamDateValue } from "@class/api/authorization/iam";
import { afterEach, describe, expect, it } from "vitest";

const parse = (value: unknown): IApiAuthorizationIamDateValue => {
	const date: IApiAuthorizationIamDateValue | undefined = ApiAuthorizationIamDateValue.parse(value);

	if (!date) {
		throw new Error(`${String(value)} did not parse`);
	}

	return date;
};

describe("ApiAuthorizationIamDateValue", () => {
	const originalTimeZone: string | undefined = process.env.TZ;

	afterEach(() => {
		process.env.TZ = originalTimeZone;
	});

	it.each([
		["2024-01-01T10:00:00Z", "2024-01-01T10:00:00.000Z"],
		["2024-01-01T10:00Z", "2024-01-01T10:00:00.000Z"],
		["2024-01-01T10:00:00.5Z", "2024-01-01T10:00:00.500Z"],
		["2024-01-01T10:00:00.123+02:00", "2024-01-01T08:00:00.123Z"],
		["2024-01-01T01:00:00-02:30", "2024-01-01T03:30:00.000Z"],
		["2024-02-29T23:59:59.999Z", "2024-02-29T23:59:59.999Z"],
		["0001-01-01T00:00:00Z", "0001-01-01T00:00:00.000Z"],
		["9999-12-31T23:59:59.999Z", "9999-12-31T23:59:59.999Z"],
		[new Date("2024-01-01T10:00:00.123Z"), "2024-01-01T10:00:00.123Z"],
	])("reads the instant %j", (value: unknown, text: string) => {
		const date: IApiAuthorizationIamDateValue = parse(value);

		expect(date.isCalendar).toBe(false);
		expect(date.text).toBe(text);
		expect(date.epoch).toBe(Date.parse(text));
	});

	it.each(["2024-01-01", "2024-02-29", "0001-01-01", "9999-12-31"])("reads the calendar date %s", (value: string) => {
		const date: IApiAuthorizationIamDateValue = parse(value);

		expect(date.isCalendar).toBe(true);
		expect(date.text).toBe(value);
	});

	it.each(["2024-01-01T10:00:00", "2024-01-01T10:00:00.123456Z", "2024-01-01 10:00:00Z", "2023-02-29", "2023-02-29T00:00:00Z", "2024-13-01", "2024-01-01T24:00:00Z", "2024-01-01T10:60:00Z", "2024-01-01T10:00:60Z", "2024-01-01T10:00:00+24:00", "0000-01-01", "0000-06-01T00:00:00Z", "0001-01-01T00:00:00+14:00", "9999-12-31T23:59:59-14:00", "10000-01-01", "", "today", 1704103200, "1704103200", true, null, undefined, {}, new Date(Number.NaN), Number.POSITIVE_INFINITY])(
		"refuses %j",
		(value: unknown) => {
			expect(ApiAuthorizationIamDateValue.parse(value)).toBeUndefined();
		},
	);

	it.each([
		["2024-01-01T10:00:00Z", "2024-01-01T12:00:00+02:00", 0],
		["2024-01-01T10:00:00Z", "2024-01-01T10:00:00.001Z", -1],
		["2024-01-02", "2024-01-01", 1],
	])("compares %s with %s", (left: string, right: string, order: number) => {
		expect(ApiAuthorizationIamDateValue.compare(parse(left), parse(right))).toBe(order);
	});

	it("does not compare a calendar date with an instant", () => {
		expect(ApiAuthorizationIamDateValue.compare(parse("2024-01-01"), parse("2024-01-01T00:00:00Z"))).toBeUndefined();
	});

	it("names the second occurrence of an hour a daylight saving change repeats in the process time zone", () => {
		process.env.TZ = "Europe/Berlin";

		// 03:00 local on 2024-10-27 goes back to 02:00, so 02:30 happens at 00:30Z and again at 01:30Z.
		expect(ApiAuthorizationIamDateValue.isRepeatedHour(new Date("2024-10-27T00:30:00.000Z"))).toBe(false);
		expect(ApiAuthorizationIamDateValue.isRepeatedHour(new Date("2024-10-27T01:30:00.000Z"))).toBe(true);
		expect(ApiAuthorizationIamDateValue.isRepeatedHour(new Date("2024-10-27T03:30:00.000Z"))).toBe(false);

		process.env.TZ = "UTC";

		expect(ApiAuthorizationIamDateValue.isRepeatedHour(new Date("2024-10-27T01:30:00.000Z"))).toBe(false);
	});
});
