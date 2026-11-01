import type { INestApplication } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { DataSource } from "typeorm";

import { APP_PIPE } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { getDataSourceToken, TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../src/index";

import { TestAuthGuard } from "./app/auth-guard";
import { e2eAuthorizationPrincipalResolver } from "./app/principal-resolver";
import { E2eValidationPipe } from "./app/validation-pipe";
import { IntegrationDetailCardEntity } from "./table-inheritance-integration/card.entity";
import { IntegrationDetailController } from "./table-inheritance-integration/controller";
import { IntegrationDetailCursorController } from "./table-inheritance-integration/cursor.controller";
import { IntegrationDetailFormEntity } from "./table-inheritance-integration/form.entity";
import { integrationDetailAttachmentSource, integrationDetailDocumentSource } from "./table-inheritance-integration/iam";
import { IntegrationDetailIssuerEntity } from "./table-inheritance-integration/issuer.entity";
import { IntegrationDetailNetworkEntity } from "./table-inheritance-integration/network.entity";
import { IntegrationDetailNoteEntity } from "./table-inheritance-integration/note.entity";
import { IntegrationDetailEntity } from "./table-inheritance-integration/root.entity";
import { IntegrationDetailScalarController } from "./table-inheritance-integration/scalar.controller";
import { IntegrationDetailService } from "./table-inheritance-integration/service";
import { IntegrationDetailRouteSubscriber } from "./table-inheritance-integration/subscriber";
import { IntegrationDetailTagEntity } from "./table-inheritance-integration/tag.entity";
import { IntegrationDetailVendorEntity } from "./table-inheritance-integration/vendor.entity";

import "reflect-metadata";

const OPERATOR_ID: string = "operator-1";
const OTHER_OPERATOR_ID: string = "operator-2";
const CARD_ID: string = "50000000-0000-4000-8000-000000000001";
const FORM_ID: string = "50000000-0000-4000-8000-000000000002";
const FOREIGN_ID: string = "50000000-0000-4000-8000-000000000003";
const VENDOR_ID: string = "60000000-0000-4000-8000-000000000001";
const NETWORK_ID: string = "60000000-0000-4000-8000-000000000002";
const ISSUER_ID: string = "60000000-0000-4000-8000-000000000003";
const TAG_ID: string = "70000000-0000-4000-8000-000000000001";
const NOTE_A_ID: string = "70000000-0000-4000-8000-000000000002";
const NOTE_B_ID: string = "70000000-0000-4000-8000-000000000003";

type TInjectResponse = { json: () => unknown; statusCode: number };
type TListResponse = { items: Array<Record<string, unknown>>; nextCursor?: null | string; previousCursor?: null | string; totalCount?: number };

const CARD_RESPONSE: Record<string, unknown> = {
	cardNumber: "4111",
	id: CARD_ID,
	issuer: { id: ISSUER_ID },
	items: null,
	kind: "CARD",
	label: "seen-Card",
	network: { id: NETWORK_ID },
	operatorId: OPERATOR_ID,
	rank: 1,
	tags: [{ id: TAG_ID, name: "tag" }],
	vendor: { id: VENDOR_ID },
};

const FORM_RESPONSE: Record<string, unknown> = {
	actionUrl: "https://example.com",
	id: FORM_ID,
	items: null,
	kind: "FORM",
	label: "seen-Form",
	notes: [
		{ id: NOTE_A_ID, name: "a" },
		{ id: NOTE_B_ID, name: "b" },
	],
	operatorId: OPERATOR_ID,
	rank: 2,
	tags: [],
	vendor: null,
};

describe("table inheritance with package features (E2E)", () => {
	let app: INestApplication | undefined;
	let container: StartedPostgreSqlContainer;
	let document: OpenAPIObject;
	let fastify: { inject: (options: { headers?: Record<string, string>; method: string; url: string }) => Promise<TInjectResponse> };

	const get = (url: string, operatorId: string = OPERATOR_ID): Promise<TInjectResponse> => fastify.inject({ headers: { "x-user-id": "user-1", "x-user-operator-id": operatorId }, method: "GET", url });

	beforeAll(async () => {
		container = await new PostgreSqlContainer("postgres:17-alpine").start();
		const entities = [IntegrationDetailEntity, IntegrationDetailCardEntity, IntegrationDetailFormEntity, IntegrationDetailVendorEntity, IntegrationDetailNetworkEntity, IntegrationDetailIssuerEntity, IntegrationDetailTagEntity, IntegrationDetailNoteEntity];

		const moduleReference = await Test.createTestingModule({
			controllers: [IntegrationDetailController, IntegrationDetailScalarController, IntegrationDetailCursorController],
			imports: [TypeOrmModule.forRoot({ dropSchema: true, entities, synchronize: true, type: "postgres", url: container.getConnectionUri() }), TypeOrmModule.forFeature(entities), ApiAuthorizationModule.forRoot({ iam: { attachmentSources: [integrationDetailAttachmentSource], documentSources: [integrationDetailDocumentSource] }, principalResolver: e2eAuthorizationPrincipalResolver }), ApiSubscriberModule],
			providers: [{ provide: APP_PIPE, useClass: E2eValidationPipe }, IntegrationDetailService, IntegrationDetailRouteSubscriber, TestAuthGuard],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
		fastify = app.getHttpAdapter().getInstance();

		const dataSource: DataSource = app.get(getDataSourceToken());

		await dataSource.getRepository(IntegrationDetailVendorEntity).save({ id: VENDOR_ID, name: "Vendor" });
		await dataSource.getRepository(IntegrationDetailNetworkEntity).save({ id: NETWORK_ID, name: "Network" });
		await dataSource.getRepository(IntegrationDetailIssuerEntity).save({ id: ISSUER_ID, name: "Issuer" });
		await dataSource.getRepository(IntegrationDetailCardEntity).save({ cardNumber: "4111", id: CARD_ID, issuer: { id: ISSUER_ID }, label: "Card", network: { id: NETWORK_ID }, operatorId: OPERATOR_ID, rank: 1, vendor: { id: VENDOR_ID } });
		await dataSource.getRepository(IntegrationDetailFormEntity).save({ actionUrl: "https://example.com", id: FORM_ID, label: "Form", operatorId: OPERATOR_ID, rank: 2 });
		await dataSource.getRepository(IntegrationDetailCardEntity).save({ cardNumber: "5555", id: FOREIGN_ID, label: "Foreign", operatorId: OTHER_OPERATOR_ID, rank: 3 });
		await dataSource.getRepository(IntegrationDetailTagEntity).save({ detailId: CARD_ID, id: TAG_ID, name: "tag" });
		await dataSource.getRepository(IntegrationDetailNoteEntity).save([
			{ detailId: FORM_ID, id: NOTE_A_ID, name: "a" },
			{ detailId: FORM_ID, id: NOTE_B_ID, name: "b" },
		]);
	}, 120_000);

	afterAll(async () => {
		await app?.close();
		await container?.stop();
	});

	beforeEach(() => {
		IntegrationDetailRouteSubscriber.events = [];
	});

	describe("GET", () => {
		it("serves eager root and child relations with an included child relation as OBJECT", async () => {
			const response: TInjectResponse = await get(`/sti-integration-details/${CARD_ID}`);

			expect(response.statusCode).toBe(200);
			expect(response.json()).toEqual(CARD_RESPONSE);
		});

		it("serves an eager child to-many relation on another variant", async () => {
			const response: TInjectResponse = await get(`/sti-integration-details/${FORM_ID}`);

			expect(response.statusCode).toBe(200);
			expect(response.json()).toEqual(FORM_RESPONSE);
		});

		it("projects the included child relation as SCALAR", async () => {
			const response: TInjectResponse = await get(`/sti-integration-details-scalar/${CARD_ID}`);

			expect(response.statusCode).toBe(200);
			expect(response.json()).toEqual({ ...CARD_RESPONSE, issuer: ISSUER_ID });
		});

		it("applies the IAM scope to every variant", async () => {
			expect((await get(`/sti-integration-details/${FOREIGN_ID}`)).statusCode).toBe(404);
			expect((await get(`/sti-integration-details/${CARD_ID}`, OTHER_OPERATOR_ID)).statusCode).toBe(404);
			expect((await get(`/sti-integration-details/${FOREIGN_ID}`, OTHER_OPERATOR_ID)).json()).toMatchObject({ cardNumber: "5555", id: FOREIGN_ID, kind: "CARD" });
		});

		it("runs route subscribers before the variant DTO serializes the result", async () => {
			await get(`/sti-integration-details/${CARD_ID}`);
			await get(`/sti-integration-details/${FORM_ID}`);

			expect(IntegrationDetailRouteSubscriber.events).toEqual(["get:CARD", "get:FORM"]);
		});
	});

	describe("GET_LIST page", () => {
		it("serves every variant with its relations under the IAM scope", async () => {
			const response: TInjectResponse = await get("/sti-integration-details?limit=10&page=1");
			const body: TListResponse = response.json() as TListResponse;

			expect(response.statusCode).toBe(200);
			expect(body.totalCount).toBe(2);
			expect(body.items).toEqual([CARD_RESPONSE, FORM_RESPONSE]);
			expect(IntegrationDetailRouteSubscriber.events).toEqual(["getList:CARD,FORM"]);
		});

		it("projects the included child relation as SCALAR", async () => {
			const body: TListResponse = (await get("/sti-integration-details-scalar?limit=10&page=1")).json() as TListResponse;

			expect(body.items).toEqual([{ ...CARD_RESPONSE, issuer: ISSUER_ID }, FORM_RESPONSE]);
		});

		it("serves only the rows of another operator to that operator", async () => {
			const body: TListResponse = (await get("/sti-integration-details?limit=10&page=1", OTHER_OPERATOR_ID)).json() as TListResponse;

			expect(body.items.map(({ id }: Record<string, unknown>): unknown => id)).toEqual([FOREIGN_ID]);
		});
	});

	describe("GET_LIST cursor", () => {
		it("walks every variant with its relations under the IAM scope", async () => {
			const first: TListResponse = (await get("/sti-integration-details-cursor?limit=1")).json() as TListResponse;

			expect(first.items).toEqual([CARD_RESPONSE]);
			expect(first.previousCursor).toBeNull();

			const second: TListResponse = (await get(`/sti-integration-details-cursor?limit=1&after=${String(first.nextCursor)}`)).json() as TListResponse;

			expect(second.items).toEqual([FORM_RESPONSE]);
			expect(second.nextCursor).toBeNull();

			const back: TListResponse = (await get(`/sti-integration-details-cursor?limit=1&before=${String(second.previousCursor)}`)).json() as TListResponse;

			expect(back.items).toEqual([CARD_RESPONSE]);
			expect(IntegrationDetailRouteSubscriber.events).toEqual(["getList:CARD", "getList:FORM", "getList:CARD"]);
		});
	});

	describe("Swagger", () => {
		const schema = (name: string): { properties: Record<string, Record<string, unknown>> } => document.components?.schemas?.[name] as { properties: Record<string, Record<string, unknown>> };

		it("describes eager and included relations on each variant", () => {
			expect(schema("IntegrationDetailEntityGetResponseCardDTO").properties.vendor).toMatchObject({ allOf: [{ $ref: "#/components/schemas/IntegrationDetailEntityGetResponseCardVendorDTO" }] });
			expect(schema("IntegrationDetailEntityGetResponseCardDTO").properties.network).toMatchObject({ allOf: [{ $ref: "#/components/schemas/IntegrationDetailEntityGetResponseCardNetworkDTO" }] });
			expect(schema("IntegrationDetailEntityGetResponseCardDTO").properties.issuer).toMatchObject({ allOf: [{ $ref: "#/components/schemas/IntegrationDetailEntityGetResponseCardIssuerDTO" }] });
			expect(schema("IntegrationDetailEntityGetResponseCardDTO").properties.tags).toMatchObject({ items: { $ref: "#/components/schemas/IntegrationDetailEntityGetResponseCardTagsDTO" }, type: "array" });
			expect(schema("IntegrationDetailEntityGetResponseFormDTO").properties.notes).toMatchObject({ items: { $ref: "#/components/schemas/IntegrationDetailEntityGetResponseFormNotesDTO" }, type: "array" });
			expect(schema("IntegrationDetailEntityGetResponseFormDTO").properties).not.toHaveProperty("issuer");
		});

		it("describes page and cursor list items as oneOf over the variants", () => {
			for (const wrapper of ["IntegrationDetailEntityGetListResponseItemsDTO", "IntegrationDetailEntityGetListCursorResponseItemsDTO"]) {
				expect(schema(wrapper).properties.items).toMatchObject({ items: { oneOf: [{ $ref: "#/components/schemas/IntegrationDetailEntityGetListResponseCardDTO" }, { $ref: "#/components/schemas/IntegrationDetailEntityGetListResponseFormDTO" }] } });
			}
		});
	});
});
