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
import { E2eToManyCursorChildEntity, E2eToManyCursorParentController, E2eToManyCursorParentEntity, E2eToManyCursorParentService } from "./to-many-relation-response";

describe("To-many response relations on CURSOR GET_LIST (E2E)", () => {
	let app: INestApplication | undefined;
	let container: StartedPostgreSqlContainer | undefined;
	let fastify: { inject: (options: { method: string; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };
	let childIds: Array<string>;

	beforeAll(async () => {
		container = await new PostgreSqlContainer("postgres:17-alpine").start();

		const moduleReference = await Test.createTestingModule({
			controllers: [E2eToManyCursorParentController],
			imports: [
				TypeOrmModule.forRoot({
					dropSchema: true,
					entities: [E2eToManyCursorChildEntity, E2eToManyCursorParentEntity],
					synchronize: true,
					type: "postgres",
					url: container.getConnectionUri(),
				}),
				TypeOrmModule.forFeature([E2eToManyCursorParentEntity]),
				ApiAuthorizationModule.forRoot(),
				ApiSubscriberModule,
			],
			providers: [E2eToManyCursorParentService],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		fastify = app.getHttpAdapter().getInstance();

		const { manager } = app.get(E2eToManyCursorParentService).repository;
		const parent: E2eToManyCursorParentEntity = await manager.save(E2eToManyCursorParentEntity, { rank: 1 });

		await manager.save(E2eToManyCursorParentEntity, { rank: 2 });

		const children: Array<E2eToManyCursorChildEntity> = await manager.save(E2eToManyCursorChildEntity, [{ parent }, { parent }]);

		childIds = children.map((child: E2eToManyCursorChildEntity): string => child.id);
	}, 120_000);

	afterAll(async () => {
		await app?.close();
		await container?.stop();
	});

	it("projects to-many relations inside the flat cursor envelope", async () => {
		const response = await fastify.inject({ method: "GET", url: "/to-many-cursor-parents?limit=10" });
		const body = response.json() as { items: Array<{ children: Array<unknown> }> };

		expect(response.statusCode).toBe(HttpStatus.OK);
		expect(Object.keys(body).toSorted()).toEqual(["items", "nextCursor", "previousCursor"]);
		expect(body.items[0]?.children).toHaveLength(2);
		expect(body.items[0]?.children).toEqual(expect.arrayContaining(childIds.map((id: string): { id: string } => ({ id }))));
		expect(body.items[1]?.children).toEqual([]);
	});
});
