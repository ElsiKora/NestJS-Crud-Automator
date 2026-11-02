import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";

import { HttpStatus, ValidationPipe } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../src/index";
import { E2eInheritedOrderRecordController, E2eInheritedOrderRecordEntity, E2eInheritedOrderRecordService, E2eInheritedOrderStiChildController, E2eInheritedOrderStiChildEntity, E2eInheritedOrderStiChildService, E2eInheritedOrderStiRootEntity, E2eInheritedOrderTypedRecordController, E2eInheritedOrderTypedStiChildController } from "./inherited-order";

const getOrderByEnum = (document: OpenAPIObject, path: string): Array<unknown> | undefined => {
	const parameter: undefined | { schema?: { $ref?: string; enum?: Array<unknown> } } = (document.paths[path]?.get?.parameters as Array<{ name: string; schema?: { $ref?: string; enum?: Array<unknown> } }> | undefined)?.find((candidate: { name: string }): boolean => candidate.name === "orderBy");
	const reference: string | undefined = parameter?.schema?.$ref;

	return reference ? (document.components?.schemas?.[reference.split("/").at(-1) ?? ""] as { enum?: Array<unknown> } | undefined)?.enum : parameter?.schema?.enum;
};

interface IHostPipeCase {
	createPipe?: () => ValidationPipe;
	name: string;
}

const PAGE: string = "limit=10&page=1";
const RECORD_FIELDS: Array<string> = ["createdAt", "id", "label", "rank"];
const STI_CHILD_FIELDS: Array<string> = ["extra", "id", "name", "rank"];

describe.each([
	{ databaseName: "SQLite", isPostgres: false },
	{ databaseName: "PostgreSQL", isPostgres: true },
])("GET_LIST ordering by inherited columns on $databaseName (E2E)", ({ isPostgres }: { databaseName: string; isPostgres: boolean }) => {
	let container: StartedPostgreSqlContainer | undefined;

	beforeAll(async () => {
		if (isPostgres) {
			container = await new PostgreSqlContainer("postgres:17-alpine").start();
		}
	}, 120_000);

	afterAll(async () => {
		await container?.stop();
	});

	describe.each<IHostPipeCase>([{ name: "no host pipe" }, { createPipe: () => new ValidationPipe(), name: "a default host ValidationPipe" }])("with $name", ({ createPipe }: IHostPipeCase) => {
		let app: INestApplication | undefined;
		let document: OpenAPIObject;
		let fastify: { inject: (options: { method: string; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };

		beforeAll(async () => {
			const entities: Array<new () => unknown> = [E2eInheritedOrderRecordEntity, E2eInheritedOrderStiRootEntity, E2eInheritedOrderStiChildEntity];
			const moduleReference = await Test.createTestingModule({
				controllers: [E2eInheritedOrderRecordController, E2eInheritedOrderTypedRecordController, E2eInheritedOrderStiChildController, E2eInheritedOrderTypedStiChildController],
				imports: [TypeOrmModule.forRoot(container ? { dropSchema: true, entities, synchronize: true, type: "postgres", url: container.getConnectionUri() } : { database: ":memory:", dropSchema: true, entities, synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature(entities), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
				providers: [E2eInheritedOrderRecordService, E2eInheritedOrderStiChildService],
			}).compile();

			app = moduleReference.createNestApplication(new FastifyAdapter());

			if (createPipe) {
				app.useGlobalPipes(createPipe());
			}

			await app.init();
			fastify = app.getHttpAdapter().getInstance();
			document = SwaggerModule.createDocument(app, new DocumentBuilder().build());

			await app.get(E2eInheritedOrderRecordService).repository.save([
				{ label: "Alpha", rank: 2 },
				{ label: "Beta", rank: 1 },
			] as Array<E2eInheritedOrderRecordEntity>);
			await app.get(E2eInheritedOrderStiChildService).repository.save([
				{ extra: "x", name: "Zeta", rank: 1 },
				{ extra: "y", name: "Eta", rank: 2 },
			] as Array<E2eInheritedOrderStiChildEntity>);
		});

		afterAll(async () => {
			await app?.close();
		});

		const list = async <T>(url: string, key: keyof T): Promise<Array<unknown>> => {
			const response = await fastify.inject({ method: "GET", url });

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);

			return (response.json() as { items: Array<T> }).items.map((item: T): unknown => item[key]);
		};

		it.each(["/inherited-order/records", "/inherited-order/typed-records"])("lists the abstract base columns in the orderBy enum of %s", (path: string) => {
			expect(getOrderByEnum(document, path)?.toSorted()).toEqual(RECORD_FIELDS);
		});

		it.each(["/inherited-order/sti-children", "/inherited-order/typed-sti-children"])("lists the table inheritance root columns in the orderBy enum of %s", (path: string) => {
			expect(getOrderByEnum(document, path)?.toSorted()).toEqual(STI_CHILD_FIELDS);
		});

		it.each(["/inherited-order/records", "/inherited-order/typed-records"])("orders %s by abstract base columns", async (path: string) => {
			expect(await list<E2eInheritedOrderRecordEntity>(`${path}?${PAGE}&orderBy=rank&orderDirection=desc`, "label")).toEqual(["Alpha", "Beta"]);
			expect(await list<E2eInheritedOrderRecordEntity>(`${path}?${PAGE}&orderBy=rank&orderDirection=asc`, "label")).toEqual(["Beta", "Alpha"]);
			expect(await list<E2eInheritedOrderRecordEntity>(`${path}?${PAGE}&orderBy=createdAt&orderDirection=asc`, "label")).toHaveLength(2);
		});

		it.each(["/inherited-order/sti-children", "/inherited-order/typed-sti-children"])("orders %s by table inheritance root columns", async (path: string) => {
			expect(await list<E2eInheritedOrderStiChildEntity>(`${path}?${PAGE}&orderBy=name&orderDirection=asc`, "name")).toEqual(["Eta", "Zeta"]);
			expect(await list<E2eInheritedOrderStiChildEntity>(`${path}?${PAGE}&orderBy=rank&orderDirection=asc`, "name")).toEqual(["Zeta", "Eta"]);
		});
	});
});
