import type { INestApplication } from "@nestjs/common";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { DataSource } from "typeorm";

import { HttpStatus } from "@nestjs/common";
import { APP_PIPE } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { getDataSourceToken, TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule, EApiExceptionDetailsType } from "../../src/index";

import { TestAuthGuard } from "./app/auth-guard";
import { e2eAuthorizationPrincipalResolver } from "./app/principal-resolver";
import { E2eValidationPipe } from "./app/validation-pipe";
import { STI_EAGER_CONTROLLERS, STI_EAGER_VARIANTS, type TStiEagerVariant } from "./table-inheritance-eager/controller";
import { IntegrationDetailCardEntity } from "./table-inheritance-integration/card.entity";
import { IntegrationDetailFormEntity } from "./table-inheritance-integration/form.entity";
import { integrationDetailAttachmentSource, integrationDetailDocumentSource } from "./table-inheritance-integration/iam";
import { IntegrationDetailIssuerEntity } from "./table-inheritance-integration/issuer.entity";
import { IntegrationDetailNetworkEntity } from "./table-inheritance-integration/network.entity";
import { IntegrationDetailNoteEntity } from "./table-inheritance-integration/note.entity";
import { IntegrationDetailEntity } from "./table-inheritance-integration/root.entity";
import { IntegrationDetailService } from "./table-inheritance-integration/service";
import { IntegrationDetailTagEntity } from "./table-inheritance-integration/tag.entity";
import { IntegrationDetailVendorEntity } from "./table-inheritance-integration/vendor.entity";

import "reflect-metadata";

const OPERATOR_ID: string = "operator-1";
const CARD_ID: string = "50000000-0000-4000-8000-000000000001";
const FORM_ID: string = "50000000-0000-4000-8000-000000000002";
const FOREIGN_ID: string = "50000000-0000-4000-8000-000000000003";
const CREATED_ID: string = "50000000-0000-4000-8000-000000000009";
const VENDOR_ID: string = "60000000-0000-4000-8000-000000000001";
const NETWORK_ID: string = "60000000-0000-4000-8000-000000000002";
const ISSUER_ID: string = "60000000-0000-4000-8000-000000000003";
const TAG_ID: string = "70000000-0000-4000-8000-000000000001";
const NOTE_ID: string = "70000000-0000-4000-8000-000000000002";
const CARD_ITEMS: Array<string> = ["first", "second"];
const HEADERS: Record<string, string> = { "x-user-id": "user-1", "x-user-operator-id": OPERATOR_ID };

type TInjectResponse = { json: () => unknown; statusCode: number };

interface IStoredDetail {
	issuer: null | string;
	label: string;
	network: null | string;
	notes: Array<string>;
	tags: Array<string>;
	vendor: null | string;
}

/**
 * Builds the expected card and form wire rows for a relation variant.
 * @param {TStiEagerVariant} variant - Relation configuration variant.
 * @returns {{ card: Record<string, unknown>; form: Record<string, unknown> }} Expected rows.
 */
function expectedRows(variant: TStiEagerVariant): { card: Record<string, unknown>; form: Record<string, unknown> } {
	const reference = (id: string): unknown => (variant === "scalar" ? id : { id });
	const isToManyProjected: boolean = variant === "object" || variant === "scalar";
	const isIssuerIncluded: boolean = variant !== "none";

	return {
		card: {
			cardNumber: "4111",
			id: CARD_ID,
			items: CARD_ITEMS,
			kind: "CARD",
			label: "Card",
			network: reference(NETWORK_ID),
			operatorId: OPERATOR_ID,
			rank: 1,
			tags: [isToManyProjected ? reference(TAG_ID) : { id: TAG_ID, name: "tag" }],
			vendor: reference(VENDOR_ID),
			...(isIssuerIncluded && { issuer: reference(ISSUER_ID) }),
		},
		form: {
			actionUrl: "https://example.com",
			id: FORM_ID,
			items: null,
			kind: "FORM",
			label: "Form",
			notes: [isToManyProjected ? reference(NOTE_ID) : { id: NOTE_ID, name: "a" }],
			operatorId: OPERATOR_ID,
			rank: 2,
			tags: [],
			vendor: null,
		},
	};
}

