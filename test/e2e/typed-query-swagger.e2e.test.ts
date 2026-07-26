import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";
import type { SchemaObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";

import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { EFilterOperation } from "../../src/index";
import { E2eAppModule } from "./app";
import { E2eNarrowTypedQueryController } from "./app/typed-query/narrow";

describe("typed GET_LIST Swagger contract (E2E)", () => {
	let app: INestApplication | undefined;
	let document: OpenAPIObject;

	beforeAll(async () => {
		const moduleReference = await Test.createTestingModule({
			controllers: [E2eNarrowTypedQueryController],
			imports: [E2eAppModule],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
	});

	afterAll(async () => {
		await app?.close();
	});

	it("emits deep-object oneOf filters and controller-plan-scoped query schemas", () => {
		const operation = document.paths["/typed-items"]?.get;
		const parameters = operation?.parameters ?? [];
		const narrowParameters = document.paths["/narrow-typed-items"]?.get?.parameters ?? [];
		const countFilter = parameters.find((parameter) => "name" in parameter && parameter.name === "count");
		const nameFilter = parameters.find((parameter) => "name" in parameter && parameter.name === "name");
		const orderBy = parameters.find((parameter) => "name" in parameter && parameter.name === "orderBy");
		const countSchema = countFilter && !("$ref" in countFilter) && countFilter.schema && !("$ref" in countFilter.schema) ? countFilter.schema : undefined;
		const countBranches: Array<SchemaObject> = (countSchema?.oneOf ?? []).filter((branch): branch is SchemaObject => !("$ref" in branch));
		const findCountBranch = (operation: EFilterOperation): SchemaObject | undefined =>
			countBranches.find((branch: SchemaObject): boolean => {
				const operator = branch.properties?.operator;

				return operator !== undefined && !("$ref" in operator) && operator.enum?.includes(operation) === true;
			});
		const betweenBranch: SchemaObject | undefined = findCountBranch(EFilterOperation.BETWEEN);
		const equalBranch: SchemaObject | undefined = findCountBranch(EFilterOperation.EQ);
		const greaterThanBranch: SchemaObject | undefined = findCountBranch(EFilterOperation.GT);

		expect(countFilter).toMatchObject({
			explode: true,
			in: "query",
			name: "count",
			style: "deepObject",
		});
		expect(countBranches).toHaveLength(3);
		expect(betweenBranch).toMatchObject({
			additionalProperties: false,
			properties: {
				values: {
					maxItems: 2,
					minItems: 2,
				},
			},
			required: expect.arrayContaining(["operator", "values"]),
		});
		expect(equalBranch?.properties).toHaveProperty("value");
		expect(equalBranch?.properties).not.toHaveProperty("values");
		expect(greaterThanBranch?.properties).toHaveProperty("value");
		expect(greaterThanBranch?.properties).not.toHaveProperty("values");
		expect(nameFilter).toMatchObject({
			required: true,
		});
		expect(JSON.stringify(nameFilter)).toContain('"minItems":1');
		expect(JSON.stringify(nameFilter)).toContain('"maxItems":100');
		expect(parameters.find((parameter) => "name" in parameter && parameter.name === "code")).toBeUndefined();
		expect(parameters.find((parameter) => "name" in parameter && parameter.name === "name[operator]")).toBeUndefined();
		expect(parameters.find((parameter) => "name" in parameter && parameter.name === "name[value]")).toBeUndefined();
		expect(parameters.find((parameter) => "name" in parameter && parameter.name === "name[values]")).toBeUndefined();
		expect(orderBy).toMatchObject({
			schema: expect.objectContaining({
				enum: ["count", "name"],
			}),
		});
		expect(narrowParameters).toEqual(expect.arrayContaining([expect.objectContaining({ name: "name" }), expect.objectContaining({ name: "orderBy", schema: expect.objectContaining({ enum: ["name"] }) })]));
		expect(narrowParameters).not.toEqual(expect.arrayContaining([expect.objectContaining({ name: "count" })]));

		const schemas = document.components?.schemas ?? {};
		const typedQuerySchemaNames: Array<string> = Object.keys(schemas).filter((name: string): boolean => name.includes("E2eTypedQueryController") && name.endsWith("DTO"));
		const narrowQuerySchemaNames: Array<string> = Object.keys(schemas).filter((name: string): boolean => name.includes("E2eNarrowTypedQueryController") && name.endsWith("DTO"));
		const typedQuerySchema = schemas[typedQuerySchemaNames[0] ?? ""];
		const typedQuerySchemaProperties = typedQuerySchema && !("$ref" in typedQuerySchema) ? (typedQuerySchema.properties ?? {}) : {};

		expect(typedQuerySchemaNames).toHaveLength(1);
		expect(narrowQuerySchemaNames).toHaveLength(1);
		expect(typedQuerySchemaNames[0]).not.toBe(narrowQuerySchemaNames[0]);
		expect(typedQuerySchemaProperties).not.toHaveProperty("name[operator]");
		expect(typedQuerySchemaProperties).not.toHaveProperty("name[value]");
		expect(typedQuerySchemaProperties).not.toHaveProperty("name[values]");
	});
});
