import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerGetListQueryAstNode, IApiControllerGetListQueryPlan, IApiControllerGetListQueryPlanFilterField } from "@interface/class/api/controller/get-list/query";
import type { IApiEntity } from "@interface/entity";
import type { TApiControllerGetListQueryCompiledOrderField } from "@type/class/api/controller/get-list/compiled/order-field.type";
import type { TApiControllerGetListQueryCompiledPlan } from "@type/class/api/controller/get-list/compiled/plan.type";
import type { TApiControllerGetListCursorExecutionOptions } from "@type/class/api/controller/get-list/cursor/execution-options.type";
import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";
import type { FindManyOptions, FindOperator } from "typeorm";

import { ApiControllerGetListCursorRuntime as ApiControllerGetListCursorRuntimeBase } from "@class/api/controller/get-list/cursor/runtime.class";
import { ApiControllerGetListQueryPlanCompiler, ApiControllerGetListQueryRuntime } from "@class/api/controller/get-list/query";
import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { SWAGGER_METADATA_CONSTANT } from "@constant/swagger";
import { DTO_GENERATE_CONSTANT } from "@constant/utility/dto/generate.constant";
import { EApiControllerGetListQueryFilterMissingBehavior, EApiControllerGetListQueryPaginationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiDtoType, EApiPropertyDescribeType, EApiRouteType } from "@enum/decorator/api";
import { EFilterOperation, EFilterOrderDirection } from "@enum/filter";
import { DtoGenerate } from "@utility/dto/generate/core.utility";
import { DtoGetGetListQueryBaseClass } from "@utility/dto/get/get-list-query-base-class.utility";
import { GetManualDtoPropertyMetadata } from "@utility/dto/manual/property-metadata/get.utility";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { getMetadataStorage, validate } from "class-validator";
import { DataSource, Equal } from "typeorm";
import { describe, expect, it, vi } from "vitest";

import { CompositeCursorQueryEntity, CursorAccessorQueryEntity, CursorCustomAccessorItemDto, CursorCustomIncompleteItemDto, CursorCustomInvalidResponseDto, CursorCustomItemDto, CursorCustomResponseDto, CursorInheritedQueryEntity, CursorQueryController, CursorQueryEntity, CursorStorageQueryEntity, CursorUnsafeFieldNameQueryEntity, TypedQueryController, TypedQueryEntity, TypedQueryNarrowController } from "./fixture";

const entityMetadata: IApiEntity<TypedQueryEntity> = GenerateEntityInformation<TypedQueryEntity>(TypedQueryEntity as unknown as IApiBaseEntity);
const CURSOR_ID_A: string = "00000000-0000-0000-0000-000000000001";
const CURSOR_ID_B: string = "00000000-0000-0000-0000-000000000002";
const CURSOR_ID_C: string = "00000000-0000-0000-0000-000000000003";
const CURSOR_ID_D: string = "00000000-0000-0000-0000-000000000004";
const CURSOR_ID_E: string = "00000000-0000-0000-0000-000000000005";
const PRIMARY_FILTER_ID: string = "123e4567-e89b-12d3-a456-426614174000";
const ApiControllerGetListCursorRuntime = {
	createContextHash: ApiControllerGetListCursorRuntimeBase.createContextHash.bind(ApiControllerGetListCursorRuntimeBase),
	execute: <E extends IApiBaseEntity>(options: Omit<TApiControllerGetListCursorExecutionOptions<E>, "validateStorageValue">) =>
		ApiControllerGetListCursorRuntimeBase.execute({
			...options,
			validateStorageValue: (): void => undefined,
		}),
};

function compilePlan(fields: Record<string, unknown>, options?: { orderFields?: Record<string, unknown>; unlistedFields?: EApiControllerGetListQueryUnlistedFields }): IApiControllerGetListQueryPlan {
	const routeConfig = {
		request: {
			[EApiControllerRequestTarget.QUERY]: {
				filter: {
					fields,
					unlistedFields: options?.unlistedFields ?? EApiControllerGetListQueryUnlistedFields.INHERIT,
				},
				order: options?.orderFields
					? {
							fields: options.orderFields,
							unlistedFields: EApiControllerGetListQueryUnlistedFields.INHERIT,
						}
					: undefined,
			},
		},
	} as unknown as TApiControllerPropertiesRoute<TypedQueryEntity, EApiRouteType.GET_LIST>;
	const plan: IApiControllerGetListQueryPlan | undefined = ApiControllerGetListQueryPlanCompiler.compile(TypedQueryController, TypedQueryEntity, entityMetadata, routeConfig);

	if (!plan) {
		throw new Error("Expected a typed query plan");
	}

	return plan;
}

function compileCursorPlan(options?: { defaultField?: string; fields?: Record<string, unknown>; responseDto?: unknown; tieBreakers?: Array<{ direction: EFilterOrderDirection; field: string }> }): TApiControllerGetListQueryCompiledPlan<EApiControllerGetListQueryPaginationMode.CURSOR> {
	const cursorMetadata: IApiEntity<CursorQueryEntity> = GenerateEntityInformation<CursorQueryEntity>(CursorQueryEntity as unknown as IApiBaseEntity);
	const routeConfig = {
		dto: options?.responseDto === undefined ? undefined : { [EApiDtoType.RESPONSE]: options.responseDto },
		request: {
			[EApiControllerRequestTarget.QUERY]: {
				filter: {
					fields: {},
					unlistedFields: EApiControllerGetListQueryUnlistedFields.INHERIT,
				},
				order: {
					defaultOrder: [{ direction: EFilterOrderDirection.ASC, field: options?.defaultField ?? "rank" }],
					fields: options?.fields ?? { rank: { isEnabled: true } },
					tieBreakers: options?.tieBreakers ?? [{ direction: EFilterOrderDirection.ASC, field: "id" }],
					unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
				},
				pagination: {
					mode: EApiControllerGetListQueryPaginationMode.CURSOR,
				},
			},
		},
	} as unknown as TApiControllerPropertiesRoute<CursorQueryEntity, EApiRouteType.GET_LIST>;
	const plan: IApiControllerGetListQueryPlan | undefined = ApiControllerGetListQueryPlanCompiler.compile(CursorQueryController, CursorQueryEntity, cursorMetadata, routeConfig);

	if (!plan) {
		throw new Error("Expected a cursor query plan");
	}

	return plan as TApiControllerGetListQueryCompiledPlan<EApiControllerGetListQueryPaginationMode.CURSOR>;
}

function compileCursorStoragePlan(defaultField: keyof CursorStorageQueryEntity): TApiControllerGetListQueryCompiledPlan<EApiControllerGetListQueryPaginationMode.CURSOR> {
	const cursorMetadata: IApiEntity<CursorStorageQueryEntity> = GenerateEntityInformation<CursorStorageQueryEntity>(CursorStorageQueryEntity as unknown as IApiBaseEntity);
	const routeConfig = {
		request: {
			[EApiControllerRequestTarget.QUERY]: {
				order: {
					defaultOrder: [{ direction: EFilterOrderDirection.ASC, field: defaultField }],
					fields: {},
					tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }],
					unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
				},
				pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR },
			},
		},
	} as unknown as TApiControllerPropertiesRoute<CursorStorageQueryEntity, EApiRouteType.GET_LIST>;
	const plan: IApiControllerGetListQueryPlan | undefined = ApiControllerGetListQueryPlanCompiler.compile(CursorQueryController, CursorStorageQueryEntity, cursorMetadata, routeConfig);

	if (!plan) {
		throw new Error("Expected a cursor storage query plan");
	}

	return plan as TApiControllerGetListQueryCompiledPlan<EApiControllerGetListQueryPaginationMode.CURSOR>;
}

function compileUuidPrimaryFilterPlan(mode: EApiControllerGetListQueryPaginationMode, metadata: IApiEntity<CursorQueryEntity> = GenerateEntityInformation<CursorQueryEntity>(CursorQueryEntity as unknown as IApiBaseEntity)): IApiControllerGetListQueryPlan {
	const isCursor: boolean = mode === EApiControllerGetListQueryPaginationMode.CURSOR;
	const routeConfig = {
		request: {
			[EApiControllerRequestTarget.QUERY]: {
				filter: {
					fields: {
						id: { allowedOperations: [EFilterOperation.EQ], isEnabled: true },
					},
					unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
				},
				order: {
					fields: { rank: { isEnabled: true } },
					...(isCursor
						? {
								defaultOrder: [{ direction: EFilterOrderDirection.ASC, field: "rank" }],
								tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }],
							}
						: {}),
					unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
				},
				pagination: { mode },
			},
		},
	} as unknown as TApiControllerPropertiesRoute<CursorQueryEntity, EApiRouteType.GET_LIST>;
	const plan: IApiControllerGetListQueryPlan | undefined = ApiControllerGetListQueryPlanCompiler.compile(CursorQueryController, CursorQueryEntity, metadata, routeConfig);

	if (!plan) {
		throw new Error("Expected a UUID primary filter plan");
	}

	return plan;
}

