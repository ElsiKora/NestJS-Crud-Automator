import "reflect-metadata";

import { ApiPropertyBoolean } from "@decorator/api/property/boolean.decorator";
import { ApiPropertyDate } from "@decorator/api/property/date.decorator";
import { ApiPropertyEnum } from "@decorator/api/property/enum.decorator";
import { ApiPropertyNumber } from "@decorator/api/property/number.decorator";
import { ApiPropertyString } from "@decorator/api/property/string.decorator";
import { ApiPropertyUUID } from "@decorator/api/property/uuid.decorator";
import { EApiDtoType, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyNumberType, EApiPropertyStringType } from "@enum/decorator/api";
import { DtoRequestWireBindDto } from "@utility/dto/request-wire/bind";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { describe, expect, it } from "vitest";

const LIST_UUID: string = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const ListStatusEnum = { ACTIVE: "active", INACTIVE: "inactive" } as const;

class RequestListEntity {}

class RequestListDto {
	@ApiPropertyNumber({ description: "amount", entity: RequestListEntity, exampleValue: 1.5, format: EApiPropertyNumberType.DOUBLE, isRequired: false, maximum: 1_000_000, minimum: -1_000_000 } as never)
	public amount?: number;

	@ApiPropertyNumber({ description: "amounts", entity: RequestListEntity, exampleValue: [1.5], format: EApiPropertyNumberType.DOUBLE, isArray: true, isRequired: false, isUniqueItems: false, maxItems: 5, maximum: 1_000_000, minimum: -1_000_000, minItems: 1 } as never)
	public amounts?: Array<number>;

	@ApiPropertyNumber({ description: "counts", entity: RequestListEntity, exampleValue: [1], format: EApiPropertyNumberType.INTEGER, isArray: true, isRequired: false, isUniqueItems: false, maxItems: 5, maximum: 100, minimum: 0, minItems: 1, multipleOf: 1 })
	public counts?: Array<number>;

	@ApiPropertyDate({ description: "day", entity: RequestListEntity, format: EApiPropertyDateType.DATE, identifier: EApiPropertyDateIdentifier.DATE, isRequired: false })
	public day?: string;

	@ApiPropertyDate({ description: "days", entity: RequestListEntity, format: EApiPropertyDateType.DATE, identifier: EApiPropertyDateIdentifier.DATE, isArray: true, isRequired: false, isUniqueItems: false, maxItems: 5, minItems: 1 })
	public days?: Array<string>;

	@ApiPropertyBoolean({ description: "flags", entity: RequestListEntity, isArray: true, isRequired: false, isUniqueItems: false, maxItems: 5, minItems: 1 } as never)
	public flags?: Array<boolean>;

	@ApiPropertyString({ description: "labels", entity: RequestListEntity, exampleValue: ["abc"], format: EApiPropertyStringType.STRING, isArray: true, isRequired: false, isUniqueItems: false, maxItems: 5, maxLength: 16, minItems: 1, minLength: 0, pattern: "/^[a-z]*$/" } as never)
	public labels?: Array<string>;

	@ApiPropertyDate({ description: "moment", entity: RequestListEntity, format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.CREATED_AT, isRequired: false })
	public moment?: Date;

	@ApiPropertyDate({ description: "moments", entity: RequestListEntity, format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.CREATED_AT, isArray: true, isRequired: false, isUniqueItems: false, maxItems: 5, minItems: 1 })
	public moments?: Array<Date>;

	@ApiPropertyUUID({ description: "ids", entity: RequestListEntity, isArray: true, isRequired: false, isUniqueItems: false, maxItems: 5, minItems: 1 } as never)
	public ids?: Array<string>;

	@ApiPropertyString({ description: "names", entity: RequestListEntity, exampleValue: ["abc"], format: EApiPropertyStringType.STRING, isArray: true, isRequired: false, isUniqueItems: false, maxItems: 5, maxLength: 16, minItems: 1, minLength: 1, pattern: "/^[a-z]+$/" } as never)
	public names?: Array<string>;

	@ApiPropertyEnum({ description: "statuses", entity: RequestListEntity, enum: ListStatusEnum, enumName: "ListStatus", isArray: true, isRequired: false, isUniqueItems: false, maxItems: 5, minItems: 1 } as never)
	public statuses?: Array<string>;
}

// These are the rules of a query, whose values are text; a JSON body of the same DTO converts no text.
class RequestListQueryDto extends RequestListDto {}

DtoRequestWireBindDto(RequestListQueryDto, EApiDtoType.QUERY, "a query");

/**
 * Reads one query value as a host pipe does, with or without implicit conversion.
 * @param {Record<string, unknown>} plain - Request object as sent.
 * @param {boolean} isImplicit - Whether the pipe enables implicit conversion.
 * @returns {{ errors: Array<string>; instance: Record<string, unknown> }} Converted instance and the names of the failing properties.
 */
