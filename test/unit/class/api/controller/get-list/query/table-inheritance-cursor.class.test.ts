import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerProperties } from "@interface/decorator/api";
import type { IApiEntity } from "@interface/entity";
import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";

import { ApiControllerGetListQueryPlanCompiler } from "@class/api/controller/get-list/query";
import { ApiControllerTableInheritancePlanCompiler } from "@class/api/controller/table-inheritance-plan-compiler.class";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiControllerGetListQueryPaginationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiDtoType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { EFilterOrderDirection } from "@enum/filter";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { AfterLoad, ChildEntity, Column, Entity, PrimaryColumn, TableInheritance } from "typeorm";
import { describe, expect, it } from "vitest";

const RankDescribe = (properties?: Record<string, unknown>): PropertyDecorator =>
	ApiPropertyDescribe({
		description: "rank",
		exampleValue: 1,
		format: EApiPropertyNumberType.INTEGER,
		maximum: 100,
		minimum: 0,
		multipleOf: 1,
		...(properties ? { properties } : {}),
		type: EApiPropertyDescribeType.NUMBER,
	} as never);

const TypeDescribe = (): PropertyDecorator =>
	ApiPropertyDescribe({
		description: "type",
		exampleValue: "A",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	});

@Entity("cursor_safe_roots")
@TableInheritance({ column: { name: "type", type: "varchar" } })
class CursorSafeRootEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "int" })
	@RankDescribe()
	public rank!: number;

	@Column({ type: "varchar" })
	@TypeDescribe()
	public type!: string;
}

@ChildEntity("A")
class CursorSafeChildEntity extends CursorSafeRootEntity {
	@Column({ type: "int" })
	@RankDescribe()
	public childRank!: number;
}

@Entity("cursor_listener_roots")
@TableInheritance({ column: { name: "type", type: "varchar" } })
class CursorListenerRootEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "int" })
	@RankDescribe()
	public rank!: number;

	@Column({ type: "varchar" })
	@TypeDescribe()
	public type!: string;
}

@ChildEntity("A")
class CursorListenerChildEntity extends CursorListenerRootEntity {
	@AfterLoad()
	public normalize(): void {
		this.rank += 1;
	}
}

@Entity("cursor_accessor_roots")
@TableInheritance({ column: { name: "type", type: "varchar" } })
class CursorAccessorRootEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "int" })
	@RankDescribe()
	public rank!: number;

	@Column({ type: "varchar" })
	@TypeDescribe()
	public type!: string;
}

@ChildEntity("A")
class CursorAccessorChildEntity extends CursorAccessorRootEntity {}

Object.defineProperty(CursorAccessorChildEntity.prototype, "rank", { get: (): number => 1 });

@Entity("cursor_hidden_roots")
@TableInheritance({ column: { name: "type", type: "varchar" } })
class CursorHiddenRootEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "int" })
	@RankDescribe()
	public rank!: number;

	@Column({ type: "varchar" })
	@TypeDescribe()
	public type!: string;
}

@ChildEntity("A")
class CursorHiddenChildEntity extends CursorHiddenRootEntity {
	@RankDescribe({ [EApiRouteType.GET_LIST]: { [EApiDtoType.RESPONSE]: { isEnabled: false } } })
	declare public rank: number;
}

class CursorTableInheritanceController {}

function compileCursorPlan(entity: object, orderField: string): unknown {
	const entityMetadata: IApiEntity<IApiBaseEntity> = GenerateEntityInformation<IApiBaseEntity>(entity as unknown as IApiBaseEntity);
	const properties: IApiControllerProperties<IApiBaseEntity> = { entity, routes: { [EApiRouteType.GET_LIST]: {} } } as unknown as IApiControllerProperties<IApiBaseEntity>;
	const routeConfig: TApiControllerPropertiesRoute<IApiBaseEntity, EApiRouteType.GET_LIST> = {
		request: {
			[EApiControllerRequestTarget.QUERY]: {
				order: {
					defaultOrder: [{ direction: EFilterOrderDirection.ASC, field: orderField }],
					fields: {},
					tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }],
					unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
				},
				pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR },
			},
		},
	} as unknown as TApiControllerPropertiesRoute<IApiBaseEntity, EApiRouteType.GET_LIST>;

	return ApiControllerGetListQueryPlanCompiler.compile(CursorTableInheritanceController, entity as never, { ...entityMetadata, tableInheritance: ApiControllerTableInheritancePlanCompiler.compile(properties, entityMetadata) }, routeConfig);
}

describe("CURSOR GET_LIST over a table inheritance root", () => {
	it("accepts root column order when every variant proves it", () => {
		expect(CursorSafeChildEntity).toBeDefined();
		expect(compileCursorPlan(CursorSafeRootEntity, "rank")).toBeDefined();
	});

	it("rejects order by a child column", () => {
		expect(() => compileCursorPlan(CursorSafeRootEntity, "childRank")).toThrow("GET_LIST order defaultOrder[0] must target a described direct scalar entity field");
	});

	it("rejects a variant with after-load listeners", () => {
		expect(() => compileCursorPlan(CursorListenerRootEntity, "rank")).toThrow(`CURSOR GET_LIST entity variant ${CursorListenerChildEntity.name} cannot declare TypeORM after-load listeners`);
	});

	it("rejects a variant turning the order field into an accessor", () => {
		expect(() => compileCursorPlan(CursorAccessorRootEntity, "rank")).toThrow(`CURSOR GET_LIST order field "rank" must be a raw data property on entity variant ${CursorAccessorChildEntity.name}, not an accessor`);
	});

	it("rejects a variant hiding the order field from the generated response", () => {
		expect(CursorHiddenChildEntity).toBeDefined();
		expect(() => compileCursorPlan(CursorHiddenRootEntity, "rank")).toThrow('CURSOR GET_LIST order field "rank" must be unconditionally raw-exposed in the generated response');
	});
});
