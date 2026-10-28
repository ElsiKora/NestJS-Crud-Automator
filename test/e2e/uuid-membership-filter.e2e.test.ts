import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";
import type { SchemaObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";

import { HttpStatus } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule, EFilterOperation } from "../../src/index";
import { E2eUuidCurrencyEntity, E2eUuidCurrencyService, E2eUuidMembershipController, E2eUuidTransactionEntity, E2eUuidTransactionService } from "./uuid-membership";

const CURRENCY_USD: string = "11111111-1111-4111-8111-111111111111";
const CURRENCY_EUR: string = "22222222-2222-4222-8222-222222222222";
const CURRENCY_GBP: string = "33333333-3333-4333-8333-333333333333";
const TRANSACTION_A: string = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TRANSACTION_B: string = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const TRANSACTION_C: string = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const TRANSACTION_D: string = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

describe("UUID membership GET_LIST filters (E2E)", () => {
	let app: INestApplication | undefined;
	let document: OpenAPIObject;
	let fastify: {
		inject: (options: { method: string; url: string }) => Promise<{ json: () => unknown; statusCode: number }>;
	};

	const listIds = async (query: string): Promise<{ ids: Array<string>; statusCode: number }> => {
		const response = await fastify.inject({ method: "GET", url: `/uuid-membership-transactions?limit=10&page=1&orderBy=label&orderDirection=ASC&${query}` });
		const body = response.json() as { items?: Array<{ id: string }> };

		return { ids: (body.items ?? []).map((item: { id: string }): string => item.id), statusCode: response.statusCode };
	};

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
					type: "sqlite",
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
		fastify = app.getHttpAdapter().getInstance();

		await app.get(E2eUuidCurrencyService).repository.save([
			{ code: "USD", id: CURRENCY_USD },
			{ code: "EUR", id: CURRENCY_EUR },
			{ code: "GBP", id: CURRENCY_GBP },
		]);
		await app.get(E2eUuidTransactionService).repository.save([
			{ currencyId: CURRENCY_USD, id: TRANSACTION_A, label: "a" },
			{ currencyId: CURRENCY_EUR, id: TRANSACTION_B, label: "b" },
			{ currencyId: CURRENCY_GBP, id: TRANSACTION_C, label: "c" },
			{ currencyId: CURRENCY_USD, id: TRANSACTION_D, label: "d" },
		]);
	});

	afterAll(async () => {
		await app?.close();
	});

	it("returns only rows whose one-hop relation id is a member", async () => {
		const result = await listIds(`currency.id[operator]=in&currency.id[values]=${CURRENCY_USD}&currency.id[values]=${CURRENCY_EUR}`);

		expect(result.statusCode).toBe(HttpStatus.OK);
		expect(result.ids).toEqual([TRANSACTION_A, TRANSACTION_B, TRANSACTION_D]);
	});

	it("accepts a single relation id member", async () => {
		const result = await listIds(`currency.id[operator]=in&currency.id[values]=${CURRENCY_GBP}`);

		expect(result.statusCode).toBe(HttpStatus.OK);
		expect(result.ids).toEqual([TRANSACTION_C]);
	});

	it("excludes members with notin on the relation path", async () => {
		const result = await listIds(`currency.id[operator]=notin&currency.id[values]=${CURRENCY_USD}&currency.id[values]=${CURRENCY_EUR}`);

		expect(result.statusCode).toBe(HttpStatus.OK);
		expect(result.ids).toEqual([TRANSACTION_C]);
	});

	it("filters the direct primary id by membership", async () => {
		const result = await listIds(`id[operator]=in&id[values]=${TRANSACTION_B}&id[values]=${TRANSACTION_D}`);

		expect(result.statusCode).toBe(HttpStatus.OK);
		expect(result.ids).toEqual([TRANSACTION_B, TRANSACTION_D]);
	});

	it("rejects a non-uuid member", async () => {
		const result = await listIds(`currency.id[operator]=in&currency.id[values]=${CURRENCY_USD}&currency.id[values]=not-a-uuid`);

		expect(result.statusCode).toBe(HttpStatus.BAD_REQUEST);
	});

	it("rejects notin where the route allows only in", async () => {
		const result = await listIds(`id[operator]=notin&id[values]=${TRANSACTION_A}`);

		expect(result.statusCode).toBe(HttpStatus.BAD_REQUEST);
	});

	it("lists the membership operators in Swagger for the relation path", () => {
		const parameters = document.paths["/uuid-membership-transactions"]?.get?.parameters ?? [];
		const currencyFilter = parameters.find((parameter) => "name" in parameter && parameter.name === "currency.id");
		const currencySchema = currencyFilter && !("$ref" in currencyFilter) && currencyFilter.schema && !("$ref" in currencyFilter.schema) ? currencyFilter.schema : undefined;
		const operators: Array<string> = (currencySchema?.oneOf ?? [])
			.filter((branch): branch is SchemaObject => !("$ref" in branch))
			.flatMap((branch: SchemaObject): Array<string> => {
				const operator = branch.properties?.operator;

				return operator !== undefined && !("$ref" in operator) ? ((operator.enum ?? []) as Array<string>) : [];
			});

		expect(currencyFilter).toMatchObject({ explode: true, in: "query", name: "currency.id", style: "deepObject" });
		expect(operators.toSorted()).toEqual([EFilterOperation.IN, EFilterOperation.NOTIN]);
	});
});