function read(plain: Record<string, unknown>, isImplicit: boolean): { errors: Array<string>; instance: Record<string, unknown> } {
	const instance: Record<string, unknown> = plainToInstance(RequestListQueryDto, plain, { enableImplicitConversion: isImplicit }) as unknown as Record<string, unknown>;

	return { errors: validateSync(instance).map((error: { property: string }): string => error.property), instance };
}

describe.each([false, true])("request list and number rules, implicit conversion: %s", (isImplicit: boolean) => {
	it.each([
		["amounts", "1.5", [1.5]],
		["counts", "7", [7]],
		["days", "2024-03-10", ["2024-03-10"]],
		["flags", "false", [false]],
		["ids", LIST_UUID, [LIST_UUID]],
		// The route refuses an upper-case UUID before any pipe; the DTO keeps the letter case it was sent in.
		["ids", LIST_UUID.toUpperCase(), [LIST_UUID.toUpperCase()]],
		["names", "abc", ["abc"]],
		["statuses", "active", ["active"]],
	])("reads a lone %s value %j as a one-item list", (key: string, sent: string, received: Array<unknown>) => {
		const { errors, instance } = read({ [key]: sent }, isImplicit);

		expect(errors).toEqual([]);
		expect(instance[key]).toEqual(received);
	});

	it.each([
		["amounts", "1.5,2"],
		["counts", "1,2"],
		["days", "2024-03-10,2024-03-11"],
		["flags", "true,false"],
		["ids", `${LIST_UUID},${LIST_UUID}`],
		["names", "ab,cd"],
		["statuses", "active,inactive"],
	])("rejects the comma list %s=%j, since a comma is not a separator", (key: string, sent: string) => {
		expect(read({ [key]: sent }, isImplicit).errors).toEqual([key]);
	});

	it.each(["amounts", "counts", "days", "flags", "ids", "moments", "names", "statuses"])("rejects an empty %s value, one empty item its item rule refuses", (key: string) => {
		expect(read({ [key]: "" }, isImplicit).errors).toEqual([key]);
		expect(read({ [key]: [""] }, isImplicit).errors).toEqual([key]);
	});

	it.each(["day", "moment"])("rejects an empty value of the single date %s", (key: string) => {
		expect(read({ [key]: "" }, isImplicit).errors).toEqual([key]);
	});

	it("keeps an empty string item when the item rules allow it", () => {
		const { errors, instance } = read({ labels: "" }, isImplicit);

		expect(errors).toEqual([]);
		expect(instance.labels).toEqual([""]);
	});

	it.each([
		["1.5", 1.5],
		["-0.25", -0.25],
		["16.0", 16],
		["1e2", 100],
		["1E-3", 0.001],
		["0", 0],
		[2.5, 2.5],
	])("accepts the DOUBLE value %j", (sent: number | string, received: number) => {
		const { errors, instance } = read({ amount: sent }, isImplicit);

		expect(errors).toEqual([]);
		expect(instance.amount).toBe(received);
	});

	it.each(["", " 16 ", "0x10", "0b1", "+1", ".5", "1.", "01.5", "Infinity", "NaN", "1e", "1,5", true, [1.5]])("rejects the DOUBLE value %j", (sent: unknown) => {
		expect(read({ amount: sent }, isImplicit).errors).toEqual(["amount"]);
	});
});

describe.each([false, true])("request list and number rules of a JSON body, implicit conversion: %s", (isImplicit: boolean) => {
	it.each([
		["amount", "1.5"],
		["amounts", ["1.5"]],
		["counts", ["7"]],
		["counts", "7"],
		["flags", ["false"]],
		["flags", "true"],
	])("keeps the text of %s %j for the validator to refuse", (key: string, sent: unknown) => {
		const instance: Record<string, unknown> = plainToInstance(RequestListDto, { [key]: sent }, { enableImplicitConversion: isImplicit }) as unknown as Record<string, unknown>;

		expect(validateSync(instance).map((error: { property: string }): string => error.property)).toEqual([key]);
	});

	it.each([
		["amount", 1.5, 1.5],
		["amounts", [1.5, 2], [1.5, 2]],
		["counts", 7, [7]],
		["flags", [true, false], [true, false]],
	])("accepts the JSON value of %s %j", (key: string, sent: unknown, received: unknown) => {
		const instance: Record<string, unknown> = plainToInstance(RequestListDto, { [key]: sent }, { enableImplicitConversion: isImplicit }) as unknown as Record<string, unknown>;

		expect(validateSync(instance)).toEqual([]);
		expect(instance[key]).toEqual(received);
	});
});
