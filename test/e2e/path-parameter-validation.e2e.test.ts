import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { TSwaggerSchemaObject } from "@type/swagger";
import type { Logger } from "typeorm";

import { HttpStatus } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../src/index";
import { E2E_PATH_PARAMETER_INT_MAXIMUM, E2ePathParameterGroupIntItemController, E2ePathParameterIntItemController, E2ePathParameterIntItemEntity, E2ePathParameterIntItemService, E2ePathParameterOwnerUuidItemController, E2ePathParameterUuidItemController, E2ePathParameterUuidItemEntity, E2ePathParameterUuidItemService } from "./path-parameter";

interface IPathParameterCase {
	method: "DELETE" | "GET" | "PATCH" | "PUT";
	name: string;
	payload?: Record<string, unknown>;
	url: string;
}

class PathParameterQueryLogger implements Logger {
	public readonly queries: Array<string> = [];

	public log(): void {}

	public logMigration(): void {}

	public logQuery(query: string): void {
		this.queries.push(query);
	}

	public logQueryError(_error: Error | string, query: string): void {
		this.queries.push(query);
	}

	public logQuerySlow(): void {}

	public logSchemaBuild(): void {}
}

const OWNER_ID: string = "11111111-1111-4111-8111-111111111111";
const UUID_ITEM_ID: string = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MISSING_UUID_ITEM_ID: string = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const GROUP_NUMBER: number = 7;
const OUT_OF_RANGE_INT: string = String(E2E_PATH_PARAMETER_INT_MAXIMUM + 1);
const LIST_QUERY: string = "limit=10&page=1&orderBy=label&orderDirection=ASC";
const WRITE_PAYLOAD: Record<string, unknown> = { label: "Renamed" };

const buildRowCases = (resource: string, value: string): Array<IPathParameterCase> => [
	{ method: "GET", name: `GET /${resource}/${value}`, url: `/path-parameter/${resource}/${value}` },
	{ method: "PUT", name: `PUT /${resource}/${value}`, payload: WRITE_PAYLOAD, url: `/path-parameter/${resource}/${value}` },
	{ method: "PATCH", name: `PATCH /${resource}/${value}`, payload: WRITE_PAYLOAD, url: `/path-parameter/${resource}/${value}` },
	{ method: "DELETE", name: `DELETE /${resource}/${value}`, url: `/path-parameter/${resource}/${value}` },
];

const REJECTED_CASES: Array<IPathParameterCase> = [
	...buildRowCases("uuid-items", "not-a-uuid"),
	...buildRowCases("int-items", "abc"),
	...buildRowCases("int-items", OUT_OF_RANGE_INT),
	{ method: "GET", name: "GET_LIST owner scope not-a-uuid", url: `/path-parameter/owners/not-a-uuid/uuid-items?${LIST_QUERY}` },
	{ method: "GET", name: "GET owner scope not-a-uuid", url: `/path-parameter/owners/not-a-uuid/uuid-items/${UUID_ITEM_ID}` },
	{ method: "GET", name: "GET owner scope valid owner, not-a-uuid id", url: `/path-parameter/owners/${OWNER_ID}/uuid-items/not-a-uuid` },
	{ method: "GET", name: "GET_LIST group scope abc", url: `/path-parameter/groups/abc/int-items?${LIST_QUERY}` },
	{ method: "GET", name: `GET_LIST group scope ${OUT_OF_RANGE_INT}`, url: `/path-parameter/groups/${OUT_OF_RANGE_INT}/int-items?${LIST_QUERY}` },
	{ method: "GET", name: "GET group scope abc", url: `/path-parameter/groups/abc/int-items/1` },
];

