import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { TestingModule } from "@nestjs/testing";
import type { TypeOrmModuleOptions } from "@nestjs/typeorm";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { DataSource } from "typeorm";

import { HttpStatus } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { getDataSourceToken, TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../src/index";
import { RequestRelationCardEntity } from "./table-inheritance-request-relation/card.entity";
import { RequestRelationDetailController } from "./table-inheritance-request-relation/controller";
import { RequestRelationIssuerEntity } from "./table-inheritance-request-relation/issuer.entity";
import { RequestRelationIssuerService } from "./table-inheritance-request-relation/issuer.service";
import { RequestRelationOwnerEntity } from "./table-inheritance-request-relation/owner.entity";
import { RequestRelationOwnerService } from "./table-inheritance-request-relation/owner.service";
import { RequestRelationDetailEntity } from "./table-inheritance-request-relation/root.entity";
import { RequestRelationDetailService } from "./table-inheritance-request-relation/service";

const OWNER_ID: string = "80000000-0000-4000-8000-000000000001";
const DETAIL_ID: string = "80000000-0000-4000-8000-000000000002";

const CHILD_ONLY_MESSAGE: string = `Controller RequestRelationChildKeyController route create relations.request key "issuer" is declared only on child entity ${RequestRelationCardEntity.name} of table inheritance root ${RequestRelationDetailEntity.name}. Declare the relation on ${RequestRelationDetailEntity.name} or use a controller for ${RequestRelationCardEntity.name}.`;

const entities = [RequestRelationDetailEntity, RequestRelationCardEntity, RequestRelationOwnerEntity, RequestRelationIssuerEntity];

describe.each([
	{ databaseName: "SQLite", isPostgres: false },
	{ databaseName: "PostgreSQL", isPostgres: true },
])("table inheritance request relations on $databaseName (E2E)", ({ isPostgres }: { databaseName: string; isPostgres: boolean }) => {
	let app: INestApplication | undefined;
	let container: StartedPostgreSqlContainer | undefined;
	let fastify: { inject: (options: { method: string; payload?: Record<string, unknown>; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };

	const typeOrmOptions = (): TypeOrmModuleOptions => (container ? { dropSchema: true, entities, synchronize: true, type: "postgres", url: container.getConnectionUri() } : { database: ":memory:", dropSchema: true, entities, synchronize: true, type: "better-sqlite3" });

	beforeAll(async () => {
		if (isPostgres) {
			container = await new PostgreSqlContainer("postgres:17-alpine").start();
		}

		const moduleReference: TestingModule = await Test.createTestingModule({
			controllers: [RequestRelationDetailController],
			imports: [TypeOrmModule.forRoot(typeOrmOptions()), TypeOrmModule.forFeature(entities), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
			providers: [RequestRelationDetailService, RequestRelationOwnerService],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		fastify = app.getHttpAdapter().getInstance();

		await app.get<DataSource>(getDataSourceToken()).getRepository(RequestRelationOwnerEntity).save({ id: OWNER_ID, name: "Owner" });
	}, 120_000);

	afterAll(async () => {
		await app?.close();
		await container?.stop();
	});

	it("loads a relation declared on the root through relations.request", async () => {
		const response = await fastify.inject({ method: "POST", payload: { id: DETAIL_ID, kind: "CARD", label: "Card", owner: OWNER_ID }, url: "/sti-request-relation-details" });

		expect(response.statusCode).toBe(HttpStatus.CREATED);

		const stored: RequestRelationDetailEntity | null = await app!
			.get<DataSource>(getDataSourceToken())
			.getRepository(RequestRelationDetailEntity)
			.findOne({ relations: { owner: true }, where: { id: DETAIL_ID } });

		expect(stored?.owner).toEqual({ id: OWNER_ID, name: "Owner" });
	});

	it("fails bootstrap for a relations.request key declared only on a child entity", async () => {
		const bootstrap = async (): Promise<TestingModule> => {
			const { RequestRelationChildKeyController } = await import("./table-inheritance-request-relation/child-key.controller");

			return await Test.createTestingModule({
				controllers: [RequestRelationChildKeyController],
				imports: [TypeOrmModule.forRoot(typeOrmOptions()), TypeOrmModule.forFeature(entities), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
				providers: [RequestRelationDetailService, RequestRelationIssuerService],
			}).compile();
		};

		await expect(bootstrap()).rejects.toThrow(CHILD_ONLY_MESSAGE);
	});

	it.each([
		{ controllerFile: "nested-key.controller", exportName: "RequestRelationNestedKeyController", owner: "Controller RequestRelationNestedKeyController route create" },
		{ controllerFile: "custom-route.controller", exportName: "RequestRelationCustomRouteController", owner: "Custom route RequestRelationCustomRouteController.create" },
	])("fails application bootstrap for a nested key on $exportName", async ({ controllerFile, exportName, owner }: { controllerFile: string; exportName: string; owner: string }) => {
		const controllers: Record<string, new () => unknown> = (await import(`./table-inheritance-request-relation/${controllerFile}.ts`)) as Record<string, new () => unknown>;
		const moduleReference: TestingModule = await Test.createTestingModule({
			controllers: [controllers[exportName] as new () => unknown],
			imports: [TypeOrmModule.forRoot(typeOrmOptions()), TypeOrmModule.forFeature(entities), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
			providers: [RequestRelationDetailService, RequestRelationOwnerService],
		}).compile();
		const failingApp: INestApplication = moduleReference.createNestApplication(new FastifyAdapter());

		await expect(failingApp.init()).rejects.toThrow(`${owner} relations.request key "owner.bogus" is not a relation on ${RequestRelationOwnerEntity.name}`);
		await moduleReference.close();
	});
});
