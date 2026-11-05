import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerGetListQueryPlan, IApiControllerGetListQueryPlanFilterField } from "@interface/class/api/controller/get-list/query";
import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";
import type { DataSourceOptions, FindOperator, FindOptionsWhere, ObjectLiteral } from "typeorm";

import { ApiControllerGetListQueryPlanCompiler, ApiControllerGetListQueryRelationFilterSubquery } from "@class/api/controller/get-list/query";
import { FILTER_OPERATOR_REGISTRY_CONSTANT } from "@constant/filter";
import { EApiControllerRequestTarget, EApiRouteType } from "@enum/decorator/api";
import { EFilterOperation } from "@enum/filter";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { And, DataSource } from "typeorm";
import { describe, expect, it } from "vitest";

import { RELATION_FILTER_ENTITIES, RELATION_FILTER_GAME_FILTER, RELATION_FILTER_INVERSE_FILTER, RELATION_FILTER_TAGGED_FILTER, RelationFilterGameEntity, RelationFilterInverseGameEntity, RelationFilterTaggedGameEntity } from "../../../../../../e2e/relation-filter";

class RelationFilterPinController {}

const PROVIDER_ID: string = "c0000000-0000-4000-8000-000000000001";
const CATEGORY_ID: string = "b0000000-0000-4000-8000-000000000001";
const OTHER_CATEGORY_ID: string = "b0000000-0000-4000-8000-000000000002";

// MariaDB runs on the mysql driver, which writes the same text for both.
const DIALECTS: ReadonlyArray<{ name: string; options: Record<string, unknown> }> = [
	{ name: "postgres", options: { database: "pin", type: "postgres" } },
	{ name: "mysql", options: { connectorPackage: "mysql2", database: "pin", driver: { isStub: true }, type: "mysql" } },
	{ name: "sqlite", options: { database: ":memory:", type: "better-sqlite3" } },
];

const compilePlan = (entity: new () => object, filter: unknown): IApiControllerGetListQueryPlan => ApiControllerGetListQueryPlanCompiler.compile(RelationFilterPinController, entity, GenerateEntityInformation<IApiBaseEntity>(entity as unknown as IApiBaseEntity), { request: { [EApiControllerRequestTarget.QUERY]: { filter } } } as unknown as TApiControllerPropertiesRoute<IApiBaseEntity, EApiRouteType.GET_LIST>) as IApiControllerGetListQueryPlan;

const CASES: ReadonlyArray<{ entity: new () => object; filter: unknown; operation: EFilterOperation; operand: unknown; path: string }> = [
	{ entity: RelationFilterGameEntity, filter: RELATION_FILTER_GAME_FILTER, operand: PROVIDER_ID, operation: EFilterOperation.EQ, path: "gameSource.provider.id" },
	{ entity: RelationFilterGameEntity, filter: RELATION_FILTER_GAME_FILTER, operand: [PROVIDER_ID], operation: EFilterOperation.IN, path: "gameSource.provider.id" },
	{ entity: RelationFilterGameEntity, filter: RELATION_FILTER_GAME_FILTER, operand: CATEGORY_ID, operation: EFilterOperation.EQ, path: "category.id" },
	{ entity: RelationFilterGameEntity, filter: RELATION_FILTER_GAME_FILTER, operand: [CATEGORY_ID, OTHER_CATEGORY_ID], operation: EFilterOperation.IN, path: "category.id" },
	{ entity: RelationFilterGameEntity, filter: RELATION_FILTER_GAME_FILTER, operand: CATEGORY_ID, operation: EFilterOperation.EQ, path: "featuredCategory.id" },
	{ entity: RelationFilterInverseGameEntity, filter: RELATION_FILTER_INVERSE_FILTER, operand: CATEGORY_ID, operation: EFilterOperation.EQ, path: "categoryLinks.category.id" },
	{ entity: RelationFilterTaggedGameEntity, filter: RELATION_FILTER_TAGGED_FILTER, operand: CATEGORY_ID, operation: EFilterOperation.EQ, path: "categories.id" },
];

describe("relation filter SQL", () => {
	it.each(DIALECTS.map((dialect: (typeof DIALECTS)[number]): string => dialect.name))("stays what it was on %s", async (name: string) => {
		const options: Record<string, unknown> = DIALECTS.find((dialect: (typeof DIALECTS)[number]): boolean => dialect.name === name)?.options ?? {};
		const dataSource: DataSource = new DataSource({ ...options, entities: RELATION_FILTER_ENTITIES } as unknown as DataSourceOptions);

		await (dataSource as unknown as { buildMetadatas: () => Promise<void> }).buildMetadatas();

		const compile = ({ entity, filter, operand, operation, path }: (typeof CASES)[number]): { key: string; operator: FindOperator<unknown> } => ApiControllerGetListQueryRelationFilterSubquery.compile(compilePlan(entity, filter).filter.fields[path] as IApiControllerGetListQueryPlanFilterField, FILTER_OPERATOR_REGISTRY_CONSTANT.OPERATORS[operation].compile(operand, dataSource.options.type), dataSource.getRepository(entity as new () => ObjectLiteral), "route");

		const render = (entity: new () => object, where: unknown): { parameters: Array<unknown>; sql: string } => {
			const [sql, parameters]: [string, Array<unknown>] = dataSource
				.getRepository(entity as new () => ObjectLiteral)
				.createQueryBuilder()
				.setFindOptions({ where: where as FindOptionsWhere<ObjectLiteral> })
				.getQueryAndParameters();

			return { parameters, sql };
		};

		const rendered: Array<unknown> = CASES.map((testCase: (typeof CASES)[number]): unknown => {
			const { key, operator }: { key: string; operator: FindOperator<unknown> } = compile(testCase);

			return { operation: testCase.operation, path: testCase.path, query: render(testCase.entity, { [key]: operator }) };
		});
		const [providerCase, , categoryCase]: ReadonlyArray<(typeof CASES)[number]> = CASES;
		const together = render(RelationFilterGameEntity, { id: And(compile(providerCase as (typeof CASES)[number]).operator, compile(categoryCase as (typeof CASES)[number]).operator) });

		await expect(JSON.stringify({ rendered, together }, undefined, "\t")).toMatchFileSnapshot(`./relation-filter-sql-pin/${name}.snapshot.txt`);
	});
});
