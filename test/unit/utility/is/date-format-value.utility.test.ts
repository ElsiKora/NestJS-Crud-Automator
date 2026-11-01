import { EApiPropertyDateType } from "@enum/decorator/api";
import { IsDateFormatValue } from "@utility/is/date-format-value.utility";
import { describe, expect, it } from "vitest";

describe("IsDateFormatValue", () => {
	it.each(["2024-02-02T00:00:00.000Z", "2024-02-29T23:59:59.999Z", "1970-01-01T00:00:00.000Z"])("accepts the UTC instant %s", (value: string) => {
		expect(IsDateFormatValue(value, EApiPropertyDateType.DATE_TIME)).toBe(true);
	});

	it.each(["2024-02-02T00:00:00Z", "2024-02-02T00:00:00.000+05:30", "2024-02-02T00:00:00.000", "2024-02-02", "2024-02-02T00:00:00X000Z", "2024-02-30T00:00:00.000Z", "2024-02-02T24:00:00.000Z", "2024-02-02T00:00:60.000Z", "1706832000000", ""])("rejects %j as a date-time", (value: string) => {
		expect(IsDateFormatValue(value, EApiPropertyDateType.DATE_TIME)).toBe(false);
	});

	it.each(["00:00:00", "12:30:00", "23:59:59"])("accepts the time of day %s", (value: string) => {
		expect(IsDateFormatValue(value, EApiPropertyDateType.TIME)).toBe(true);
	});

	it.each(["24:00:00", "12:60:00", "12:30:60", "12:30", "12:30:00.000", "12:30:00Z", "1970-01-01T12:30:00.000Z", ""])("rejects %j as a time", (value: string) => {
		expect(IsDateFormatValue(value, EApiPropertyDateType.TIME)).toBe(false);
	});

	it("checks calendar dates as calendar text", () => {
		expect(IsDateFormatValue("2024-02-29", EApiPropertyDateType.DATE)).toBe(true);
		expect(IsDateFormatValue("2023-02-29", EApiPropertyDateType.DATE)).toBe(false);
	});

	it("rejects values that are not strings", () => {
		expect(IsDateFormatValue(new Date("2024-02-02T00:00:00.000Z"), EApiPropertyDateType.DATE_TIME)).toBe(false);
		expect(IsDateFormatValue(undefined, EApiPropertyDateType.TIME)).toBe(false);
	});
});
