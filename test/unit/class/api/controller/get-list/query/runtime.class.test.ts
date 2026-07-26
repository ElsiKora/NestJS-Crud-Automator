import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerGetListQueryAstNode, IApiControllerGetListQueryPlan, IApiControllerGetListQueryPlanFilterField } from "@interface/class/api/controller/get-list/query";
import type { IApiEntity } from "@interface/entity";
import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";
import type { FindOperator } from "typeorm";

import { ApiControllerGetListQueryPlanCompiler, ApiControllerGetListQueryRuntime } from "@class/api/controller/get-list/query";
import { DTO_GENERATE_CONSTANT } from "@constant/utility/dto/generate.constant";
import { EApiControllerGetListQueryFilterMissingBehavior, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import { EFilterOperation, EFilterOrderDirection } from "@enum/filter";
import { DtoGenerate } from "@utility/dto/generate/core.utility";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

import { TypedQueryController, TypedQueryEntity, TypedQueryNarrowController } from "./fixture";

const entityMetadata: IApiEntity<TypedQueryEntity> = GenerateEntityInformation<TypedQueryEntity>(TypedQueryEntity as unknown as IApiBaseEntity);

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

describe("typed GET_LIST query plan and runtime", () => {
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
});
