import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";

import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../src/index";
import { E2eUuidCurrencyEntity, E2eUuidCurrencyService, E2eUuidMembershipController, E2eUuidTransactionEntity, E2eUuidTransactionService } from "./uuid-membership";

describe("OpenAPI of a typed GET_LIST route without a relation filter", () => {
	let app: INestApplication | undefined;
	let document: OpenAPIObject;

	beforeAll(async () => {
		const moduleReference = await Test.createTestingModule({
			controllers: [E2eUuidMembershipController],
			imports: [
				TypeOrmModule.forRoot({
					database: ":memory:",
					dropSchema: true,
					entities: [E2eUuidCurrencyEntity, E2eUuidTransactionEntity],
					logging: false,
					synchronize: true,
					type: "better-sqlite3",
				}),
				TypeOrmModule.forFeature([E2eUuidCurrencyEntity, E2eUuidTransactionEntity]),
				ApiAuthorizationModule.forRoot(),
				ApiSubscriberModule,
			],
			providers: [E2eUuidCurrencyService, E2eUuidTransactionService],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
	});

	afterAll(async () => {
		await app?.close();
	});

	it("stays byte-identical, generated schema names included", async () => {
		await expect(JSON.stringify(document, undefined, "\t")).toMatchFileSnapshot("./typed-list-openapi-pin/uuid-membership.snapshot.txt");
	});
});