describe.each([
	{ databaseName: "SQLite", isPostgres: false },
	{ databaseName: "PostgreSQL", isPostgres: true },
])("generated path parameter validation on $databaseName (E2E)", ({ isPostgres }: { databaseName: string; isPostgres: boolean }) => {
	let app: INestApplication | undefined;
	let container: StartedPostgreSqlContainer | undefined;
	let document: OpenAPIObject;
	let intItemId: number;
	const queryLogger: PathParameterQueryLogger = new PathParameterQueryLogger();
	let fastify: {
		inject: (options: { method: string; payload?: Record<string, unknown>; url: string }) => Promise<{ json: () => unknown; statusCode: number }>;
	};

	beforeAll(async () => {
		if (isPostgres) {
			container = await new PostgreSqlContainer("postgres:17-alpine").start();
		}

		const entities: Array<new () => unknown> = [E2ePathParameterIntItemEntity, E2ePathParameterUuidItemEntity];
		const moduleReference = await Test.createTestingModule({
			controllers: [E2ePathParameterUuidItemController, E2ePathParameterIntItemController, E2ePathParameterOwnerUuidItemController, E2ePathParameterGroupIntItemController],
			imports: [TypeOrmModule.forRoot(container ? { dropSchema: true, entities, logger: queryLogger, logging: ["query", "error"], synchronize: true, type: "postgres", url: container.getConnectionUri() } : { database: ":memory:", dropSchema: true, entities, logger: queryLogger, logging: ["query", "error"], synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature(entities), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
			providers: [E2ePathParameterIntItemService, E2ePathParameterUuidItemService],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
		fastify = app.getHttpAdapter().getInstance();
	}, 120_000);

	beforeEach(async () => {
		const uuidRepository = app!.get(E2ePathParameterUuidItemService).repository;
		const intRepository = app!.get(E2ePathParameterIntItemService).repository;

		await uuidRepository.clear();
		await intRepository.clear();
		await uuidRepository.save({ id: UUID_ITEM_ID, label: "Uuid", ownerId: OWNER_ID });
		intItemId = (await intRepository.save({ groupNumber: GROUP_NUMBER, label: "Int" })).id;
		queryLogger.queries.length = 0;
	});

	afterAll(async () => {
		await app?.close();
		await container?.stop();
	});

	it.each(REJECTED_CASES)("rejects $name with 400 before any query", async ({ method, payload, url }: IPathParameterCase) => {
		const response = await fastify.inject({ method, payload, url });

		expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
		expect(response.json()).toMatchObject({ message: "INVALID_PARAMETERS", statusCode: HttpStatus.BAD_REQUEST });
		expect(queryLogger.queries).toEqual([]);
	});

	it("still queries for a well-formed uuid that does not exist", async () => {
		const response = await fastify.inject({ method: "GET", url: `/path-parameter/uuid-items/${MISSING_UUID_ITEM_ID}` });

		expect(response.statusCode).toBe(HttpStatus.NOT_FOUND);
		expect(queryLogger.queries.length).toBeGreaterThan(0);
	});

	it("reads, updates and deletes rows addressed by valid path values", async () => {
		const uuidResponse = await fastify.inject({ method: "GET", url: `/path-parameter/uuid-items/${UUID_ITEM_ID}` });
		const intResponse = await fastify.inject({ method: "GET", url: `/path-parameter/int-items/${String(intItemId)}` });
		const patchResponse = await fastify.inject({ method: "PATCH", payload: WRITE_PAYLOAD, url: `/path-parameter/int-items/${String(intItemId)}` });
		const deleteResponse = await fastify.inject({ method: "DELETE", url: `/path-parameter/uuid-items/${UUID_ITEM_ID}` });

		expect(uuidResponse.statusCode).toBe(HttpStatus.OK);
		expect(uuidResponse.json()).toMatchObject({ id: UUID_ITEM_ID });
		expect(intResponse.statusCode).toBe(HttpStatus.OK);
		expect(intResponse.json()).toMatchObject({ id: intItemId });
		expect(patchResponse.statusCode).toBe(HttpStatus.OK);
		expect(patchResponse.json()).toMatchObject({ id: intItemId, label: "Renamed" });
		expect(deleteResponse.statusCode).toBe(HttpStatus.NO_CONTENT);
	});

	it("reads through valid controller-path scope parameters", async () => {
		const ownerList = await fastify.inject({ method: "GET", url: `/path-parameter/owners/${OWNER_ID}/uuid-items?${LIST_QUERY}` });
		const groupItem = await fastify.inject({ method: "GET", url: `/path-parameter/groups/${String(GROUP_NUMBER)}/int-items/${String(intItemId)}` });
		const otherGroupItem = await fastify.inject({ method: "GET", url: `/path-parameter/groups/${String(GROUP_NUMBER + 1)}/int-items/${String(intItemId)}` });

		expect(ownerList.statusCode).toBe(HttpStatus.OK);
		expect((ownerList.json() as { items: Array<{ id: string }> }).items.map((item: { id: string }): string => item.id)).toEqual([UUID_ITEM_ID]);
		expect(groupItem.statusCode).toBe(HttpStatus.OK);
		expect(otherGroupItem.statusCode).toBe(HttpStatus.NOT_FOUND);
	});

	it("documents the path parameter type and format in OpenAPI", () => {
		const findPathParameter = (path: string, method: "delete" | "get" | "patch" | "put", name: string): TSwaggerSchemaObject | undefined => {
			const parameter = (document.paths[path]?.[method]?.parameters ?? []).find((candidate) => "name" in candidate && candidate.name === name && candidate.in === "path");

			return parameter && !("$ref" in parameter) && parameter.schema && !("$ref" in parameter.schema) ? parameter.schema : undefined;
		};

		for (const method of ["get", "put", "patch", "delete"] as const) {
			expect(findPathParameter("/path-parameter/uuid-items/{id}", method, "id")).toMatchObject({ format: "uuid", type: "string" });
			expect(findPathParameter("/path-parameter/int-items/{id}", method, "id")).toMatchObject({ format: "int32", maximum: E2E_PATH_PARAMETER_INT_MAXIMUM, minimum: 1, type: "integer" });
		}

		expect(findPathParameter("/path-parameter/owners/{ownerId}/uuid-items", "get", "ownerId")).toMatchObject({ format: "uuid", type: "string" });
		expect(findPathParameter("/path-parameter/owners/{ownerId}/uuid-items/{id}", "get", "ownerId")).toMatchObject({ format: "uuid", type: "string" });
		expect(findPathParameter("/path-parameter/groups/{group}/int-items", "get", "group")).toMatchObject({ format: "int32", maximum: E2E_PATH_PARAMETER_INT_MAXIMUM, minimum: 1, type: "integer" });
	});
});
