import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";

import { HttpStatus } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../src/index";
import { E2eInheritedNullableCursorItemController, E2eInheritedNullableItemController, E2eInheritedNullableItemEntity, E2eInheritedNullableItemService } from "./inherited-nullable";

const CURSOR_PATH: string = "/inherited-nullable/cursor-items?limit=10";
const PAGE_PATH: string = "/inherited-nullable/items?limit=10&page=1&orderBy=position&orderDirection=asc";

describe.each([
	{ databaseName: "SQLite", isPostgres: false },
	{ databaseName: "PostgreSQL", isPostgres: true },
])("GET_LIST null checks on inherited nullable columns on $databaseName (E2E)", ({ isPostgres }: { databaseName: string; isPostgres: boolean }) => {
	let app: INestApplication | undefined;
	let container: StartedPostgreSqlContainer | undefined;
	let fastify: { inject: (options: { method: string; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };

	beforeAll(async () => {
		container = isPostgres ? await new PostgreSqlContainer("postgres:17-alpine").start() : undefined;
		const entities: Array<new () => unknown> = [E2eInheritedNullableItemEntity];
		const moduleReference = await Test.createTestingModule({
			controllers: [E2eInheritedNullableItemController, E2eInheritedNullableCursorItemController],
			imports: [TypeOrmModule.forRoot(container ? { dropSchema: true, entities, synchronize: true, type: "postgres", url: container.getConnectionUri() } : { database: ":memory:", dropSchema: true, entities, synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature(entities), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
			providers: [E2eInheritedNullableItemService],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		fastify = app.getHttpAdapter().getInstance();

		await app.get(E2eInheritedNullableItemService).repository.save([
			{ id: 1, label: "One", position: 3 },
			{ archivedAt: new Date("2026-02-01T00:00:00.000Z"), deletedAt: new Date("2026-03-01T00:00:00.000Z"), id: 2, label: "Two", position: 1 },
			{ deletedAt: new Date("2026-03-02T00:00:00.000Z"), id: 3, label: "Three", position: 2 },
		] as Array<E2eInheritedNullableItemEntity>);
	}, 120_000);

	afterAll(async () => {
		await app?.close();
		await container?.stop();
	});

	const listIds = async (url: string): Promise<Array<number>> => {
		const response = await fastify.inject({ method: "GET", url });

		expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);

		return (response.json() as { items: Array<{ id: number }> }).items.map(({ id }: { id: number }): number => Number(id));
	};

	it("filters a PAGE list by a nullable column an abstract base declares", async () => {
		expect(await listIds(`${PAGE_PATH}&deletedAt[operator]=isnull`)).toEqual([1]);
		expect(await listIds(`${PAGE_PATH}&deletedAt[operator]=notnull`)).toEqual([2, 3]);
	});

	it("filters a PAGE list by a nullable column a mixin declares", async () => {
		expect(await listIds(`${PAGE_PATH}&archivedAt[operator]=isnull`)).toEqual([3, 1]);
		expect(await listIds(`${PAGE_PATH}&archivedAt[operator]=notnull`)).toEqual([2]);
	});

	it.runIf(isPostgres)("filters a CURSOR list by a nullable column an abstract base declares", async () => {
		expect(await listIds(`${CURSOR_PATH}&deletedAt[operator]=isnull`)).toEqual([1]);
		expect(await listIds(`${CURSOR_PATH}&deletedAt[operator]=notnull`)).toEqual([2, 3]);
	});

	it.runIf(isPostgres)("filters a CURSOR list by a nullable column a mixin declares", async () => {
		expect(await listIds(`${CURSOR_PATH}&archivedAt[operator]=isnull`)).toEqual([3, 1]);
		expect(await listIds(`${CURSOR_PATH}&archivedAt[operator]=notnull`)).toEqual([2]);
	});
});
