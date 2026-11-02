import { IsCalendarDateTime } from "@utility/is/calendar-date-time.utility";
import { describe, expect, it } from "vitest";

describe("IsCalendarDateTime", () => {
	it.each(["2024-02-29", "2024-02-29T23:59:59.999Z", "2026-04-30T00:00:00Z", "2026-12-31 23:59", "0001-01-01T00:00:00", "9999-12-31T23:59:59.999999999+14:00", "2026-02-28T23:00:00-05:00", "2026-03-01t10:00:00z"])("accepts %j, which names an existing date and time", (value: string) => {
		expect(IsCalendarDateTime(value)).toBe(true);
	});

	it.each([
		["the 30th of February", "2026-02-30T00:00:00.000Z"],
		["the 31st of April", "2026-04-31"],
		["the 29th of February in a common year", "2025-02-29T00:00:00Z"],
		["the 29th of February in a century year that is not a leap year", "1900-02-29"],
		["day 00", "2026-01-00"],
		["month 00", "2026-00-10"],
		["month 13", "2026-13-01T00:00:00.000Z"],
		["hour 24", "2026-01-01T24:00:00.000Z"],
		["hour 24 with an offset", "2026-01-01T24:00:00+01:00"],
		["minute 60", "2026-01-01T10:60"],
		["second 60", "2026-01-01T23:59:60.000Z"],
		["an impossible day with an offset that would move it back", "2026-02-30T00:00:00+03:00"],
		["an impossible day with a space separator", "2025-02-29 08:00:00Z"],
	])("rejects %s", (_name: string, value: string) => {
		expect(IsCalendarDateTime(value)).toBe(false);
	});

	it.each(["", "2026-2-3", "20260203", "Feb 3 2026", "+002026-02-03", "2026-02-28T25", "2026-02-28T10", "2026-02-28Z", "2026-02-28T10:00:00 +01:00", "2026-02-28T10:00:00.Z", "2026-02-28T10:00:00+5", "2026-02-28T10:00:00Zjunk", " 2026-02-28", "2026-02-28 "])("rejects %j, which is not whole ISO 8601 date text", (value: string) => {
		expect(IsCalendarDateTime(value)).toBe(false);
	});
});
