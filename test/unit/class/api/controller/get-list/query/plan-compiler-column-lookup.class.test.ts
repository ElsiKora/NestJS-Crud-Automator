import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerGetListQueryPlan } from "@interface/class/api/controller/get-list/query";
import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { ApiControllerGetListQueryPlanCompiler } from "@class/api/controller/get-list/query";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiControllerGetListQueryPaginationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiRouteType } from "@enum/decorator/api";
import { EFilterOperation, EFilterOrderDirection } from "@enum/filter";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { AfterLoad, Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";
import { describe, expect, it } from "vitest";

const RANK: TApiPropertyDescribeProperties = { description: "rank", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: 100, minimum: 0, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER } as TApiPropertyDescribeProperties;

abstract class LookupBaseEntity {
	@Column({ nullable: true, type: "timestamptz" })
	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE } as TApiPropertyDescribeProperties)
	public deletedAt?: Date;

	@Column({ type: "int" })
	@ApiPropertyDescribe(RANK)
	public rank!: number;
}

@Entity("lookup_owners")
class LookupOwnerEntity extends LookupBaseEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID } as TApiPropertyDescribeProperties)
	public id!: string;

	@Column({ nullable: true, type: "int" })
	@ApiPropertyDescribe(RANK)
	public score?: number;
}

@Entity("lookup_items")
class LookupItemEntity extends LookupBaseEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID } as TApiPropertyDescribeProperties)
	public id!: string;

	@ManyToOne("LookupOwnerEntity")
	@ApiPropertyDescribe({ description: "named owner", type: EApiPropertyDescribeType.RELATION } as TApiPropertyDescribeProperties)
	public namedOwner!: LookupOwnerEntity;

	@ManyToOne(() => LookupOwnerEntity)
	@ApiPropertyDescribe({ description: "owner", type: EApiPropertyDescribeType.RELATION } as TApiPropertyDescribeProperties)
	public owner!: LookupOwnerEntity;
}

/**
 * Declares an unrelated entity class that shares the name of LookupItemEntity, as two modules may.
 * @returns {Function} The entity class
 */
function createSameNamedEntity(): new () => unknown {
	@Entity("lookup_other_items")
	class LookupItemEntity {
		@PrimaryColumn({ type: "uuid" })
		public id!: string;

		@Column({ nullable: true, type: "int" })
		public rank?: number;
	}

	return LookupItemEntity;
}

abstract class LookupLoadedBaseEntity {
	@AfterLoad()
	public normalize(): void {}
}

@Entity("lookup_loaded_items")
class LookupLoadedItemEntity extends LookupLoadedBaseEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID } as TApiPropertyDescribeProperties)
	public id!: string;

	@Column({ type: "int" })
	@ApiPropertyDescribe(RANK)
	public rank!: number;
}

class LookupController {}

createSameNamedEntity();

const compile = <E extends IApiBaseEntity>(entity: new () => E, query: Record<string, unknown>): IApiControllerGetListQueryPlan | undefined => ApiControllerGetListQueryPlanCompiler.compile(LookupController, entity, GenerateEntityInformation<E>(entity as unknown as IApiBaseEntity), { request: { [EApiControllerRequestTarget.QUERY]: query } } as unknown as TApiControllerPropertiesRoute<E, EApiRouteType.GET_LIST>);

const CURSOR_ORDER: Record<string, unknown> = {
	order: {
		defaultOrder: [{ direction: EFilterOrderDirection.ASC, field: "rank" }],
		fields: { rank: { isEnabled: true } },
		tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }],
		unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
	},
	pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR },
};

describe("ApiControllerGetListQueryPlanCompiler column lookups", () => {
	it.each([
		["PAGE", {}],
		["CURSOR", CURSOR_ORDER],
	])("reads a nullable column an abstract base declares as nullable in a %s filter plan", (_mode: string, query: Record<string, unknown>) => {
		const plan: IApiControllerGetListQueryPlan | undefined = compile(LookupItemEntity, { ...query, filter: { fields: { deletedAt: { allowedOperations: [EFilterOperation.ISNULL, EFilterOperation.NOTNULL], isEnabled: true } }, unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT } });

		expect(plan?.filter.fields.deletedAt).toMatchObject({ allowedOperations: [EFilterOperation.ISNULL, EFilterOperation.NOTNULL], isNullable: true });
	});

	it.each([
		["owner.deletedAt", "an abstract base of the related entity"],
		["namedOwner.score", "a related entity the relation names by string"],
	])("reads %s, a nullable column of %s, as nullable", (path: string) => {
		const plan: IApiControllerGetListQueryPlan | undefined = compile(LookupItemEntity, { filter: { fields: { [path]: { allowedOperations: [EFilterOperation.ISNULL, EFilterOperation.NOTNULL], isEnabled: true } }, unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT } });

		expect(plan?.filter.fields[path]).toMatchObject({ allowedOperations: [EFilterOperation.ISNULL, EFilterOperation.NOTNULL], isNullable: true });
	});

	it("reads a column by the entity class hierarchy, not by a class that shares the entity name", () => {
		const plan: IApiControllerGetListQueryPlan | undefined = compile(LookupItemEntity, CURSOR_ORDER);

		expect(plan?.filter.fields.rank).toMatchObject({ isNullable: false });
		expect(Object.keys(plan?.order.fields ?? {})).toEqual(["rank"]);
	});

	it("finds an afterLoad listener a parent class declares", () => {
		expect(() => compile(LookupLoadedItemEntity, CURSOR_ORDER)).toThrow("CURSOR GET_LIST entity cannot declare TypeORM after-load listeners");
	});
});
