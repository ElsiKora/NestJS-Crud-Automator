import { IsCalendarDate } from "@utility/is/calendar-date.utility";
import { describe, expect, it } from "vitest";

describe("IsCalendarDate", () => {
	it.each(["2024-02-02", "2024-02-29", "0001-01-01", "9999-12-31"])("accepts the calendar date %s", (value: string) => {
		expect(IsCalendarDate(value)).toBe(true);
	});

	it.each(["2024-02-30", "2023-02-29", "2024-13-01", "2024-00-10", "2024-01-00", "2024-2-2", "20240202", "2024-02-02T00:00:00Z", "2024-02-02T10:00:00", " 2024-02-02", "", "Feb 2 2024"])("rejects %j", (value: string) => {
		expect(IsCalendarDate(value)).toBe(false);
	});

	it("rejects values that are not strings", () => {
		expect(IsCalendarDate(new Date("2024-02-02"))).toBe(false);
		expect(IsCalendarDate(20_240_202)).toBe(false);
		expect(IsCalendarDate(undefined)).toBe(false);
	});
});
