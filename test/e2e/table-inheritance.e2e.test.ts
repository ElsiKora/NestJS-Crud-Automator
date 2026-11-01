import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { DataSource } from "typeorm";

import { HttpStatus } from "@nestjs/common";
import { APP_PIPE } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { getDataSourceToken, TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../src/index";
import { TestAuthGuard } from "./app/auth-guard";
import { e2eHookPermissionSource } from "./app/hook-permission-source";
import { e2eAuthorizationPrincipalResolver } from "./app/principal-resolver";
import { E2eValidationPipe } from "./app/validation-pipe";
import { PaymentDetailBankTransferEntity } from "./table-inheritance/bank-transfer.entity";
import { PaymentDetailCardTransferEntity } from "./table-inheritance/card-transfer.entity";
import { PaymentDetailController } from "./table-inheritance/controller";
import { PaymentDetailCursorController } from "./table-inheritance/cursor.controller";
import { PaymentDetailFormFieldController } from "./table-inheritance/form-field.controller";
import { PaymentDetailFormFieldEntity } from "./table-inheritance/form-field.entity";
import { PaymentDetailFormFieldService } from "./table-inheritance/form-field.service";
import { PaymentDetailFormPostEntity } from "./table-inheritance/form-post.entity";
import { PaymentDetailIssuerEntity } from "./table-inheritance/issuer.entity";
import { EPaymentDetailKind } from "./table-inheritance/kind.enum";
import { PaymentDetailPolicy } from "./table-inheritance/policy";
import { PaymentDetailQrEntity } from "./table-inheritance/qr.entity";
import { PaymentDetailEntity } from "./table-inheritance/root.entity";
import { PaymentDetailService } from "./table-inheritance/service";
import { PaymentDetailTransferEntity } from "./table-inheritance/transfer.entity";

const OWNER_ID: string = "10000000-0000-4000-8000-000000000001";
const OTHER_OWNER_ID: string = "10000000-0000-4000-8000-000000000002";
const BANK_ID: string = "20000000-0000-4000-8000-000000000001";
const CARD_ID: string = "20000000-0000-4000-8000-000000000002";
const QR_ID: string = "20000000-0000-4000-8000-000000000003";
const FORM_ID: string = "20000000-0000-4000-8000-000000000004";
const FOREIGN_ID: string = "20000000-0000-4000-8000-000000000005";
const ISSUER_ID: string = "30000000-0000-4000-8000-000000000001";
const FIELD_A_ID: string = "40000000-0000-4000-8000-000000000001";
const FIELD_B_ID: string = "40000000-0000-4000-8000-000000000002";
const LEGACY_OWNER_ID: string = "10000000-0000-4000-8000-000000000003";
const LEGACY_ID: string = "20000000-0000-4000-8000-000000000006";

type TInjectResponse = { json: () => unknown; statusCode: number };
type TListResponse = { items: Array<Record<string, unknown>>; nextCursor?: null | string; previousCursor?: null | string; totalCount?: number };

describe("table inheritance read responses (E2E)", () => {
	let app: INestApplication | undefined;
	let container: StartedPostgreSqlContainer;
	let document: OpenAPIObject;
	let fastify: { inject: (options: { headers?: Record<string, string>; method: string; url: string }) => Promise<TInjectResponse> };

	const get = (url: string, ownerId: string = OWNER_ID): Promise<TInjectResponse> => fastify.inject({ headers: { "x-user-id": ownerId }, method: "GET", url });

	beforeAll(async () => {
		container = await new PostgreSqlContainer("postgres:17-alpine").start();
		const entities = [PaymentDetailEntity, PaymentDetailTransferEntity, PaymentDetailBankTransferEntity, PaymentDetailCardTransferEntity, PaymentDetailQrEntity, PaymentDetailFormPostEntity, PaymentDetailFormFieldEntity, PaymentDetailIssuerEntity];
		const moduleReference = await Test.createTestingModule({
			controllers: [PaymentDetailController, PaymentDetailCursorController, PaymentDetailFormFieldController],
			imports: [TypeOrmModule.forRoot({ dropSchema: true, entities, synchronize: true, type: "postgres", url: container.getConnectionUri() }), TypeOrmModule.forFeature(entities), ApiAuthorizationModule.forRoot({ hookPermissionSources: [e2eHookPermissionSource], principalResolver: e2eAuthorizationPrincipalResolver }), ApiSubscriberModule],
			providers: [{ provide: APP_PIPE, useClass: E2eValidationPipe }, PaymentDetailFormFieldService, PaymentDetailPolicy, PaymentDetailService, TestAuthGuard],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
		fastify = app.getHttpAdapter().getInstance();

		const dataSource: DataSource = app.get(getDataSourceToken());

		await dataSource.getRepository(PaymentDetailIssuerEntity).save({ id: ISSUER_ID, name: "Issuer" });
		await dataSource.getRepository(PaymentDetailBankTransferEntity).save({ accountNumber: "40817", bankName: "Bank", id: BANK_ID, label: "Bank", ownerId: OWNER_ID, rank: 1 });
		await dataSource.getRepository(PaymentDetailCardTransferEntity).save({ bankName: "Card bank", cardNumber: "4111", id: CARD_ID, issuer: { id: ISSUER_ID }, label: "Card", ownerId: OWNER_ID, rank: 2 });
		await dataSource.getRepository(PaymentDetailQrEntity).save({ id: QR_ID, label: "Qr", ownerId: OWNER_ID, qrPayload: "qr", rank: 3 });
		await dataSource.getRepository(PaymentDetailFormPostEntity).save({ actionUrl: "https://example.com", id: FORM_ID, label: "Form", ownerId: OWNER_ID, rank: 4 });
		await dataSource.getRepository(PaymentDetailQrEntity).save({ id: FOREIGN_ID, label: "Foreign", ownerId: OTHER_OWNER_ID, qrPayload: "foreign", rank: 5 });
		await dataSource.getRepository(PaymentDetailFormFieldEntity).save([
			{ detailId: FORM_ID, id: FIELD_A_ID, name: "amount" },
			{ detailId: FORM_ID, id: FIELD_B_ID, name: "currency" },
		]);
		await dataSource.query(`INSERT INTO "payment_details" ("id", "kind", "ownerId", "rank", "label") VALUES ($1, 'LEGACY', $2, 6, 'Legacy')`, [LEGACY_ID, LEGACY_OWNER_ID]);
	}, 120_000);

	afterAll(async () => {
		await app?.close();
		await container?.stop();
	});

	describe("GET", () => {
		it("serves the bank variant with root, intermediate and own columns", async () => {
			const response: TInjectResponse = await get(`/payment-details/${BANK_ID}`);

			expect(response.statusCode).toBe(HttpStatus.OK);
			expect(response.json()).toEqual({ accountNumber: "40817", bankName: "Bank", id: BANK_ID, kind: EPaymentDetailKind.BANK_TRANSFER, label: "Bank", ownerId: OWNER_ID, rank: 1 });
		});

		it("serves a to-one child relation through relations.response", async () => {
			const response: TInjectResponse = await get(`/payment-details/${CARD_ID}`);

			expect(response.statusCode).toBe(HttpStatus.OK);
			expect(response.json()).toEqual({ bankName: "Card bank", cardNumber: "4111", id: CARD_ID, issuer: { id: ISSUER_ID }, kind: EPaymentDetailKind.CARD_TRANSFER, label: "Card", ownerId: OWNER_ID, rank: 2 });
		});

		it("serves a variant without intermediate columns", async () => {
			const response: TInjectResponse = await get(`/payment-details/${QR_ID}`);

			expect(response.statusCode).toBe(HttpStatus.OK);
			expect(response.json()).toEqual({ id: QR_ID, kind: EPaymentDetailKind.QR, label: "Qr", ownerId: OWNER_ID, qrPayload: "qr", rank: 3 });
		});

		it("serves a to-many child relation through an eager OBJECT array on the variant DTO", async () => {
			const response: TInjectResponse = await get(`/payment-details/${FORM_ID}`);
			const body: Record<string, unknown> = response.json() as Record<string, unknown>;

			expect(response.statusCode).toBe(HttpStatus.OK);
			expect(body.actionUrl).toBe("https://example.com");
			expect((body.fields as Array<Record<string, unknown>>).toSorted((left, right) => String(left.name).localeCompare(String(right.name)))).toEqual([
				{ id: FIELD_A_ID, name: "amount" },
				{ id: FIELD_B_ID, name: "currency" },
			]);
		});

		it("keeps the HOOKS scope on root columns", async () => {
			const response: TInjectResponse = await get(`/payment-details/${FOREIGN_ID}`);

			expect(response.statusCode).toBe(HttpStatus.NOT_FOUND);
		});

		it("fails closed on a row without a variant", async () => {
			const response: TInjectResponse = await get(`/payment-details/${LEGACY_ID}`, LEGACY_OWNER_ID);

			expect(response.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
			expect(JSON.stringify(response.json())).not.toContain(EPaymentDetailKind.LEGACY);
		});
	});

	describe("GET_LIST page", () => {
		it("serves mixed rows in their variant shape under the owner scope", async () => {
			const response: TInjectResponse = await get("/payment-details?limit=10&page=1");
			const body: TListResponse = response.json() as TListResponse;

			expect(response.statusCode).toBe(HttpStatus.OK);
			expect(body.totalCount).toBe(4);
			expect(body.items.map(({ id }) => id)).toEqual([BANK_ID, CARD_ID, QR_ID, FORM_ID]);
			expect(body.items[0]).toEqual({ accountNumber: "40817", bankName: "Bank", id: BANK_ID, kind: EPaymentDetailKind.BANK_TRANSFER, label: "Bank", ownerId: OWNER_ID, rank: 1 });
			expect(body.items[1]).toEqual({ bankName: "Card bank", cardNumber: "4111", id: CARD_ID, issuer: { id: ISSUER_ID }, kind: EPaymentDetailKind.CARD_TRANSFER, label: "Card", ownerId: OWNER_ID, rank: 2 });
			expect(body.items[2]).toEqual({ id: QR_ID, kind: EPaymentDetailKind.QR, label: "Qr", ownerId: OWNER_ID, qrPayload: "qr", rank: 3 });
			expect((body.items[3]?.fields as Array<unknown>).length).toBe(2);
		});

		it("filters and orders by root columns", async () => {
			const response: TInjectResponse = await get(`/payment-details?limit=10&page=1&kind[operator]=eq&kind[value]=${EPaymentDetailKind.QR}`);
			const body: TListResponse = response.json() as TListResponse;

			expect(response.statusCode).toBe(HttpStatus.OK);
			expect(body.items.map(({ id }) => id)).toEqual([QR_ID]);
		});

		it("rejects a filter on a child column", async () => {
			const response: TInjectResponse = await get("/payment-details?limit=10&page=1&cardNumber[operator]=eq&cardNumber[value]=4111");

			expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
		});

		it("fails closed when the page holds a row without a variant", async () => {
			const response: TInjectResponse = await get("/payment-details?limit=10&page=1", LEGACY_OWNER_ID);

			expect(response.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
			expect(JSON.stringify(response.json())).not.toContain(EPaymentDetailKind.LEGACY);
		});
	});

	describe("GET_LIST cursor", () => {
		it("walks mixed rows forward and backward in their variant shape", async () => {
			const firstResponse: TInjectResponse = await get("/payment-details-cursor?limit=2");
			const first: TListResponse = firstResponse.json() as TListResponse;

			expect(firstResponse.statusCode).toBe(HttpStatus.OK);
			expect(first.items).toEqual([
				{ accountNumber: "40817", bankName: "Bank", id: BANK_ID, kind: EPaymentDetailKind.BANK_TRANSFER, label: "Bank", ownerId: OWNER_ID, rank: 1 },
				{ bankName: "Card bank", cardNumber: "4111", id: CARD_ID, kind: EPaymentDetailKind.CARD_TRANSFER, label: "Card", ownerId: OWNER_ID, rank: 2 },
			]);

			const secondResponse: TInjectResponse = await get(`/payment-details-cursor?limit=2&after=${String(first.nextCursor)}`);
			const second: TListResponse = secondResponse.json() as TListResponse;

			expect(secondResponse.statusCode).toBe(HttpStatus.OK);
			expect(second.items.map(({ id }) => id)).toEqual([QR_ID, FORM_ID]);
			expect(second.nextCursor).toBeNull();

			const backResponse: TInjectResponse = await get(`/payment-details-cursor?limit=2&before=${String(second.previousCursor)}`);

			expect((backResponse.json() as TListResponse).items.map(({ id }) => id)).toEqual([BANK_ID, CARD_ID]);
		});

		it("fails closed on a row without a variant", async () => {
			const response: TInjectResponse = await get("/payment-details-cursor?limit=2", LEGACY_OWNER_ID);

			expect(response.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
			expect(JSON.stringify(response.json())).not.toContain(EPaymentDetailKind.LEGACY);
		});
	});

	describe("child table controller", () => {
		it("serves form fields of one detail through the read scope", async () => {
			const response: TInjectResponse = await fastify.inject({ method: "GET", url: `/payment-details/${FORM_ID}/form-fields?limit=10&page=1` });
			const body: TListResponse = response.json() as TListResponse;

			expect(response.statusCode).toBe(HttpStatus.OK);
			expect(body.items.map(({ id }) => id)).toEqual([FIELD_A_ID, FIELD_B_ID]);
		});

		it("returns nothing for another detail", async () => {
			const response: TInjectResponse = await fastify.inject({ method: "GET", url: `/payment-details/${QR_ID}/form-fields?limit=10&page=1` });

			expect((response.json() as TListResponse).items).toEqual([]);
		});
	});

	describe("storage", () => {
		it("keeps the Postgres enum and CHECK constraint in force", async () => {
			const dataSource: DataSource = (app as INestApplication).get(getDataSourceToken());

			await expect(dataSource.query(`INSERT INTO "payment_details" ("id", "kind", "ownerId", "rank", "label") VALUES ($1, 'NOT_A_KIND', $2, 1, 'Bad')`, [FOREIGN_ID.replace("5", "9"), OWNER_ID])).rejects.toThrow(/invalid input value for enum/);
			await expect(dataSource.query(`INSERT INTO "payment_details" ("id", "kind", "ownerId", "rank", "label") VALUES ($1, 'CARD_TRANSFER', $2, 1, 'Bad')`, [FOREIGN_ID.replace("5", "8"), OWNER_ID])).rejects.toThrow(/payment_detail_card_number_check/);
		});
	});

	describe("Swagger", () => {
		const responseSchema = (path: string): Record<string, unknown> => (document.paths[path]?.get?.responses["200"] as unknown as { content: Record<string, { schema: Record<string, unknown> }> }).content["application/json"]?.schema as Record<string, unknown>;
		const componentSchema = (reference: unknown): Record<string, unknown> => document.components?.schemas?.[String(reference).replace("#/components/schemas/", "")] as Record<string, unknown>;

		it("describes GET as oneOf with a discriminator mapping", () => {
			const schema: Record<string, unknown> = responseSchema("/payment-details/{id}");

			expect(schema.oneOf).toHaveLength(4);
			expect(schema.discriminator).toEqual({
				mapping: {
					[EPaymentDetailKind.BANK_TRANSFER]: "#/components/schemas/PaymentDetailGetResponseBankTransferDTO",
					[EPaymentDetailKind.CARD_TRANSFER]: "#/components/schemas/PaymentDetailGetResponseCardTransferDTO",
					[EPaymentDetailKind.FORM_POST]: "#/components/schemas/PaymentDetailGetResponseFormPostDTO",
					[EPaymentDetailKind.QR]: "#/components/schemas/PaymentDetailGetResponseQrDTO",
				},
				propertyName: "kind",
			});
		});

		it("registers every GET variant with its own fields", () => {
			const schemas: Record<string, unknown> = document.components?.schemas as Record<string, unknown>;
			const card: { properties: Record<string, unknown> } = schemas.PaymentDetailGetResponseCardTransferDTO as { properties: Record<string, unknown> };

			expect(Object.keys(card.properties)).toEqual(expect.arrayContaining(["bankName", "cardNumber", "id", "kind"]));
			expect(Object.keys(card.properties)).not.toContain("qrPayload");
			expect(schemas.PaymentDetailGetResponseQrDTO).toBeDefined();
			expect((card.properties.issuer as { allOf: Array<{ $ref: string }> }).allOf).toEqual([{ $ref: "#/components/schemas/PaymentDetailGetResponseCardTransferIssuerDTO" }]);
			expect(schemas.PaymentDetailGetResponseCardTransferIssuerDTO).toBeDefined();
		});

		it("describes page list items as oneOf with a discriminator mapping", () => {
			const schema: Record<string, unknown> = responseSchema("/payment-details");
			const wrapper: { properties: { items: { discriminator: { mapping: Record<string, string>; propertyName: string }; items: { oneOf?: Array<unknown> }; oneOf?: Array<unknown>; type: string } } } = componentSchema(schema.$ref) as never;

			expect(schema.$ref).toBe("#/components/schemas/PaymentDetailGetListResponseItemsDTO");
			expect(wrapper.properties.items.type).toBe("array");
			expect(wrapper.properties.items.items.oneOf).toHaveLength(4);
			expect(wrapper.properties.items.discriminator.propertyName).toBe("kind");
			expect(wrapper.properties.items.discriminator.mapping[EPaymentDetailKind.QR]).toBe("#/components/schemas/PaymentDetailGetListResponseQrDTO");
		});

		it("registers every model a discriminator mapping points to", () => {
			const listWrapper: { properties: { items: { discriminator: { mapping: Record<string, string> } } } } = componentSchema(responseSchema("/payment-details").$ref) as never;
			const cursorWrapper: { properties: { items: { discriminator: { mapping: Record<string, string> } } } } = componentSchema(responseSchema("/payment-details-cursor").$ref) as never;
			const getMapping: Record<string, string> = (responseSchema("/payment-details/{id}").discriminator as { mapping: Record<string, string> }).mapping;

			for (const reference of [...Object.values(getMapping), ...Object.values(listWrapper.properties.items.discriminator.mapping), ...Object.values(cursorWrapper.properties.items.discriminator.mapping)]) {
				expect(componentSchema(reference)).toBeDefined();
			}
		});

		it("describes cursor list items as oneOf", () => {
			const schema: Record<string, unknown> = responseSchema("/payment-details-cursor");
			const wrapper: { properties: { items: { items: { oneOf?: Array<unknown> } } } } = componentSchema(schema.$ref) as never;

			expect(schema.$ref).toBe("#/components/schemas/PaymentDetailCursorGetListCursorResponseItemsDTO");
			expect(wrapper.properties.items.items.oneOf).toHaveLength(4);
		});
	});
});
