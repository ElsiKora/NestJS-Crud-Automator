import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiEntity } from "@interface/entity";

import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType } from "@enum/decorator/api";
import { AuthorizationScopeNormalizeWhere } from "@utility/authorization/scope-normalize-where.utility";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { Column, Entity, Equal, PrimaryColumn } from "typeorm";
import { describe, expect, it } from "vitest";

const OWNER_ID: string = "550e8400-e29b-41d4-a716-446655440000";

@Entity("scope_normalize_items")
class ScopeNormalizeItemEntity {
	@PrimaryColumn({ type: "int" })
	@ApiPropertyDescribe({ description: "id", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: 2_147_483_647, minimum: 1, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER })
	public id!: number;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "code", exampleValue: "abc", format: EApiPropertyStringType.STRING, maxLength: 16, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	public code!: string;

	@Column({ type: "uuid" })
	@ApiPropertyDescribe({ description: "ownerId", type: EApiPropertyDescribeType.UUID })
	public ownerId!: string;

	@Column({ type: "date" })
	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE })
	public day!: string;

	@Column({ type: "varchar" })
	public note!: string;
}

const entityMetadata: IApiEntity<ScopeNormalizeItemEntity> = GenerateEntityInformation<ScopeNormalizeItemEntity>(ScopeNormalizeItemEntity as unknown as IApiBaseEntity);

describe("AuthorizationScopeNormalizeWhere", () => {
	it("converts scalar scope values with the path value parser of their column", async () => {
		const where = await AuthorizationScopeNormalizeWhere<ScopeNormalizeItemEntity>({ code: 42 as unknown as string, day: "2024-03-10", id: "16" as unknown as number, ownerId: OWNER_ID.toUpperCase() }, entityMetadata);

		expect(where).toEqual({ code: "42", day: "2024-03-10", id: 16, ownerId: OWNER_ID });
	});

	it("turns a value its column cannot hold into a match-nothing operator", async () => {
		const where = (await AuthorizationScopeNormalizeWhere<ScopeNormalizeItemEntity>({ id: "016" as unknown as number, ownerId: "not-a-uuid" }, entityMetadata)) as Record<string, { _type?: string; _value?: unknown }>;

		expect(where.id).toMatchObject({ _type: "in", _value: [] });
		expect(where.ownerId).toMatchObject({ _type: "in", _value: [] });
	});

	it("normalizes every OR branch and keeps operators and undescribed keys as they are", async () => {
		const operator = Equal("16");
		const where = await AuthorizationScopeNormalizeWhere<ScopeNormalizeItemEntity>([{ id: "1" as unknown as number, note: "016" }, { id: operator as never }], entityMetadata);

		expect(where).toEqual([{ id: 1, note: "016" }, { id: operator }]);
	});

	it("returns an empty scope unchanged", async () => {
		await expect(AuthorizationScopeNormalizeWhere<ScopeNormalizeItemEntity>(undefined, entityMetadata)).resolves.toBeUndefined();
	});
});