describe("typed GET_LIST query plan and runtime", () => {
	it.each([EApiControllerGetListQueryPaginationMode.PAGE, EApiControllerGetListQueryPaginationMode.CURSOR])("supports an exact UUID primary filter plan in %s mode without exposing primary client order", async (mode: EApiControllerGetListQueryPaginationMode) => {
		const plan: IApiControllerGetListQueryPlan = compileUuidPrimaryFilterPlan(mode);
		const queryDto = DtoGenerate(CursorQueryEntity, GenerateEntityInformation<CursorQueryEntity>(CursorQueryEntity as unknown as IApiBaseEntity), EApiRouteType.GET_LIST, EApiDtoType.QUERY, undefined, undefined, plan);

		expect(Object.keys(plan.filter.fields)).toEqual(["id"]);
		expect(plan.filter.fields.id).toMatchObject({
			allowedOperations: [EFilterOperation.EQ],
			isEnabled: true,
			type: EApiPropertyDescribeType.UUID,
		});
		expect(Object.keys(plan.order.fields)).toEqual(["rank"]);
		expect(plan.order.fields.id).toBeUndefined();

		if (mode === EApiControllerGetListQueryPaginationMode.CURSOR) {
			expect(plan.order.tieBreakers).toEqual([{ direction: EFilterOrderDirection.ASC, field: "id" }]);
		}

		if (!queryDto) {
			throw new Error("Expected a generated UUID primary filter DTO");
		}

		const query: Record<string, unknown> = {
			"id[operator]": EFilterOperation.EQ,
			"id[value]": PRIMARY_FILTER_ID,
			limit: 10,
			...(mode === EApiControllerGetListQueryPaginationMode.PAGE ? { page: 1 } : {}),
		};
		const instance: Record<string, unknown> = Object.assign(new queryDto() as Record<string, unknown>, query);

		expect(Object.keys(instance)).toEqual(expect.arrayContaining(["id[operator]", "id[value]", "id[values]"]));
		expect(instance).not.toHaveProperty("name[operator]");
		expect(instance).not.toHaveProperty("rank[operator]");
		expect(await validate(instance)).toEqual([]);

		const result = ApiControllerGetListQueryRuntime.parse(query, plan);

		expect(result.ast?.nodes).toEqual([{ operation: EFilterOperation.EQ, path: "id", value: PRIMARY_FILTER_ID }]);
		expect((ApiControllerGetListQueryRuntime.compileWhere<CursorQueryEntity>(result.ast!).id as FindOperator<string>).value).toBe(PRIMARY_FILTER_ID);

		const invalidQuery: Record<string, unknown> = { ...query, "id[value]": "not-a-uuid" };
		const invalidInstance: Record<string, unknown> = Object.assign(new queryDto() as Record<string, unknown>, invalidQuery);

		expect((await validate(invalidInstance)).some((error): boolean => error.property === "id[value]")).toBe(true);
		expect(() => ApiControllerGetListQueryRuntime.parse(invalidQuery, plan)).toThrow("INVALID_FILTER");
	});

	it("does not let primary filter eligibility bypass query visibility", () => {
		const metadata: IApiEntity<CursorQueryEntity> = GenerateEntityInformation<CursorQueryEntity>(CursorQueryEntity as unknown as IApiBaseEntity);
		const restrictedMetadata = {
			...metadata,
			columns: metadata.columns.map((column) => {
				if (column.name !== "id") {
					return column;
				}

				const propertyMetadata = column.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY] as TApiPropertyDescribeProperties;

				return {
					...column,
					metadata: {
						...column.metadata,
						[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY]: {
							...propertyMetadata,
							properties: {
								...propertyMetadata.properties,
								[EApiRouteType.GET_LIST]: {
									...propertyMetadata.properties?.[EApiRouteType.GET_LIST],
									[EApiDtoType.QUERY]: { isEnabled: false },
								},
							},
						},
					},
				};
			}),
		} as IApiEntity<CursorQueryEntity>;

		expect(() => compileUuidPrimaryFilterPlan(EApiControllerGetListQueryPaginationMode.PAGE, restrictedMetadata)).toThrow('GET_LIST filter field "id" is not an enabled direct scalar or one-hop to-one scalar path');
	});

	it("keeps primary identity out of legacy query and mutation body DTOs", () => {
		const metadata: IApiEntity<CursorQueryEntity> = GenerateEntityInformation<CursorQueryEntity>(CursorQueryEntity as unknown as IApiBaseEntity);
		const legacyQueryDto = DtoGenerate(CursorQueryEntity, metadata, EApiRouteType.GET_LIST, EApiDtoType.QUERY);
		const createBodyDto = DtoGenerate(CursorQueryEntity, metadata, EApiRouteType.CREATE, EApiDtoType.BODY);

		if (!legacyQueryDto || !createBodyDto) {
			throw new Error("Expected generated safety-boundary DTOs");
		}

		expect(new legacyQueryDto()).not.toHaveProperty("id[operator]");
		expect(new createBodyDto()).not.toHaveProperty("id");
	});

	it("compiles and freezes a metadata overlay", () => {
		const plan = compilePlan({
			code: { isEnabled: false },
			count: { allowedOperations: [EFilterOperation.EQ, EFilterOperation.GT], isEnabled: true },
			name: { allowedOperations: [EFilterOperation.EQ], isEnabled: true },
		});
		const directionMetadata: Readonly<TApiPropertyDescribeProperties> | undefined = plan.filter.fields.direction?.metadata;

		expect(Object.isFrozen(plan)).toBe(true);
		expect(Object.isFrozen(plan.filter)).toBe(true);
		expect(Object.isFrozen(plan.filter.fields)).toBe(true);
		expect(Object.values(plan.filter.fields).every((field: IApiControllerGetListQueryPlanFilterField): boolean => Object.isFrozen(field) && Object.isFrozen(field.allowedOperations))).toBe(true);
		expect(directionMetadata && "enum" in directionMetadata ? Object.isFrozen(directionMetadata.enum) : false).toBe(true);
		expect(plan.filter.fields.code?.isEnabled).toBe(false);
		expect(plan.filter.fields.count?.allowedOperations).toEqual([EFilterOperation.EQ, EFilterOperation.GT]);
		expect(plan.filter.fields["owner.name"]?.isEnabled).toBe(true);
		expect(plan.filter.fields["tags.id"]).toBeUndefined();
		expect(plan.schemaName).toContain("TypedQueryController");
	});

	it("normalizes plan identity and scopes schemas by controller", () => {
		const first = compilePlan({
			count: { allowedOperations: [EFilterOperation.GT, EFilterOperation.EQ], isEnabled: true },
			name: { allowedOperations: [EFilterOperation.EQ], isEnabled: true },
		});
		const second = compilePlan({
			name: { allowedOperations: [EFilterOperation.EQ], isEnabled: true },
			count: { allowedOperations: [EFilterOperation.EQ, EFilterOperation.GT], isEnabled: true },
		});
		const narrowConfig = {
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					filter: {
						fields: {
							name: { allowedOperations: [EFilterOperation.EQ], isEnabled: true },
						},
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
				},
			},
		} as const;
		const narrow = ApiControllerGetListQueryPlanCompiler.compile(TypedQueryNarrowController, TypedQueryEntity, entityMetadata, narrowConfig);

		expect(first.signature).toBe(second.signature);
		expect(narrow?.schemaName).not.toBe(first.schemaName);
	});

	it("generates distinct route-scoped DTO classes from each normalized plan", async () => {
		const publicPlan = compilePlan({
			code: { isEnabled: false },
			name: { allowedOperations: [EFilterOperation.EQ], isEnabled: true },
		});
		const narrowConfig = {
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					filter: {
						fields: {
							count: { allowedOperations: [EFilterOperation.GT], isEnabled: true },
						},
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
				},
			},
		} as const;
		const narrowPlan = ApiControllerGetListQueryPlanCompiler.compile(TypedQueryNarrowController, TypedQueryEntity, entityMetadata, narrowConfig);
		const publicDto = DtoGenerate(TypedQueryEntity, entityMetadata, EApiRouteType.GET_LIST, EApiDtoType.QUERY, undefined, undefined, publicPlan);
		const narrowDto = DtoGenerate(TypedQueryEntity, entityMetadata, EApiRouteType.GET_LIST, EApiDtoType.QUERY, undefined, undefined, narrowPlan);

		expect(publicDto).toBeDefined();
		expect(narrowDto).toBeDefined();
		expect(publicDto).not.toBe(narrowDto);
		expect(publicDto?.name).toBe(publicPlan.schemaName);
		expect(narrowDto?.name).toBe(narrowPlan?.schemaName);

		const publicInstance = new (publicDto as new () => Record<string, unknown>)();
		const narrowInstance = new (narrowDto as new () => Record<string, unknown>)();

		expect(Object.keys(publicInstance)).toContain("name[operator]");
		expect(Object.keys(publicInstance)).not.toContain("code[operator]");
		expect(Object.keys(narrowInstance)).toContain("count[operator]");
		expect(Object.keys(narrowInstance)).not.toContain("name[operator]");

		narrowInstance["count[operator]"] = EFilterOperation.EQ;
		narrowInstance["count[value]"] = 1;
		narrowInstance.limit = 10;
		narrowInstance.page = 1;

		expect((await validate(narrowInstance)).some((error): boolean => error.property === "count[operator]")).toBe(true);

		narrowInstance["count[operator]"] = EFilterOperation.GT;

		expect((await validate(narrowInstance)).some((error): boolean => error.property === "count[operator]")).toBe(false);
	});

	it("distinguishes INHERIT overlays from REJECT allowlists", () => {
		const inheritedPlan = compilePlan({
			name: { allowedOperations: [EFilterOperation.EQ], isEnabled: true },
		});
		const rejectedPlan = compilePlan(
			{
				name: { allowedOperations: [EFilterOperation.EQ], isEnabled: true },
			},
			{ unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT },
		);
		const inherited = ApiControllerGetListQueryRuntime.parse(
			{
				"count[operator]": EFilterOperation.EQ,
				"count[value]": "2",
				limit: 10,
				page: 1,
			},
			inheritedPlan,
		);

		expect(inherited.ast?.nodes).toEqual([expect.objectContaining({ path: "count", value: 2 })]);
		expect(() =>
			ApiControllerGetListQueryRuntime.parse(
				{
					"count[operator]": EFilterOperation.EQ,
					"count[value]": "2",
					limit: 10,
					page: 1,
				},
				rejectedPlan,
			),
		).toThrow("INVALID_FILTER");
	});

	it.each([
		["unknown path", { missing: { allowedOperations: [EFilterOperation.EQ], isEnabled: true } }],
		["deeper path", { "owner.name.deep": { allowedOperations: [EFilterOperation.EQ], isEnabled: true } }],
		["to-many path", { "tags.id": { allowedOperations: [EFilterOperation.EQ], isEnabled: true } }],
		["globally disabled path", { hidden: { allowedOperations: [EFilterOperation.EQ], isEnabled: true } }],
		["mixed disabled settings", { code: { allowedOperations: [EFilterOperation.EQ], isEnabled: false } }],
		["incompatible operation", { count: { allowedOperations: [EFilterOperation.CONT], isEnabled: true } }],
	])("rejects invalid bootstrap config: %s", (_label, fields) => {
		expect(() => compilePlan(fields)).toThrow();
	});

	it("rejects a manual QUERY DTO combined with generated query configuration at bootstrap", () => {
		const routeConfig = {
			dto: {
				[EApiDtoType.QUERY]: class ManualQueryDto {},
			},
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					filter: {
						fields: {},
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
				},
			},
		} as unknown as TApiControllerPropertiesRoute<TypedQueryEntity, EApiRouteType.GET_LIST>;

		expect(() => ApiControllerGetListQueryPlanCompiler.compile(TypedQueryController, TypedQueryEntity, entityMetadata, routeConfig)).toThrow("cannot be combined with a manual QUERY DTO");
	});

	it("parses typed scalar and one-hop values without stringifying them", () => {
		const plan = compilePlan({
			count: { allowedOperations: [EFilterOperation.GT], isEnabled: true },
			direction: { allowedOperations: [EFilterOperation.EQ], isEnabled: true },
			enabled: { allowedOperations: [EFilterOperation.EQ], isEnabled: true },
			externalId: { allowedOperations: [EFilterOperation.EQ], isEnabled: true },
			occurredAt: { allowedOperations: [EFilterOperation.EQ], isEnabled: true },
			"owner.name": { allowedOperations: [EFilterOperation.EQ], isEnabled: true },
		});
		const externalId = "123e4567-e89b-12d3-a456-426614174000";
		const result = ApiControllerGetListQueryRuntime.parse(
			{
				"count[operator]": EFilterOperation.GT,
				"count[value]": "4",
				"direction[operator]": EFilterOperation.EQ,
				"direction[value]": EFilterOrderDirection.ASC,
				"enabled[operator]": EFilterOperation.EQ,
				"enabled[value]": "false",
				"externalId[operator]": EFilterOperation.EQ,
				"externalId[value]": externalId,
				limit: "10",
				"occurredAt[operator]": EFilterOperation.EQ,
				"occurredAt[value]": "2026-01-01T00:00:00.000Z",
				"owner.name[operator]": EFilterOperation.EQ,
				"owner.name[value]": "Owner",
				page: "2",
			},
			plan,
		);

		expect(result.ast?.nodes).toEqual([
			expect.objectContaining({ operation: EFilterOperation.GT, path: "count", value: 4 }),
			expect.objectContaining({ operation: EFilterOperation.EQ, path: "direction", value: EFilterOrderDirection.ASC }),
			expect.objectContaining({ operation: EFilterOperation.EQ, path: "enabled", value: false }),
			expect.objectContaining({ operation: EFilterOperation.EQ, path: "externalId", value: externalId }),
			expect.objectContaining({ operation: EFilterOperation.EQ, path: "occurredAt", value: new Date("2026-01-01T00:00:00.000Z") }),
			expect.objectContaining({ operation: EFilterOperation.EQ, path: "owner.name", value: "Owner" }),
		]);
		expect(result.limit).toBe(10);
		expect(result.page).toBe(2);

		const where = ApiControllerGetListQueryRuntime.compileWhere<TypedQueryEntity>(result.ast!);

		expect((where.count as FindOperator<number>).value).toBe(4);
		expect((where.enabled as FindOperator<boolean>).value).toBe(false);
		expect((where.occurredAt as FindOperator<Date>).value).toEqual(new Date("2026-01-01T00:00:00.000Z"));
		expect(((where.owner as { name?: FindOperator<string> }).name as FindOperator<string>).value).toBe("Owner");
	});

	it("returns stable pagination error codes", () => {
		const plan = compilePlan({
			name: { allowedOperations: [EFilterOperation.EQ], isEnabled: true },
		});

		expect(() => ApiControllerGetListQueryRuntime.parse({ limit: 0, page: 1 }, plan)).toThrow("INVALID_LIMIT");
		expect(() => ApiControllerGetListQueryRuntime.parse({ limit: 10, page: 1.5 }, plan)).toThrow("INVALID_PAGE");
	});

	it.each([
		["boolean", "enabled", "not-boolean"],
		["date", "occurredAt", "not-a-date"],
		["enum", "direction", "sideways"],
		["integer", "count", "1.5"],
		["UUID", "externalId", "not-a-uuid"],
	])("rejects invalid %s values", (_label, path, value) => {
		const plan = compilePlan({
			[path]: { allowedOperations: [EFilterOperation.EQ], isEnabled: true },
		});

		expect(() =>
			ApiControllerGetListQueryRuntime.parse(
				{
					[`${path}[operator]`]: EFilterOperation.EQ,
					[`${path}[value]`]: value,
					limit: 10,
					page: 1,
				},
				plan,
			),
		).toThrow("INVALID_FILTER");
	});

	it("accepts numeric enum values without accepting reverse-mapping names", () => {
		const plan = compilePlan({
			numericState: { allowedOperations: [EFilterOperation.EQ], isEnabled: true },
		});
		const accepted = ApiControllerGetListQueryRuntime.parse(
			{
				limit: 10,
				"numericState[operator]": EFilterOperation.EQ,
				"numericState[value]": "1",
				page: 1,
			},
			plan,
		);

		expect(accepted.ast?.nodes).toEqual([expect.objectContaining({ path: "numericState", value: 1 })]);
		expect(() =>
			ApiControllerGetListQueryRuntime.parse(
				{
					limit: 10,
					"numericState[operator]": EFilterOperation.EQ,
					"numericState[value]": "CLOSED",
					page: 1,
				},
				plan,
			),
		).toThrow("INVALID_FILTER");
	});

	it("applies a typed static default only when the group is absent", () => {
		const plan = compilePlan({
			count: {
				allowedOperations: [EFilterOperation.EQ],
				defaultCondition: { operator: EFilterOperation.EQ, value: 7 },
				isEnabled: true,
				missingBehavior: EApiControllerGetListQueryFilterMissingBehavior.USE_DEFAULT,
			},
		});
		const result = ApiControllerGetListQueryRuntime.parse({ limit: 10, page: 1 }, plan);
		const clientResult = ApiControllerGetListQueryRuntime.parse(
			{
				"count[operator]": EFilterOperation.EQ,
				"count[value]": "5",
				limit: 10,
				page: 1,
			},
			plan,
		);

		expect(result.ast?.nodes).toEqual([expect.objectContaining({ path: "count", value: 7 })]);
		expect(clientResult.ast?.nodes).toEqual([expect.objectContaining({ path: "count", value: 5 })]);
		expect(() => ApiControllerGetListQueryRuntime.parse({ "count[operator]": EFilterOperation.EQ, limit: 10, page: 1 }, plan)).toThrow("INVALID_FILTER");
	});

	it("validates integer and membership defaults at bootstrap", () => {
		expect(() =>
			compilePlan({
				count: {
					allowedOperations: [EFilterOperation.EQ],
					defaultCondition: { operator: EFilterOperation.EQ, value: 1.5 },
					isEnabled: true,
					missingBehavior: EApiControllerGetListQueryFilterMissingBehavior.USE_DEFAULT,
				},
			}),
		).toThrow();
		expect(() =>
			compilePlan({
				name: {
					allowedOperations: [EFilterOperation.IN],
					defaultCondition: {
						operator: EFilterOperation.IN,
						values: Array.from({ length: DTO_GENERATE_CONSTANT.MAXIMUM_FILTER_PROPERTIES + 1 }, (_value: unknown, index: number): string => `name-${String(index)}`),
					},
					isEnabled: true,
					missingBehavior: EApiControllerGetListQueryFilterMissingBehavior.USE_DEFAULT,
				},
			}),
		).toThrow();

		const numberPlan = compilePlan({
			ratio: {
				allowedOperations: [EFilterOperation.EQ],
				defaultCondition: { operator: EFilterOperation.EQ, value: 1.5 },
				isEnabled: true,
				missingBehavior: EApiControllerGetListQueryFilterMissingBehavior.USE_DEFAULT,
			},
		});

		expect(numberPlan.filter.fields.ratio?.defaultCondition?.value).toBe(1.5);
	});

	it("detaches mutable date defaults from route configuration", () => {
		const configuredDate = new Date("2026-01-01T00:00:00.000Z");
		const plan = compilePlan({
			occurredAt: {
				allowedOperations: [EFilterOperation.EQ],
				defaultCondition: { operator: EFilterOperation.EQ, value: configuredDate },
				isEnabled: true,
				missingBehavior: EApiControllerGetListQueryFilterMissingBehavior.USE_DEFAULT,
			},
		});

		configuredDate.setUTCFullYear(2030);

		const result = ApiControllerGetListQueryRuntime.parse({ limit: 10, page: 1 }, plan);
		const defaultValue: unknown = result.ast?.nodes.find((node: IApiControllerGetListQueryAstNode): boolean => node.path === "occurredAt")?.value;

		expect(defaultValue).toEqual(new Date("2026-01-01T00:00:00.000Z"));
		expect(defaultValue).not.toBe(configuredDate);
		expect(Object.isFrozen(plan.filter.fields.occurredAt?.defaultCondition)).toBe(true);
	});

	it("preserves the existing request Date reference in PAGE filter ASTs", () => {
		const plan = compilePlan({
			occurredAt: { allowedOperations: [EFilterOperation.EQ], isEnabled: true },
		});
		const requestDate = new Date("2026-01-01T00:00:00.000Z");
		const result = ApiControllerGetListQueryRuntime.parse(
			{
				limit: 10,
				"occurredAt[operator]": EFilterOperation.EQ,
				"occurredAt[value]": requestDate,
				page: 1,
			},
			plan,
		);

		const astDate: unknown = result.ast?.nodes.find((node: IApiControllerGetListQueryAstNode): boolean => node.path === "occurredAt")?.value;

		expect(astDate).toBe(requestDate);
		requestDate.setUTCFullYear(2030);
		expect(astDate).toEqual(new Date("2030-01-01T00:00:00.000Z"));
	});

	it("returns FILTER_REQUIRED for an absent required group", () => {
		const plan = compilePlan({
			name: {
				allowedOperations: [EFilterOperation.EQ],
				isEnabled: true,
				missingBehavior: EApiControllerGetListQueryFilterMissingBehavior.REJECT,
			},
		});

		expect(() => ApiControllerGetListQueryRuntime.parse({ limit: 10, page: 1 }, plan)).toThrow("FILTER_REQUIRED");
	});

	it("enforces exact cardinality and null operands", () => {
		const plan = compilePlan({
			code: { allowedOperations: [EFilterOperation.IN, EFilterOperation.ISNULL, EFilterOperation.NOTNULL], isEnabled: true },
			count: { allowedOperations: [EFilterOperation.BETWEEN], isEnabled: true },
		});

		expect(() =>
			ApiControllerGetListQueryRuntime.parse(
				{
					"code[operator]": EFilterOperation.ISNULL,
					"code[value]": "unused",
					limit: 10,
					page: 1,
				},
				plan,
			),
		).toThrow("INVALID_FILTER");
		expect(() =>
			ApiControllerGetListQueryRuntime.parse(
				{
					"count[operator]": EFilterOperation.BETWEEN,
					"count[values]": ["1"],
					limit: 10,
					page: 1,
				},
				plan,
			),
		).toThrow("INVALID_FILTER");
		expect(() =>
			ApiControllerGetListQueryRuntime.parse(
				{
					"count[operator]": EFilterOperation.BETWEEN,
					"count[values]": ["1", "2", "3"],
					limit: 10,
					page: 1,
				},
				plan,
			),
		).toThrow("INVALID_FILTER");
		expect(() =>
			ApiControllerGetListQueryRuntime.parse(
				{
					"code[operator]": EFilterOperation.IN,
					"code[values]": [],
					limit: 10,
					page: 1,
				},
				plan,
			),
		).toThrow("INVALID_FILTER");
		expect(() =>
			ApiControllerGetListQueryRuntime.parse(
				{
					"code[operator]": EFilterOperation.IN,
					"code[values]": Array.from({ length: DTO_GENERATE_CONSTANT.MAXIMUM_FILTER_PROPERTIES + 1 }, (_value: unknown, index: number): string => `code-${String(index)}`),
					limit: 10,
					page: 1,
				},
				plan,
			),
		).toThrow("INVALID_FILTER");

		const membership = ApiControllerGetListQueryRuntime.parse(
			{
				"code[operator]": EFilterOperation.IN,
				"code[values]": "code-1",
				limit: 10,
				page: 1,
			},
			plan,
		);

		expect(membership.ast?.nodes).toEqual([expect.objectContaining({ path: "code", values: ["code-1"] })]);

		const between = ApiControllerGetListQueryRuntime.parse(
			{
				"count[operator]": EFilterOperation.BETWEEN,
				"count[values]": ["1", "2"],
				limit: 10,
				page: 1,
			},
			plan,
		);
		const isNull = ApiControllerGetListQueryRuntime.parse(
			{
				"code[operator]": EFilterOperation.ISNULL,
				limit: 10,
				page: 1,
			},
			plan,
		);
		const notNull = ApiControllerGetListQueryRuntime.parse(
			{
				"code[operator]": EFilterOperation.NOTNULL,
				limit: 10,
				page: 1,
			},
			plan,
		);

		expect(between.ast?.nodes).toEqual([expect.objectContaining({ path: "count", values: [1, 2] })]);
		expect((ApiControllerGetListQueryRuntime.compileWhere<TypedQueryEntity>(between.ast!).count as FindOperator<number>).type).toBe("between");
		expect(isNull.ast?.nodes).toEqual([expect.objectContaining({ operation: EFilterOperation.ISNULL, path: "code" })]);
		expect((ApiControllerGetListQueryRuntime.compileWhere<TypedQueryEntity>(isNull.ast!).code as FindOperator<string>).type).toBe("isNull");
		expect(notNull.ast?.nodes).toEqual([expect.objectContaining({ operation: EFilterOperation.NOTNULL, path: "code" })]);
		expect((ApiControllerGetListQueryRuntime.compileWhere<TypedQueryEntity>(notNull.ast!).code as FindOperator<string>).type).toBe("not");
	});

	it.each(["unknown[operator]", "name[bad]", "name[value", "name[value][extra]"])("rejects malformed or unknown key %s", (key) => {
		const plan = compilePlan({
			name: { allowedOperations: [EFilterOperation.EQ], isEnabled: true },
		});

		expect(() => ApiControllerGetListQueryRuntime.parse({ [key]: "x", limit: 10, page: 1 }, plan)).toThrow("INVALID_FILTER");
	});

	it("preserves strict metadata order validation when only filter is configured", () => {
		const plan = compilePlan({
			name: { allowedOperations: [EFilterOperation.EQ], isEnabled: true },
		});
		const result = ApiControllerGetListQueryRuntime.parse({ limit: 10, orderBy: "count", orderDirection: "DESC", page: 1 }, plan);

		expect(result.orderBy).toBe("count");
		expect(result.orderDirection).toBe(EFilterOrderDirection.DESC);
		expect(() => ApiControllerGetListQueryRuntime.parse({ limit: 10, orderBy: "missing", orderDirection: "asc", page: 1 }, plan)).toThrow("INVALID_ORDER");
		expect(() => ApiControllerGetListQueryRuntime.parse({ limit: 10, orderBy: "count", page: 1 }, plan)).toThrow("INVALID_ORDER");
	});

	it("enforces the typed direct-scalar order overlay", () => {
		const plan = compilePlan(
			{
				name: { allowedOperations: [EFilterOperation.EQ], isEnabled: true },
			},
			{
				orderFields: {
					code: { isEnabled: false },
					count: { isEnabled: true },
				},
			},
		);
		const result = ApiControllerGetListQueryRuntime.parse({ limit: 10, orderBy: "count", orderDirection: "DESC", page: 1 }, plan);

		expect(result.orderBy).toBe("count");
		expect(result.orderDirection).toBe(EFilterOrderDirection.DESC);
		expect(() => ApiControllerGetListQueryRuntime.parse({ limit: 10, orderBy: "code", orderDirection: "asc", page: 1 }, plan)).toThrow("INVALID_ORDER");
		expect(() => ApiControllerGetListQueryRuntime.parse({ limit: 10, orderBy: "owner.name", orderDirection: "asc", page: 1 }, plan)).toThrow("INVALID_ORDER");
	});

	it("compiles a strict CURSOR contract without page or totals", async () => {
		const plan = compileCursorPlan();
		const result = ApiControllerGetListQueryRuntime.parse({ limit: "2" }, plan);
		const dto = DtoGenerate(CursorQueryEntity, GenerateEntityInformation<CursorQueryEntity>(CursorQueryEntity as unknown as IApiBaseEntity), EApiRouteType.GET_LIST, EApiDtoType.QUERY, undefined, undefined, plan);
		const responseDto = DtoGenerate(CursorQueryEntity, GenerateEntityInformation<CursorQueryEntity>(CursorQueryEntity as unknown as IApiBaseEntity), EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, undefined, undefined, plan);
		const instance = new (dto as new () => Record<string, unknown>)();
		const swaggerProperties: ReadonlyArray<string> = (Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES_ARRAY, dto?.prototype) as ReadonlyArray<string> | undefined) ?? [];
		const validationMetadata = getMetadataStorage().getTargetValidationMetadatas(dto as new () => unknown, "", true, false);

		expect(result).toMatchObject({ limit: 2, paginationMode: EApiControllerGetListQueryPaginationMode.CURSOR });
		expect(result.page).toBeUndefined();
		expect(result.order).toEqual([
			{ direction: EFilterOrderDirection.ASC, field: "rank" },
			{ direction: EFilterOrderDirection.ASC, field: "id" },
		]);
		expect(Reflect.hasMetadata("swagger/apiModelProperties", dto?.prototype, "after")).toBe(true);
		expect(Reflect.hasMetadata("swagger/apiModelProperties", dto?.prototype, "before")).toBe(true);
		expect(Reflect.hasMetadata("swagger/apiModelProperties", dto?.prototype, "page")).toBe(false);
		expect(Reflect.hasMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, dto?.prototype, "orderBy")).toBe(true);
		expect(Reflect.hasMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, dto?.prototype, "orderDirection")).toBe(true);
		expect(swaggerProperties).toContain(":orderBy");
		expect(swaggerProperties).toContain(":orderDirection");
		expect(validationMetadata.some((metadata): boolean => metadata.propertyName === "orderBy")).toBe(true);
		expect(validationMetadata.some((metadata): boolean => metadata.propertyName === "orderDirection")).toBe(true);
		expect(Reflect.hasMetadata("swagger/apiModelProperties", responseDto?.prototype, "nextCursor")).toBe(true);
		expect(Reflect.hasMetadata("swagger/apiModelProperties", responseDto?.prototype, "previousCursor")).toBe(true);
		expect(Reflect.hasMetadata("swagger/apiModelProperties", responseDto?.prototype, "totalCount")).toBe(false);

		instance.limit = 2;
		instance.after = "cursor-a";
		instance.before = "cursor-b";
		expect((await validate(instance)).some((error): boolean => error.property === "object")).toBe(true);
		expect(() => ApiControllerGetListQueryRuntime.parse({ after: "a", before: "b", limit: 2 }, plan)).toThrow("INVALID_CURSOR");
		expect(() => ApiControllerGetListQueryRuntime.parse({ limit: 2, page: 1 }, plan)).toThrow("INVALID_CURSOR");
	});

	it("omits generated client-order controls when a CURSOR plan enables no client order fields", async () => {
		const plan = compileCursorPlan({ fields: {} });
		const cursorEntityMetadata = GenerateEntityInformation<CursorQueryEntity>(CursorQueryEntity as unknown as IApiBaseEntity);
		const baseDto = DtoGetGetListQueryBaseClass(CursorQueryEntity, cursorEntityMetadata, EApiRouteType.GET_LIST, EApiDtoType.QUERY, plan);
		const baseInstance = new baseDto() as Record<string, unknown>;
		const baseManualMetadata = GetManualDtoPropertyMetadata(baseDto.prototype);
		const dto = DtoGenerate(CursorQueryEntity, cursorEntityMetadata, EApiRouteType.GET_LIST, EApiDtoType.QUERY, undefined, undefined, plan);
		const instance = new (dto as new () => Record<string, unknown>)();
		const swaggerProperties: ReadonlyArray<string> = (Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES_ARRAY, dto?.prototype) as ReadonlyArray<string> | undefined) ?? [];
		const validationMetadata = getMetadataStorage().getTargetValidationMetadatas(dto as new () => unknown, "", true, false);
		const result = ApiControllerGetListQueryRuntime.parse({ limit: 2 }, plan);

		instance.limit = 2;

		expect(Object.hasOwn(baseInstance, "limit")).toBe(true);
		expect(typeof baseInstance.object).toBe("function");
		expect(baseManualMetadata.has("limit")).toBe(true);
		expect(baseManualMetadata.has("orderBy")).toBe(false);
		expect(baseManualMetadata.has("orderDirection")).toBe(false);
		expect(Object.hasOwn(instance, "limit")).toBe(true);
		expect(Object.hasOwn(instance, "orderBy")).toBe(false);
		expect(Object.hasOwn(instance, "orderDirection")).toBe(false);
		expect(Reflect.hasMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, dto?.prototype, "orderBy")).toBe(false);
		expect(Reflect.hasMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, dto?.prototype, "orderDirection")).toBe(false);
		expect(swaggerProperties).not.toContain(":orderBy");
		expect(swaggerProperties).not.toContain(":orderDirection");
		expect(validationMetadata.some((metadata): boolean => metadata.propertyName === "orderBy" || metadata.propertyName === "orderDirection" || (metadata.propertyName === "object" && metadata.constraints?.[0] === "orderBy" && metadata.constraints?.[1] === "orderDirection"))).toBe(false);
		expect(await validate(instance)).toHaveLength(0);
		expect(result.orderBy).toBeUndefined();
		expect(result.orderDirection).toBeUndefined();
		expect(result.order).toEqual([
			{ direction: EFilterOrderDirection.ASC, field: "rank" },
			{ direction: EFilterOrderDirection.ASC, field: "id" },
		]);
		expect(() => ApiControllerGetListQueryRuntime.parse({ limit: 2, orderBy: "rank", orderDirection: "asc" }, plan)).toThrow("INVALID_ORDER");
	});

	it("keeps explicit PAGE pagination on the existing page and count contract", () => {
		const cursorMetadata: IApiEntity<CursorQueryEntity> = GenerateEntityInformation<CursorQueryEntity>(CursorQueryEntity as unknown as IApiBaseEntity);
		const routeConfig = {
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					pagination: { mode: EApiControllerGetListQueryPaginationMode.PAGE },
				},
			},
		} as unknown as TApiControllerPropertiesRoute<CursorQueryEntity, EApiRouteType.GET_LIST>;
		const plan = ApiControllerGetListQueryPlanCompiler.compile(CursorQueryController, CursorQueryEntity, cursorMetadata, routeConfig);

		if (!plan) {
			throw new Error("Expected an explicit PAGE query plan");
		}

		const result = ApiControllerGetListQueryRuntime.parse({ after: "page-filter-after", before: "page-filter-before", limit: 10, page: 3 }, plan);
		const dto = DtoGenerate(CursorQueryEntity, cursorMetadata, EApiRouteType.GET_LIST, EApiDtoType.QUERY, undefined, undefined, plan);
		const baselineResponseDto = DtoGenerate(CursorQueryEntity, cursorMetadata, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE);
		const responseDto = DtoGenerate(CursorQueryEntity, cursorMetadata, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, undefined, undefined, plan);

		expect(result).toMatchObject({ limit: 10, page: 3 });
		expect(result.filterQuery).toEqual({ after: "page-filter-after", before: "page-filter-before" });
		expect(Object.hasOwn(result, "paginationMode")).toBe(false);
		expect(Object.hasOwn(result, "after")).toBe(false);
		expect(Object.hasOwn(result, "before")).toBe(false);
		expect(Object.keys(plan)).toEqual(["controllerName", "filter", "order", "schemaName", "signature"]);
		expect(Object.hasOwn(plan, "pagination")).toBe(false);
		expect(Object.hasOwn(plan.order, "serverFields")).toBe(false);
		expect(Object.values(plan.order.fields).every((field): boolean => Object.keys(field).join(",") === "isEnabled,path")).toBe(true);
		expect(Reflect.hasMetadata("swagger/apiModelProperties", dto?.prototype, "page")).toBe(true);
		expect(Reflect.hasMetadata("swagger/apiModelProperties", dto?.prototype, "after")).toBe(false);
		expect(Reflect.hasMetadata("swagger/apiModelProperties", dto?.prototype, "before")).toBe(false);
		expect(responseDto).not.toBe(baselineResponseDto);
	});

	it.each([
		["missing primary tie-breaker", { tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "name" }] }, "CURSOR GET_LIST"],
		["nullable potential order", { defaultField: "nullableRank", fields: { nullableRank: { isEnabled: true } } }, "CURSOR GET_LIST"],
		["primary exposed before the tie-breaker", { fields: { id: { isEnabled: true }, rank: { isEnabled: true } } }, 'GET_LIST order field "id" is not an enabled direct scalar path'],
	])("rejects invalid CURSOR bootstrap order: %s", (_label, options, message) => {
		expect(() => compileCursorPlan(options)).toThrow(message);
	});

	it("rejects select:false and inherited nullable CURSOR order fields", () => {
		expect(() => compileCursorPlan({ defaultField: "hiddenValue" })).toThrow("must be a selected persisted column without a transformer");

		const inheritedMetadata: IApiEntity<CursorInheritedQueryEntity> = GenerateEntityInformation<CursorInheritedQueryEntity>(CursorInheritedQueryEntity as unknown as IApiBaseEntity);
		const inheritedConfig = {
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					order: {
						defaultOrder: [{ direction: EFilterOrderDirection.ASC, field: "inheritedNullableRank" }],
						fields: {},
						tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }],
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
					pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR },
				},
			},
		} as unknown as TApiControllerPropertiesRoute<CursorInheritedQueryEntity, EApiRouteType.GET_LIST>;

		expect(() => ApiControllerGetListQueryPlanCompiler.compile(CursorQueryController, CursorInheritedQueryEntity, inheritedMetadata, inheritedConfig)).toThrow('order field "inheritedNullableRank" must be a described non-null direct scalar field');
	});

	it.each(["2", "__proto__"] as const)("rejects a CURSOR order field whose name cannot preserve safe object-key semantics: %s", (fieldName) => {
		const entityMetadata: IApiEntity<CursorUnsafeFieldNameQueryEntity> = GenerateEntityInformation<CursorUnsafeFieldNameQueryEntity>(CursorUnsafeFieldNameQueryEntity as unknown as IApiBaseEntity);
		const routeConfig = {
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					order: {
						defaultOrder: [{ direction: EFilterOrderDirection.ASC, field: fieldName }],
						fields: {},
						tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }],
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
					pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR },
				},
			},
		} as unknown as TApiControllerPropertiesRoute<CursorUnsafeFieldNameQueryEntity, EApiRouteType.GET_LIST>;

		expect(() => ApiControllerGetListQueryPlanCompiler.compile(CursorQueryController, CursorUnsafeFieldNameQueryEntity, entityMetadata, routeConfig)).toThrow(`order field "${fieldName}" is not a safe stable object property name`);
	});

	it.each(["safeBigint", "safeBoolean", "safeEnum", "safeInteger", "safeUuid"] as const)("accepts an exactly representable CURSOR storage field: %s", (field) => {
		expect(() => compileCursorStoragePlan(field)).not.toThrow();
	});

	it("does not treat request-validation integer bounds as the cursor storage domain", () => {
		expect(() => compileCursorStoragePlan("opaqueInteger")).not.toThrow();
	});

	it.each([
		["unsafeArrayEnum", "selected persisted column"],
		["unsafeBigintNumber", "signed PostgreSQL int2/int4 storage"],
		["unsafeBlobUuid", "native PostgreSQL UUID storage"],
		["unsafeJsonString", "only BIGINT_STRING metadata"],
		["unsafeTimezoneTime", "not supported by PostgreSQL CURSOR v1"],
		["unsafeVarcharBoolean", "boolean storage"],
	] as const)("rejects a CURSOR field whose DTO scalar cannot exactly represent its storage: %s", (field, message) => {
		expect(() => compileCursorStoragePlan(field)).toThrow(message);
	});

	it.each(["responseHiddenRank", "responseGuardedRank"])("rejects a CURSOR order field that is not unconditionally raw-exposed: %s", (defaultField) => {
		expect(() => compileCursorPlan({ defaultField, fields: {} })).toThrow("must be unconditionally raw-exposed in the generated response");
	});

	it("rejects accessor-backed CURSOR order fields", () => {
		const accessorMetadata: IApiEntity<CursorAccessorQueryEntity> = GenerateEntityInformation<CursorAccessorQueryEntity>(CursorAccessorQueryEntity as unknown as IApiBaseEntity);
		const accessorConfig = {
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					order: {
						defaultOrder: [{ direction: EFilterOrderDirection.ASC, field: "rank" }],
						fields: {},
						tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }],
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
					pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR },
				},
			},
		} as unknown as TApiControllerPropertiesRoute<CursorAccessorQueryEntity, EApiRouteType.GET_LIST>;

		expect(() => ApiControllerGetListQueryPlanCompiler.compile(CursorQueryController, CursorAccessorQueryEntity, accessorMetadata, accessorConfig)).toThrow("must be a raw data property, not an accessor");
	});

	it("accepts statically proven CURSOR item and flat wrapper DTOs", () => {
		expect(() => compileCursorPlan({ fields: { rank: { isEnabled: true } }, responseDto: { itemType: CursorCustomItemDto } })).not.toThrow();
		expect(() => compileCursorPlan({ fields: { rank: { isEnabled: true } }, responseDto: CursorCustomResponseDto })).not.toThrow();
	});

	it.each([
		["missing protected item metadata", { itemType: CursorCustomIncompleteItemDto }],
		["accessor-backed item metadata", { itemType: CursorCustomAccessorItemDto }],
		["unproven flat wrapper", CursorQueryController],
		["incompatible cursor metadata", CursorCustomInvalidResponseDto],
	])("rejects an unsafe custom CURSOR response DTO: %s", (_label, responseDto) => {
		expect(() => compileCursorPlan({ fields: { rank: { isEnabled: true } }, responseDto })).toThrow("CURSOR GET_LIST custom");
	});

	it("rejects CURSOR bootstrap without explicit order and for composite primary keys", () => {
		const cursorMetadata: IApiEntity<CursorQueryEntity> = GenerateEntityInformation<CursorQueryEntity>(CursorQueryEntity as unknown as IApiBaseEntity);
		const paginationOnly = {
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR },
				},
			},
		} as unknown as TApiControllerPropertiesRoute<CursorQueryEntity, EApiRouteType.GET_LIST>;

		expect(() => ApiControllerGetListQueryPlanCompiler.compile(CursorQueryController, CursorQueryEntity, cursorMetadata, paginationOnly)).toThrow("requires explicit order configuration");

		const compositeMetadata: IApiEntity<CompositeCursorQueryEntity> = GenerateEntityInformation<CompositeCursorQueryEntity>(CompositeCursorQueryEntity as unknown as IApiBaseEntity);
		const compositeConfig = {
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					order: {
						defaultOrder: [{ direction: EFilterOrderDirection.ASC, field: "partition" }],
						fields: {},
						tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "sequence" }],
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
					pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR },
				},
			},
		} as unknown as TApiControllerPropertiesRoute<CompositeCursorQueryEntity, EApiRouteType.GET_LIST>;

		expect(() => ApiControllerGetListQueryPlanCompiler.compile(CursorQueryController, CompositeCursorQueryEntity, compositeMetadata, compositeConfig)).toThrow("requires exactly one primary column");
	});

	it("walks CURSOR windows in both directions with one probe per cursor request", async () => {
		const plan = compileCursorPlan();
		const parsed = ApiControllerGetListQueryRuntime.parse({ limit: 2 }, plan);
		const order = parsed.order;

		if (!parsed.ast || !order) {
			throw new Error("Expected compiled cursor AST and order");
		}

		const dataSource = new DataSource({ database: ":memory:", entities: [CursorQueryEntity], synchronize: true, type: "sqlite" });

		await dataSource.initialize();

		try {
			const repository = dataSource.getRepository(CursorQueryEntity);

			await repository.save([
				{ hiddenValue: "hidden-a", id: CURSOR_ID_A, name: "A", rank: 1 },
				{ hiddenValue: "hidden-b", id: CURSOR_ID_B, name: "B", rank: 1 },
				{ hiddenValue: "hidden-c", id: CURSOR_ID_C, name: "C", rank: 2 },
				{ hiddenValue: "hidden-d", id: CURSOR_ID_D, name: "D", rank: 2 },
				{ hiddenValue: "hidden-e", id: CURSOR_ID_E, name: "E", rank: 3 },
			]);

			const run = vi.fn(async (properties: FindManyOptions<CursorQueryEntity>): Promise<Array<CursorQueryEntity>> => await repository.find(properties));
			const contextHash = ApiControllerGetListCursorRuntime.createContextHash("cursor-items", undefined, plan, parsed.ast, order);
			const first = await ApiControllerGetListCursorRuntime.execute({ baseProperties: { where: {} }, contextHash, limit: 2, onBeforeQuery: vi.fn(), order, plan, run });

			expect(first.items.map(({ id }: CursorQueryEntity): string => id)).toEqual([CURSOR_ID_A, CURSOR_ID_B]);
			expect(first.nextCursor).toEqual(expect.any(String));
			expect(first.previousCursor).toBeNull();
			expect(run).toHaveBeenCalledTimes(1);

			const second = await ApiControllerGetListCursorRuntime.execute({ baseProperties: { where: {} }, contextHash, cursor: first.nextCursor as string, direction: "after", limit: 2, onBeforeQuery: vi.fn(), order, plan, run });

			expect(second.items.map(({ id }: CursorQueryEntity): string => id)).toEqual([CURSOR_ID_C, CURSOR_ID_D]);
			expect(second.nextCursor).toEqual(expect.any(String));
			expect(second.previousCursor).toEqual(expect.any(String));
			expect(run).toHaveBeenCalledTimes(3);

			const previous = await ApiControllerGetListCursorRuntime.execute({ baseProperties: { where: {} }, contextHash, cursor: second.previousCursor as string, direction: "before", limit: 2, onBeforeQuery: vi.fn(), order, plan, run });

			expect(previous.items.map(({ id }: CursorQueryEntity): string => id)).toEqual([CURSOR_ID_A, CURSOR_ID_B]);
			expect(previous.previousCursor).toBeNull();
			expect(previous.nextCursor).toEqual(expect.any(String));

			const third = await ApiControllerGetListCursorRuntime.execute({ baseProperties: { where: {} }, contextHash, cursor: second.nextCursor as string, direction: "after", limit: 2, onBeforeQuery: vi.fn(), order, plan, run });
			const emptyAfter = await ApiControllerGetListCursorRuntime.execute({ baseProperties: { where: {} }, contextHash, cursor: third.previousCursor as string, direction: "after", limit: 2, onBeforeQuery: vi.fn(), order, plan, run });

			expect(third.items.map(({ id }: CursorQueryEntity): string => id)).toEqual([CURSOR_ID_E]);
			expect(third.nextCursor).toBeNull();
			expect(emptyAfter).toEqual({ items: [], nextCursor: null, previousCursor: third.previousCursor });

			const firstSingle = await ApiControllerGetListCursorRuntime.execute({ baseProperties: { where: {} }, contextHash, limit: 1, onBeforeQuery: vi.fn(), order, plan, run });
			const emptyBefore = await ApiControllerGetListCursorRuntime.execute({ baseProperties: { where: {} }, contextHash, cursor: firstSingle.nextCursor as string, direction: "before", limit: 1, onBeforeQuery: vi.fn(), order, plan, run });

			expect(emptyBefore).toEqual({ items: [], nextCursor: firstSingle.nextCursor, previousCursor: null });
		} finally {
			await dataSource.destroy();
		}
	});

	it("rejects delayed mutation of the main CURSOR window while the opposite probe awaits", async () => {
		const plan = compileCursorPlan();
		const parsed = ApiControllerGetListQueryRuntime.parse({ limit: 1 }, plan);

		if (!parsed.ast || !parsed.order) {
			throw new Error("Expected compiled cursor AST and order");
		}

		const contextHash = ApiControllerGetListCursorRuntime.createContextHash("cursor-items", undefined, plan, parsed.ast, parsed.order);
		const seed = await ApiControllerGetListCursorRuntime.execute({
			baseProperties: { where: {} },
			contextHash,
			limit: 1,
			onBeforeQuery: vi.fn(),
			order: parsed.order,
			plan,
			run: async (): Promise<Array<CursorQueryEntity>> => [{ id: CURSOR_ID_A, name: "A", rank: 1 } as CursorQueryEntity, { id: CURSOR_ID_B, name: "B", rank: 2 } as CursorQueryEntity],
		});
		const mainItems = [{ id: CURSOR_ID_B, name: "B", rank: 2 } as CursorQueryEntity, { id: CURSOR_ID_C, name: "C", rank: 3 } as CursorQueryEntity];
		let callCount = 0;
		const delayedMutationRun = async (): Promise<Array<CursorQueryEntity>> => {
			callCount += 1;

			if (callCount === 1) {
				setTimeout(() => {
					const firstItem = mainItems[0];

					if (firstItem) {
						firstItem.rank = 99;
					}
				}, 0);

				return mainItems;
			}

			await new Promise<void>((resolve): void => {
				setTimeout(resolve, 5);
			});

			return [];
		};

		await expect(ApiControllerGetListCursorRuntime.execute({ baseProperties: { where: {} }, contextHash, cursor: seed.nextCursor as string, direction: "after", limit: 1, onBeforeQuery: vi.fn(), order: parsed.order, plan, run: delayedMutationRun })).rejects.toThrow("changed the protected result window");
	});

	it("keeps the opposite CURSOR probe detached from main-query scope mutation", async () => {
		const plan = compileCursorPlan();
		const parsed = ApiControllerGetListQueryRuntime.parse({ limit: 1 }, plan);

		if (!parsed.ast || !parsed.order) {
			throw new Error("Expected compiled cursor AST and order");
		}

		const contextHash = ApiControllerGetListCursorRuntime.createContextHash("cursor-items", undefined, plan, parsed.ast, parsed.order);
		const scopeWhere = { tenantId: Equal("tenant-a") } as never;
		const seed = await ApiControllerGetListCursorRuntime.execute({
			baseProperties: { where: scopeWhere },
			contextHash,
			limit: 1,
			onBeforeQuery: vi.fn(),
			order: parsed.order,
			plan,
			run: async (): Promise<Array<CursorQueryEntity>> => [{ id: CURSOR_ID_A, name: "A", rank: 1 } as CursorQueryEntity, { id: CURSOR_ID_B, name: "B", rank: 2 } as CursorQueryEntity],
		});
		let callCount = 0;
		const run = vi.fn(async (properties: FindManyOptions<CursorQueryEntity>): Promise<Array<CursorQueryEntity>> => {
			callCount += 1;

			const branches: Array<Record<string, unknown>> = (Array.isArray(properties.where) ? properties.where : [properties.where]).filter(Boolean) as Array<Record<string, unknown>>;
			const tenantOperators: Array<FindOperator<unknown>> = branches.map((branch: Record<string, unknown>): FindOperator<unknown> => branch.tenantId as FindOperator<unknown>);

			if (callCount === 1) {
				for (const operator of tenantOperators) {
					(operator as unknown as { _value: unknown })._value = "tenant-b";
				}

				return [{ id: CURSOR_ID_B, name: "B", rank: 2 } as CursorQueryEntity, { id: CURSOR_ID_C, name: "C", rank: 3 } as CursorQueryEntity];
			}

			expect(tenantOperators.map((operator: FindOperator<unknown>): unknown => operator.value)).toEqual(tenantOperators.map((): string => "tenant-a"));

			return [];
		});

		await ApiControllerGetListCursorRuntime.execute({ baseProperties: { where: scopeWhere }, contextHash, cursor: seed.nextCursor as string, direction: "after", limit: 1, onBeforeQuery: vi.fn(), order: parsed.order, plan, run });
		expect(run).toHaveBeenCalledTimes(2);
	});

	it("rejects non-canonical or cross-context cursors before database I/O", async () => {
		const plan = compileCursorPlan();
		const parsed = ApiControllerGetListQueryRuntime.parse({ limit: 1 }, plan);

		if (!parsed.ast || !parsed.order) {
			throw new Error("Expected compiled cursor AST and order");
		}

		const contextHash = ApiControllerGetListCursorRuntime.createContextHash("cursor-items", undefined, plan, parsed.ast, parsed.order);
		const seedRun = vi.fn(async (): Promise<Array<CursorQueryEntity>> => [{ id: CURSOR_ID_A, name: "A", rank: 1 } as CursorQueryEntity, { id: CURSOR_ID_B, name: "B", rank: 2 } as CursorQueryEntity]);
		const first = await ApiControllerGetListCursorRuntime.execute({ baseProperties: { where: {} }, contextHash, limit: 1, onBeforeQuery: vi.fn(), order: parsed.order, plan, run: seedRun });
		const rejectedRun = vi.fn(async (): Promise<Array<CursorQueryEntity>> => []);
		const rejectedBoundary = vi.fn();
		const otherContext = ApiControllerGetListCursorRuntime.createContextHash("other-route", undefined, plan, parsed.ast, parsed.order);
		const otherParametersContext = ApiControllerGetListCursorRuntime.createContextHash("cursor-items", { id: "other" }, plan, parsed.ast, parsed.order);
		const otherReadPlanContext = ApiControllerGetListCursorRuntime.createContextHash("cursor-items", undefined, plan, parsed.ast, parsed.order, "other-read-plan");
		const otherControllerPlan: TApiControllerGetListQueryCompiledPlan<EApiControllerGetListQueryPaginationMode.CURSOR> = { ...plan, controllerName: "OtherCursorController", schemaName: "OtherCursorControllerCursorQueryEntityGetListQueryDTO" };
		const otherControllerContext = ApiControllerGetListCursorRuntime.createContextHash("cursor-items", undefined, otherControllerPlan, parsed.ast, parsed.order);

		await expect(ApiControllerGetListCursorRuntime.execute({ baseProperties: { where: {} }, contextHash: otherContext, cursor: first.nextCursor as string, direction: "after", limit: 1, onBeforeQuery: rejectedBoundary, order: parsed.order, plan, run: rejectedRun })).rejects.toThrow("INVALID_CURSOR");
		await expect(ApiControllerGetListCursorRuntime.execute({ baseProperties: { where: {} }, contextHash: otherParametersContext, cursor: first.nextCursor as string, direction: "after", limit: 1, onBeforeQuery: rejectedBoundary, order: parsed.order, plan, run: rejectedRun })).rejects.toThrow("INVALID_CURSOR");
		await expect(ApiControllerGetListCursorRuntime.execute({ baseProperties: { where: {} }, contextHash: otherReadPlanContext, cursor: first.nextCursor as string, direction: "after", limit: 1, onBeforeQuery: rejectedBoundary, order: parsed.order, plan, run: rejectedRun })).rejects.toThrow("INVALID_CURSOR");
		await expect(ApiControllerGetListCursorRuntime.execute({ baseProperties: { where: {} }, contextHash: otherControllerContext, cursor: first.nextCursor as string, direction: "after", limit: 1, onBeforeQuery: rejectedBoundary, order: parsed.order, plan, run: rejectedRun })).rejects.toThrow("INVALID_CURSOR");
		await expect(ApiControllerGetListCursorRuntime.execute({ baseProperties: { where: {} }, contextHash, cursor: `${String(first.nextCursor)}=`, direction: "after", limit: 1, onBeforeQuery: rejectedBoundary, order: parsed.order, plan, run: rejectedRun })).rejects.toThrow("INVALID_CURSOR");
		expect(rejectedRun).not.toHaveBeenCalled();
		expect(rejectedBoundary).not.toHaveBeenCalled();

		const changedLimitRun = vi.fn(async (): Promise<Array<CursorQueryEntity>> => []);

		await expect(ApiControllerGetListCursorRuntime.execute({ baseProperties: { where: {} }, contextHash, cursor: first.nextCursor as string, direction: "after", limit: 2, onBeforeQuery: vi.fn(), order: parsed.order, plan, run: changedLimitRun })).resolves.toEqual({ items: [], nextCursor: null, previousCursor: null });
		expect(changedLimitRun).toHaveBeenCalledTimes(2);
	});

	it("treats a canonical unsigned cursor value as an opaque boundary rather than DTO input", async () => {
		const plan = compileCursorPlan();
		const parsed = ApiControllerGetListQueryRuntime.parse({ limit: 1 }, plan);

		if (!parsed.ast || !parsed.order) {
			throw new Error("Expected compiled cursor AST and order");
		}

		const contextHash = ApiControllerGetListCursorRuntime.createContextHash("cursor-items", undefined, plan, parsed.ast, parsed.order);
		const seed = await ApiControllerGetListCursorRuntime.execute({
			baseProperties: { where: {} },
			contextHash,
			limit: 1,
			onBeforeQuery: vi.fn(),
			order: parsed.order,
			plan,
			run: async (): Promise<Array<CursorQueryEntity>> => [{ id: CURSOR_ID_A, name: "A", rank: 1 } as CursorQueryEntity, { id: CURSOR_ID_B, name: "B", rank: 2 } as CursorQueryEntity],
		});
		const payload = JSON.parse(Buffer.from(seed.nextCursor as string, "base64url").toString("utf8")) as { c: string; v: number; values: Array<unknown> };

		payload.values[0] = 101;
		const forgedCursor = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
		const boundaryRun = vi.fn(async (): Promise<Array<CursorQueryEntity>> => []);

		await expect(ApiControllerGetListCursorRuntime.execute({ baseProperties: { where: {} }, contextHash, cursor: forgedCursor, direction: "after", limit: 1, onBeforeQuery: vi.fn(), order: parsed.order, plan, run: boundaryRun })).resolves.toEqual({ items: [], nextCursor: null, previousCursor: null });
		expect(boundaryRun).toHaveBeenCalledTimes(2);
	});

	it("accepts every canonical PostgreSQL UUID bit pattern and rejects malformed UUID wire values", async () => {
		const basePlan = compileCursorPlan();
		const baseField = basePlan.order.serverFields.id;

		if (!baseField) {
			throw new Error("Expected a compiled id order field");
		}

		const field: TApiControllerGetListQueryCompiledOrderField = Object.freeze({ ...baseField, metadata: Object.freeze({ description: "id", type: EApiPropertyDescribeType.UUID }), type: EApiPropertyDescribeType.UUID });
		const plan: TApiControllerGetListQueryCompiledPlan<EApiControllerGetListQueryPaginationMode.CURSOR> = Object.freeze({
			...basePlan,
			order: Object.freeze({ ...basePlan.order, fields: Object.freeze({ ...basePlan.order.fields, id: field }), serverFields: Object.freeze({ ...basePlan.order.serverFields, id: field }) }),
		});
		const parsed = ApiControllerGetListQueryRuntime.parse({ limit: 1 }, plan);

		if (!parsed.ast || !parsed.order) {
			throw new Error("Expected compiled cursor AST and order");
		}

		const contextHash = ApiControllerGetListCursorRuntime.createContextHash("cursor-items", undefined, plan, parsed.ast, parsed.order);
		const first = await ApiControllerGetListCursorRuntime.execute({
			baseProperties: { where: {} },
			contextHash,
			limit: 1,
			onBeforeQuery: vi.fn(),
			order: parsed.order,
			plan,
			run: async (): Promise<Array<CursorQueryEntity>> => [{ id: "00000000-0000-0000-0000-000000000001", name: "A", rank: 1 } as CursorQueryEntity, { id: "00000000-0000-0000-0000-000000000002", name: "B", rank: 2 } as CursorQueryEntity],
		});

		await expect(ApiControllerGetListCursorRuntime.execute({ baseProperties: { where: {} }, contextHash, cursor: first.nextCursor as string, direction: "after", limit: 1, onBeforeQuery: vi.fn(), order: parsed.order, plan, run: async (): Promise<Array<CursorQueryEntity>> => [] })).resolves.toBeDefined();
		const payload = JSON.parse(Buffer.from(first.nextCursor as string, "base64url").toString("utf8")) as { c: string; v: number; values: Array<unknown> };
		const idIndex = parsed.order.findIndex((entry): boolean => entry.field === "id");

		payload.values[idIndex] = "00000000-0000-0000-0000-00000000000g";
		const forgedCursor = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
		const rejectedRun = vi.fn(async (): Promise<Array<CursorQueryEntity>> => []);

		await expect(ApiControllerGetListCursorRuntime.execute({ baseProperties: { where: {} }, contextHash, cursor: forgedCursor, direction: "after", limit: 1, onBeforeQuery: vi.fn(), order: parsed.order, plan, run: rejectedRun })).rejects.toThrow("INVALID_CURSOR");
		expect(rejectedRun).not.toHaveBeenCalled();
	});

	it("reports invalid server order tuples as an internal invariant failure", async () => {
		const plan = compileCursorPlan();
		const parsed = ApiControllerGetListQueryRuntime.parse({ limit: 1 }, plan);

		if (!parsed.ast || !parsed.order) {
			throw new Error("Expected compiled cursor AST and order");
		}

		const contextHash = ApiControllerGetListCursorRuntime.createContextHash("cursor-items", undefined, plan, parsed.ast, parsed.order);

		await expect(
			ApiControllerGetListCursorRuntime.execute({
				baseProperties: { where: {} },
				contextHash,
				limit: 1,
				onBeforeQuery: vi.fn(),
				order: parsed.order,
				plan,
				run: async (): Promise<Array<CursorQueryEntity>> => [{ id: CURSOR_ID_A, name: "A", rank: Number.MAX_SAFE_INTEGER + 1 } as CursorQueryEntity, { id: CURSOR_ID_B, name: "B", rank: Number.MAX_SAFE_INTEGER + 2 } as CursorQueryEntity],
			}),
		).rejects.toThrow("result does not expose a valid protected raw order tuple");
	});
});
