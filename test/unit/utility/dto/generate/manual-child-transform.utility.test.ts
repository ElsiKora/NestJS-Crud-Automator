import "reflect-metadata";

import type { Type } from "@nestjs/common";

import { ApiPropertyEnum } from "@decorator/api/property/enum.decorator";
import { ApiPropertyString } from "@decorator/api/property/string.decorator";
import { ApiPropertyUUID } from "@decorator/api/property/uuid.decorator";
import { EApiDtoType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { DtoGenerateContextualManualDto } from "@utility/dto/generate/manual-child.utility";
import { plainToInstance, Transform } from "class-transformer";
import { describe, expect, it } from "vitest";

const CHILD_UUID: string = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const ManualChildStatusEnum = { ACTIVE: "active", INACTIVE: "inactive" } as const;

class ManualChildTransformEntity {}

/**
 * Applies a user transform to each item of a list, or to a lone value.
 * @param {(item: string) => string} change - Change of one item.
 * @returns {PropertyDecorator} A toClassOnly `@Transform`.
 */
function eachItem(change: (item: string) => string): PropertyDecorator {
	return Transform(({ value }: { value: unknown }): unknown => (Array.isArray(value) ? value.map((item: unknown): unknown => (typeof item === "string" ? change(item) : item)) : typeof value === "string" ? change(value) : value), { toClassOnly: true });
}

class ManualChildTransformDto {
	@ApiPropertyUUID({ description: "ids", entity: ManualChildTransformEntity, isArray: true, isRequired: false, isUniqueItems: false, maxItems: 5, minItems: 1 } as never)
	@eachItem((item: string): string => item.toUpperCase())
	public ids?: Array<string>;

	@ApiPropertyString({ description: "labels", entity: ManualChildTransformEntity, exampleValue: ["abc"], format: EApiPropertyStringType.STRING, isArray: true, isRequired: false, isUniqueItems: false, maxItems: 5, maxLength: 16, minItems: 1, minLength: 0, pattern: "/^.*$/" } as never)
	@eachItem((item: string): string => `${item}!`)
	public labels?: Array<string>;

	@ApiPropertyEnum({ description: "statuses", entity: ManualChildTransformEntity, enum: ManualChildStatusEnum, enumName: "ManualChildStatus", isArray: true, isRequired: false, isUniqueItems: false, maxItems: 5, minItems: 1 } as never)
	@eachItem((item: string): string => item.toLowerCase())
	public statuses?: Array<string>;
}

describe("DtoGenerateContextualManualDto transforms", () => {
	const copy: Type<unknown> = DtoGenerateContextualManualDto(ManualChildTransformDto, EApiRouteType.CREATE, EApiDtoType.BODY, "ManualChildTransformParentCreateBodyDTO", "child");

	it.each([
		["a list", { ids: [CHILD_UUID], labels: ["abc"], statuses: ["ACTIVE"] }],
		["a lone value", { ids: CHILD_UUID, labels: "abc", statuses: "ACTIVE" }],
	])("reads %s in the generated copy of a manual child as the source reads it", (_case: string, plain: Record<string, unknown>) => {
		expect(copy).not.toBe(ManualChildTransformDto);
		expect({ ...(plainToInstance(copy, plain) as Record<string, unknown>) }).toEqual({ ...(plainToInstance(ManualChildTransformDto, plain) as unknown as Record<string, unknown>) });
	});
});
