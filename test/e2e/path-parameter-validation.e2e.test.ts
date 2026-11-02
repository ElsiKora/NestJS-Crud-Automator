import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { TSwaggerSchemaObject } from "@type/swagger";
import type { Logger } from "typeorm";

import { HttpStatus, ValidationPipe } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule, CorrelationIDResponseBodyInterceptor } from "../../src/index";
import {
	buildE2ePathParameterConsumerPipe,
	E2E_PATH_PARAMETER_INT_MAXIMUM,
	E2E_PATH_PARAMETER_SUBSCRIBER_TRACE,
	E2ePathParameterDayItemController,
	E2ePathParameterDayItemEntity,
	E2ePathParameterDayItemService,
	E2ePathParameterGroupIntItemController,
	E2ePathParameterIntItemController,
	E2ePathParameterIntItemEntity,
	E2ePathParameterIntItemService,
	E2ePathParameterIntItemSubscriber,
	E2ePathParameterManualUuidItemController,
	E2ePathParameterOwnerUuidItemController,
	E2ePathParameterTransformedUuidItemController,
	E2ePathParameterUuidItemController,
	E2ePathParameterUuidItemEntity,
	E2ePathParameterUuidItemService,
} from "./path-parameter";

interface IPathParameterCase {
	message: string;
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
const SCOPE_DAY: string = "2024-03-10";
const TIME_ZONES: Array<string> = ["UTC", "America/New_York", "Asia/Tokyo"];
const NON_CANONICAL_INTEGERS: Array<string> = ["016", "%2016", "0x10", "16.0", "1.6e1", "1e3", "007"];
const CONTROLLERS: Array<new () => unknown> = [E2ePathParameterUuidItemController, E2ePathParameterIntItemController, E2ePathParameterOwnerUuidItemController, E2ePathParameterGroupIntItemController, E2ePathParameterDayItemController, E2ePathParameterTransformedUuidItemController, E2ePathParameterManualUuidItemController];
const PROVIDERS: Array<new () => unknown> = [E2ePathParameterIntItemService, E2ePathParameterUuidItemService, E2ePathParameterDayItemService, E2ePathParameterIntItemSubscriber];

const NOT_UUID_MESSAGE: (property: string) => string = (property: string): string => `${property} must be a UUID`;
const NOT_INTEGER_MESSAGE: (property: string) => string = (property: string): string => `${property} must be an integer number`;
const TOO_LARGE_MESSAGE: (property: string) => string = (property: string): string => `${property} must not be greater than ${String(E2E_PATH_PARAMETER_INT_MAXIMUM)}`;
const NOT_DATE_MESSAGE: (property: string) => string = (property: string): string => `${property} must be a valid ISO 8601 date string`;

const buildRowCases = (resource: string, value: string, message: string): Array<IPathParameterCase> => [
	{ message, method: "GET", name: `GET /${resource}/${value}`, url: `/path-parameter/${resource}/${value}` },
	{ message, method: "PUT", name: `PUT /${resource}/${value}`, payload: WRITE_PAYLOAD, url: `/path-parameter/${resource}/${value}` },
	{ message, method: "PATCH", name: `PATCH /${resource}/${value}`, payload: WRITE_PAYLOAD, url: `/path-parameter/${resource}/${value}` },
	{ message, method: "DELETE", name: `DELETE /${resource}/${value}`, url: `/path-parameter/${resource}/${value}` },
];

const REJECTED_CASES: Array<IPathParameterCase> = [
	...buildRowCases("uuid-items", "not-a-uuid", NOT_UUID_MESSAGE("id")),
	...buildRowCases("int-items", "abc", NOT_INTEGER_MESSAGE("id")),
	...buildRowCases("int-items", OUT_OF_RANGE_INT, TOO_LARGE_MESSAGE("id")),
	{ message: NOT_UUID_MESSAGE("ownerId"), method: "GET", name: "GET_LIST owner scope not-a-uuid", url: `/path-parameter/owners/not-a-uuid/uuid-items?${LIST_QUERY}` },
	{ message: NOT_UUID_MESSAGE("ownerId"), method: "GET", name: "GET owner scope not-a-uuid", url: `/path-parameter/owners/not-a-uuid/uuid-items/${UUID_ITEM_ID}` },
	{ message: NOT_UUID_MESSAGE("id"), method: "GET", name: "GET owner scope valid owner, not-a-uuid id", url: `/path-parameter/owners/${OWNER_ID}/uuid-items/not-a-uuid` },
	{ message: NOT_INTEGER_MESSAGE("group"), method: "GET", name: "GET_LIST group scope abc", url: `/path-parameter/groups/abc/int-items?${LIST_QUERY}` },
	{ message: TOO_LARGE_MESSAGE("group"), method: "GET", name: `GET_LIST group scope ${OUT_OF_RANGE_INT}`, url: `/path-parameter/groups/${OUT_OF_RANGE_INT}/int-items?${LIST_QUERY}` },
	{ message: NOT_INTEGER_MESSAGE("group"), method: "GET", name: "GET group scope abc", url: `/path-parameter/groups/abc/int-items/1` },
	...NON_CANONICAL_INTEGERS.map((value: string): IPathParameterCase => ({ message: NOT_INTEGER_MESSAGE("id"), method: "GET", name: `GET /int-items/${value}`, url: `/path-parameter/int-items/${value}` })),
	{ message: NOT_INTEGER_MESSAGE("group"), method: "GET", name: "GET_LIST group scope 007", url: `/path-parameter/groups/007/int-items?${LIST_QUERY}` },
	{ message: NOT_DATE_MESSAGE("day"), method: "GET", name: "GET_LIST day scope not-a-date", url: `/path-parameter/days/not-a-date/day-items?${LIST_QUERY}` },
	{ message: NOT_DATE_MESSAGE("day"), method: "GET", name: "GET_LIST day scope 2024-02-30", url: `/path-parameter/days/2024-02-30/day-items?${LIST_QUERY}` },
	{ message: NOT_UUID_MESSAGE("id"), method: "GET", name: "GET with a PARAMETERS transformer that writes a non-uuid", url: `/path-parameter/transformed-uuid-items/${UUID_ITEM_ID}` },
	{ message: NOT_UUID_MESSAGE("id"), method: "GET", name: "GET with a configured PARAMETERS DTO", url: `/path-parameter/manual-uuid-items/not-a-uuid` },
];

describe.each([
	{ databaseName: "SQLite", isPostgres: false },
	{ databaseName: "PostgreSQL", isPostgres: true },
])("generated path parameter validation on $databaseName (E2E)", ({ isPostgres }: { databaseName: string; isPostgres: boolean }) => {
	let app: INestApplication | undefined;
	let pipeApp: INestApplication | undefined;
	let consumerApp: INestApplication | undefined;
	let container: StartedPostgreSqlContainer | undefined;
	let document: OpenAPIObject;
	let intItemId: number;
	let dayItemId: number;
	const queryLogger: PathParameterQueryLogger = new PathParameterQueryLogger();
	let fastify: {
		inject: (options: { method: string; payload?: Record<string, unknown>; url: string }) => Promise<{ json: () => unknown; statusCode: number }>;
	};
	let pipeFastify: typeof fastify;
	let consumerFastify: typeof fastify;

	beforeAll(async () => {
		if (isPostgres) {
			container = await new PostgreSqlContainer("postgres:17-alpine").start();
		}

		const entities: Array<new () => unknown> = [E2ePathParameterIntItemEntity, E2ePathParameterUuidItemEntity, E2ePathParameterDayItemEntity];
		const moduleReference = await Test.createTestingModule({
			controllers: CONTROLLERS,
			imports: [TypeOrmModule.forRoot(container ? { dropSchema: true, entities, logger: queryLogger, logging: ["query", "error"], synchronize: true, type: "postgres", url: container.getConnectionUri() } : { database: ":memory:", dropSchema: true, entities, logger: queryLogger, logging: ["query", "error"], synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature(entities), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
			providers: PROVIDERS,
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		app.useGlobalInterceptors(new CorrelationIDResponseBodyInterceptor());
		await app.init();
		document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
		fastify = app.getHttpAdapter().getInstance();

		const pipeModuleReference = await Test.createTestingModule({
			controllers: CONTROLLERS,
			imports: [TypeOrmModule.forRoot(container ? { entities, type: "postgres", url: container.getConnectionUri() } : { database: ":memory:", entities, type: "better-sqlite3" }), TypeOrmModule.forFeature(entities), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
			providers: PROVIDERS,
		}).compile();

		pipeApp = pipeModuleReference.createNestApplication(new FastifyAdapter());
		pipeApp.useGlobalInterceptors(new CorrelationIDResponseBodyInterceptor());
		pipeApp.useGlobalPipes(new ValidationPipe({ transform: true }));
		await pipeApp.init();
		pipeFastify = pipeApp.getHttpAdapter().getInstance();

		const consumerModuleReference = await Test.createTestingModule({
			controllers: CONTROLLERS,
			imports: [TypeOrmModule.forRoot(container ? { entities, logger: queryLogger, logging: ["query", "error"], type: "postgres", url: container.getConnectionUri() } : { database: ":memory:", entities, logger: queryLogger, logging: ["query", "error"], synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature(entities), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
			providers: PROVIDERS,
		}).compile();

		consumerApp = consumerModuleReference.createNestApplication(new FastifyAdapter());
		consumerApp.useGlobalInterceptors(new CorrelationIDResponseBodyInterceptor());
		consumerApp.useGlobalPipes(buildE2ePathParameterConsumerPipe());
		await consumerApp.init();
		consumerFastify = consumerApp.getHttpAdapter().getInstance();
	}, 120_000);

	beforeEach(async () => {
		const uuidRepository = app!.get(E2ePathParameterUuidItemService).repository;
		const intRepository = app!.get(E2ePathParameterIntItemService).repository;
		const dayRepository = app!.get(E2ePathParameterDayItemService).repository;

		await uuidRepository.clear();
		await intRepository.clear();
		await dayRepository.clear();
		await uuidRepository.save({ id: UUID_ITEM_ID, label: "Uuid", ownerId: OWNER_ID });
		intItemId = (await intRepository.save({ groupNumber: GROUP_NUMBER, label: "Int" })).id;
		dayItemId = (await dayRepository.save({ day: SCOPE_DAY, label: "Day" })).id;
		queryLogger.queries.length = 0;
		E2E_PATH_PARAMETER_SUBSCRIBER_TRACE.length = 0;
	});

	afterAll(async () => {
		await consumerApp?.close();
		await pipeApp?.close();
		await app?.close();
		await container?.stop();
	});

	it.each(REJECTED_CASES)("rejects $name with 400 before any query", async ({ message, method, payload, url }: IPathParameterCase) => {
		const response = await fastify.inject({ method, payload, url });

		expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
		expect(response.json()).toEqual({ correlationID: expect.any(String), error: "Bad Request", message: expect.arrayContaining([message]), statusCode: HttpStatus.BAD_REQUEST, timestamp: expect.any(Number) });
		expect(queryLogger.queries).toEqual([]);
	});

	it.each(REJECTED_CASES)("answers $name with the body a host ValidationPipe returns", async ({ method, payload, url }: IPathParameterCase) => {
		const omitPerRequestFields = (body: unknown): Record<string, unknown> => {
			const { correlationID: _correlationID, timestamp: _timestamp, ...rest } = body as Record<string, unknown>;

			return rest;
		};
		const response = await fastify.inject({ method, payload, url });
		const pipeResponse = await pipeFastify.inject({ method, payload, url });

		expect(pipeResponse.statusCode).toBe(HttpStatus.BAD_REQUEST);
		expect(response.statusCode).toBe(pipeResponse.statusCode);
		expect(Object.keys(response.json() as object).toSorted()).toEqual(Object.keys(pipeResponse.json() as object).toSorted());
		expect(omitPerRequestFields(response.json())).toEqual(omitPerRequestFields(pipeResponse.json()));
	});

	it.each(REJECTED_CASES)("rejects $name with 400 before any query under a consumer pipe", async ({ method, payload, url }: IPathParameterCase) => {
		const response = await consumerFastify.inject({ method, payload, url });

		expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
		expect(queryLogger.queries).toEqual([]);
	});

	it("reads, updates and deletes rows addressed by valid path values under a consumer pipe", async () => {
		await consumerApp!.get(E2ePathParameterUuidItemService).repository.save({ id: UUID_ITEM_ID, label: "Uuid", ownerId: OWNER_ID });
		const consumerIntItemId: number = (await consumerApp!.get(E2ePathParameterIntItemService).repository.save({ groupNumber: GROUP_NUMBER, label: "Int" })).id;
		const uuidResponse = await consumerFastify.inject({ method: "GET", url: `/path-parameter/uuid-items/${UUID_ITEM_ID}` });
		const intResponse = await consumerFastify.inject({ method: "GET", url: `/path-parameter/int-items/${String(consumerIntItemId)}` });
		const patchResponse = await consumerFastify.inject({ method: "PATCH", payload: WRITE_PAYLOAD, url: `/path-parameter/int-items/${String(consumerIntItemId)}` });
		const deleteResponse = await consumerFastify.inject({ method: "DELETE", url: `/path-parameter/uuid-items/${UUID_ITEM_ID}` });

		expect(uuidResponse.statusCode).toBe(HttpStatus.OK);
		expect(uuidResponse.json()).toMatchObject({ id: UUID_ITEM_ID });
		expect(intResponse.statusCode).toBe(HttpStatus.OK);
		expect(intResponse.json()).toMatchObject({ id: consumerIntItemId });
		expect(patchResponse.statusCode).toBe(HttpStatus.OK);
		expect(patchResponse.json()).toMatchObject({ id: consumerIntItemId, label: "Renamed" });
		expect(deleteResponse.statusCode).toBe(HttpStatus.NO_CONTENT);
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

	it("hands typed path values to route subscribers and the raw value to BEFORE_ERROR when the check fails", async () => {
		const validResponse = await fastify.inject({ method: "GET", url: `/path-parameter/int-items/${String(intItemId)}` });

		expect(validResponse.statusCode).toBe(HttpStatus.OK);
		// Both test applications register the subscriber, so only the distinct entries are compared.
		expect([...new Set(E2E_PATH_PARAMETER_SUBSCRIBER_TRACE)]).toEqual(["before:number"]);

		E2E_PATH_PARAMETER_SUBSCRIBER_TRACE.length = 0;
		const invalidResponse = await fastify.inject({ method: "GET", url: "/path-parameter/int-items/abc" });

		expect(invalidResponse.statusCode).toBe(HttpStatus.BAD_REQUEST);
		expect([...new Set(E2E_PATH_PARAMETER_SUBSCRIBER_TRACE)]).toEqual(["beforeError:string"]);
	});

	it.each(TIME_ZONES)("binds a date-only scope value as the same day in %s", async (timeZone: string) => {
		const previousTimeZone: string | undefined = process.env.TZ;
		process.env.TZ = timeZone;

		try {
			// Guards against a runtime that ignores the change: New York sees the UTC midnight of SCOPE_DAY on the day before.
			expect(new Date(SCOPE_DAY).getDate()).toBe(timeZone === "America/New_York" ? 9 : 10);

			const list = await fastify.inject({ method: "GET", url: `/path-parameter/days/${SCOPE_DAY}/day-items?${LIST_QUERY}` });
			const item = await fastify.inject({ method: "GET", url: `/path-parameter/days/${SCOPE_DAY}/day-items/${String(dayItemId)}` });
			const otherDayItem = await fastify.inject({ method: "GET", url: `/path-parameter/days/2024-03-09/day-items/${String(dayItemId)}` });

			expect(list.statusCode).toBe(HttpStatus.OK);
			expect((list.json() as { items: Array<{ id: number }> }).items.map((row: { id: number }): number => row.id)).toEqual([dayItemId]);
			expect(item.statusCode).toBe(HttpStatus.OK);
			expect(item.json()).toMatchObject({ id: dayItemId });
			expect(otherDayItem.statusCode).toBe(HttpStatus.NOT_FOUND);
		} finally {
			if (previousTimeZone === undefined) {
				delete process.env.TZ;
			} else {
				process.env.TZ = previousTimeZone;
			}
		}
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