describe("eager relations on a table inheritance root (E2E)", () => {
	let app: INestApplication | undefined;
	let container: StartedPostgreSqlContainer;
	let dataSource: DataSource;
	let fastify: { inject: (options: { headers?: Record<string, string>; method: string; payload?: object; url: string }) => Promise<TInjectResponse> };

	const send = (method: string, url: string, payload?: object): Promise<TInjectResponse> => fastify.inject({ headers: HEADERS, method, payload, url });

	const readStoredDetail = async (id: string): Promise<IStoredDetail> => {
		const detail: Record<string, unknown> = (await dataSource.getRepository(IntegrationDetailEntity).findOneOrFail({ where: { id } })) as unknown as Record<string, unknown>;
		const relationId = (value: unknown): null | string => (value as null | undefined | { id: string })?.id ?? null;
		// `issuer` is a non-eager child relation, so its key is read from the row itself.
		const ids = (rows: unknown): Array<string> => ((rows as Array<{ id: string }> | undefined) ?? []).map(({ id: rowId }: { id: string }): string => rowId).toSorted();

		const issuerColumn: string = dataSource.getMetadata(IntegrationDetailCardEntity).findColumnsWithPropertyPath("issuer")[0]?.databaseName ?? "issuerId";
		const [row] = (await dataSource.query(`SELECT "${issuerColumn}" AS "issuerId" FROM sti_integration_details WHERE id = $1`, [id])) as Array<{ issuerId: null | string }>;

		return { issuer: row?.issuerId ?? null, label: detail.label as string, network: relationId(detail.network), notes: ids(detail.notes), tags: ids(detail.tags), vendor: relationId(detail.vendor) };
	};

	beforeAll(async () => {
		container = await new PostgreSqlContainer("postgres:17-alpine").start();
		const entities = [IntegrationDetailEntity, IntegrationDetailCardEntity, IntegrationDetailFormEntity, IntegrationDetailVendorEntity, IntegrationDetailNetworkEntity, IntegrationDetailIssuerEntity, IntegrationDetailTagEntity, IntegrationDetailNoteEntity];

		const moduleReference = await Test.createTestingModule({
			controllers: STI_EAGER_CONTROLLERS,
			imports: [TypeOrmModule.forRoot({ dropSchema: true, entities, synchronize: true, type: "postgres", url: container.getConnectionUri() }), TypeOrmModule.forFeature(entities), ApiAuthorizationModule.forRoot({ iam: { attachmentSources: [integrationDetailAttachmentSource], documentSources: [integrationDetailDocumentSource] }, principalResolver: e2eAuthorizationPrincipalResolver }), ApiSubscriberModule],
			providers: [{ provide: APP_PIPE, useClass: E2eValidationPipe }, IntegrationDetailService, TestAuthGuard],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		fastify = app.getHttpAdapter().getInstance();
		dataSource = app.get(getDataSourceToken());

		await dataSource.getRepository(IntegrationDetailVendorEntity).save({ id: VENDOR_ID, name: "Vendor" });
		await dataSource.getRepository(IntegrationDetailNetworkEntity).save({ id: NETWORK_ID, name: "Network" });
		await dataSource.getRepository(IntegrationDetailIssuerEntity).save({ id: ISSUER_ID, name: "Issuer" });
	}, 120_000);

	beforeEach(async () => {
		await dataSource.getRepository(IntegrationDetailNoteEntity).createQueryBuilder().delete().execute();
		await dataSource.getRepository(IntegrationDetailTagEntity).createQueryBuilder().delete().execute();
		await dataSource.getRepository(IntegrationDetailEntity).createQueryBuilder().delete().execute();

		await dataSource.getRepository(IntegrationDetailCardEntity).save({ cardNumber: "4111", id: CARD_ID, issuer: { id: ISSUER_ID }, items: CARD_ITEMS, label: "Card", network: { id: NETWORK_ID }, operatorId: OPERATOR_ID, rank: 1, vendor: { id: VENDOR_ID } });
		await dataSource.getRepository(IntegrationDetailFormEntity).save({ actionUrl: "https://example.com", id: FORM_ID, label: "Form", operatorId: OPERATOR_ID, rank: 2 });
		await dataSource.getRepository(IntegrationDetailCardEntity).save({ cardNumber: "5555", id: FOREIGN_ID, label: "Foreign", operatorId: "operator-2", rank: 3 });
		await dataSource.getRepository(IntegrationDetailTagEntity).save({ detailId: CARD_ID, id: TAG_ID, name: "tag" });
		await dataSource.getRepository(IntegrationDetailNoteEntity).save({ detailId: FORM_ID, id: NOTE_ID, name: "a" });
	});

	afterAll(async () => {
		await app?.close();
		await container?.stop();
	});

	describe.each([
		["", false],
		["scoped-", true],
	])("%sroutes", (prefix: string, isScoped: boolean) => {
		describe.each(STI_EAGER_VARIANTS)("%s relations", (variant: TStiEagerVariant) => {
			const base: string = `/sti-eager/${prefix}${variant}`;
			const { card, form } = expectedRows(variant);
			const foreign: Record<string, unknown> = { cardNumber: "5555", id: FOREIGN_ID, items: null, kind: "CARD", label: "Foreign", network: null, operatorId: "operator-2", rank: 3, tags: [], vendor: null, ...(variant !== "none" && { issuer: null }) };
			const listed: Array<Record<string, unknown>> = isScoped ? [card, form] : [card, form, foreign];

			it("GET projects relations of a row whose items column is an array", async () => {
				const cardResponse: TInjectResponse = await send("GET", `${base}/${CARD_ID}`);
				const formResponse: TInjectResponse = await send("GET", `${base}/${FORM_ID}`);

				expect(cardResponse.statusCode).toBe(HttpStatus.OK);
				expect(cardResponse.json()).toEqual(card);
				expect(formResponse.statusCode).toBe(HttpStatus.OK);
				expect(formResponse.json()).toEqual(form);
			});

			it("PAGE GET_LIST returns each variant with eager and included relations", async () => {
				const response: TInjectResponse = await send("GET", `${base}?limit=10&page=1`);
				const body = response.json() as { items: Array<unknown>; totalCount: number };

				expect(response.statusCode).toBe(HttpStatus.OK);
				expect(body.totalCount).toBe(listed.length);
				expect(body.items).toEqual(listed);
			});

			it("CURSOR GET_LIST returns each variant with eager and included relations", async () => {
				const response: TInjectResponse = await send("GET", `${base}-cursor?limit=10`);
				const body = response.json() as { items: Array<unknown> };

				expect(response.statusCode).toBe(HttpStatus.OK);
				expect(Object.keys(body).toSorted()).toEqual(["items", "nextCursor", "previousCursor"]);
				expect(body.items).toEqual(listed);
			});

			it.runIf(isScoped)("hides rows outside the IAM scope", async () => {
				expect((await send("GET", `${base}/${FOREIGN_ID}`)).statusCode).toBe(HttpStatus.NOT_FOUND);
			});

			it.runIf(!isScoped)("CREATE writes root columns and returns the eager root relations", async () => {
				const response: TInjectResponse = await send("POST", base, { id: CREATED_ID, kind: "FORM", label: "Created", operatorId: OPERATOR_ID, rank: 5 });

				expect(response.statusCode).toBe(HttpStatus.CREATED);
				expect(response.json()).toEqual({ id: CREATED_ID, items: null, kind: "FORM", label: "Created", operatorId: OPERATOR_ID, rank: 5, tags: [], vendor: null });
				expect(await readStoredDetail(CREATED_ID)).toEqual({ issuer: null, label: "Created", network: null, notes: [], tags: [], vendor: null });
			});

			it.runIf(!isScoped)("PUT keeps eager root and child relations stored", async () => {
				const response: TInjectResponse = await send("PUT", `${base}/${CARD_ID}`, { kind: "CARD", label: "Changed", operatorId: OPERATOR_ID, rank: 1 });
				const { cardNumber: _cardNumber, issuer: _issuer, network: _network, ...rootColumns } = card;

				expect(response.statusCode).toBe(HttpStatus.OK);
				expect(response.json()).toEqual({ ...rootColumns, label: "Changed" });
				expect(await readStoredDetail(CARD_ID)).toEqual({ issuer: ISSUER_ID, label: "Changed", network: NETWORK_ID, notes: [], tags: [TAG_ID], vendor: VENDOR_ID });
			});

			it.runIf(!isScoped).each([
				["PATCH", "a reference", { notes: NOTE_ID }],
				["PATCH", "null", { notes: null }],
				["PUT", "a reference", { kind: "FORM", label: "Changed", notes: NOTE_ID, operatorId: OPERATOR_ID, rank: 2 }],
				["PUT", "null", { kind: "FORM", label: "Changed", notes: null, operatorId: OPERATOR_ID, rank: 2 }],
			])("%s on the root rejects %s for a to-many relation declared only on a child", async (method: string, _name: string, payload: object) => {
				const response: TInjectResponse = await send(method, `${base}/${FORM_ID}`, payload);

				expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
				expect((response.json() as { details?: unknown }).details).toEqual({ propertyName: "notes", reason: "to-many reference is not allowed on update", type: EApiExceptionDetailsType.TO_MANY_UPDATE_KEY });
				expect(await readStoredDetail(FORM_ID)).toEqual({ issuer: null, label: "Form", network: null, notes: [NOTE_ID], tags: [], vendor: null });
			});

			it.runIf(!isScoped)("PATCH keeps eager child to-many rows stored", async () => {
				const response: TInjectResponse = await send("PATCH", `${base}/${FORM_ID}`, { label: "Changed" });
				const { actionUrl: _actionUrl, notes: _notes, ...rootColumns } = form;

				expect(response.statusCode).toBe(HttpStatus.OK);
				expect(response.json()).toEqual({ ...rootColumns, label: "Changed" });
				expect(await readStoredDetail(FORM_ID)).toEqual({ issuer: null, label: "Changed", network: null, notes: [NOTE_ID], tags: [], vendor: null });
			});
		});
	});
});
