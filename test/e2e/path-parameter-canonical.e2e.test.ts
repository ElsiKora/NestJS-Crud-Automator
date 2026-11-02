import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { IApiAuthorizationPrincipal } from "../../src/index";

import { HttpStatus, ValidationPipe } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule, AuthorizationResolveDefaultPrincipal, CorrelationIDResponseBodyInterceptor, EApiAuthorizationPrincipalType } from "../../src/index";
import {
	buildE2ePathParameterCanonicalUndescribedCustomController,
	buildE2ePathParameterConsumerPipe,
	E2E_PATH_PARAMETER_CANONICAL_ALLOWED_UUID,
	E2E_PATH_PARAMETER_CANONICAL_AT,
	E2E_PATH_PARAMETER_CANONICAL_CONTROLLERS,
	E2E_PATH_PARAMETER_CANONICAL_DENIED_UUID,
	E2E_PATH_PARAMETER_CANONICAL_DOCUMENTS,
	E2E_PATH_PARAMETER_CANONICAL_DTO_KINDS,
	E2E_PATH_PARAMETER_CANONICAL_NARROW_MAXIMUM,
	E2ePathParameterCanonicalGetterController,
	E2ePathParameterCanonicalGuard,
	E2ePathParameterCanonicalInheritedAController,
	E2ePathParameterCanonicalInheritedBController,
	E2ePathParameterCanonicalInheritedVaController,
	E2ePathParameterCanonicalInheritedVbController,
	E2ePathParameterCanonicalIntItemEntity,
	E2ePathParameterCanonicalIntItemService,
	E2ePathParameterCanonicalMomentItemEntity,
	E2ePathParameterCanonicalMomentItemService,
	E2ePathParameterCanonicalTextUuidItemEntity,
	E2ePathParameterCanonicalTextUuidItemService,
	E2ePathParameterCanonicalUuidItemEntity,
	E2ePathParameterCanonicalUuidItemService,
} from "./path-parameter";

type TCanonicalFastify = { inject: (options: { method: string; payload?: Record<string, unknown>; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };

const ENTITIES: Array<new () => unknown> = [E2ePathParameterCanonicalIntItemEntity, E2ePathParameterCanonicalMomentItemEntity, E2ePathParameterCanonicalUuidItemEntity, E2ePathParameterCanonicalTextUuidItemEntity];
const PROVIDERS: Array<new () => unknown> = [E2ePathParameterCanonicalIntItemService, E2ePathParameterCanonicalMomentItemService, E2ePathParameterCanonicalUuidItemService, E2ePathParameterCanonicalTextUuidItemService, E2ePathParameterCanonicalGuard];
const AT_WITHOUT_MILLISECONDS: string = "2024-03-10T12:00:00Z";
const OTHER_AT: string = "2024-03-11T12:00:00.000Z";
const UPPER_TEXT_UUID: string = "DDDDDDDD-DDDD-4DDD-8DDD-DDDDDDDDDDDD";
const NON_CANONICAL_INTEGERS: Array<string> = ["016", "1.6e1", "0x10", "abc"];
const NON_CANONICAL_BOOLEANS: Array<string> = ["1", "no", "TRUE", "garbage"];

interface ISentValueCase {
	received?: unknown;
	route: string;
	sent: unknown;
	target: "body" | "query";
}

const BOOLEAN_SENT: Array<[unknown, unknown, Array<"body" | "query">]> = [
	["true", true, ["body", "query"]],
	["false", false, ["body", "query"]],
	[true, true, ["body"]],
	[false, false, ["body"]],
	["1", undefined, ["body", "query"]],
	["0", undefined, ["body", "query"]],
	["no", undefined, ["body", "query"]],
	["TRUE", undefined, ["body", "query"]],
	[1, undefined, ["body"]],
	[
		["true", "false"],
		[true, false],
		["body", "query"],
	],
	[["true", "no"], undefined, ["body", "query"]],
	[["false", "0"], undefined, ["body", "query"]],
];

const INTEGER_SENT: Array<[unknown, unknown, Array<"body" | "query">]> = [
	["16", 16, ["body", "query"]],
	[16, 16, ["body"]],
	["016", undefined, ["body", "query"]],
	["1e1", undefined, ["body", "query"]],
	["0x10", undefined, ["body", "query"]],
	["16.0", undefined, ["body", "query"]],
	[true, undefined, ["body"]],
	[
		["1", "2"],
		[1, 2],
		["body", "query"],
	],
	[[3], [3], ["body"]],
	[["1", "016"], undefined, ["body", "query"]],
];

const SENT_VALUE_CASES: Array<ISentValueCase> = (["plain", "renamed"] as const).flatMap((naming: string): Array<ISentValueCase> => [
	...BOOLEAN_SENT.flatMap(([sent, received, targets]: [unknown, unknown, Array<"body" | "query">]) => targets.map((target: "body" | "query"): ISentValueCase => ({ received, route: `boolean-${naming}`, sent, target }))),
	...INTEGER_SENT.flatMap(([sent, received, targets]: [unknown, unknown, Array<"body" | "query">]) => targets.map((target: "body" | "query"): ISentValueCase => ({ received, route: `integer-${naming}`, sent, target }))),
]);

const LIST_UUID: string = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

// A lone value is a one-item list for every list type; a comma is not a separator, so the item `1,2` fails a typed item rule.
const SENT_LIST_CASES: Array<[string, Record<string, unknown> | undefined]> = [
	["amounts=1.5", { amounts: [1.5] }],
	["amounts=1.5&amounts=2", { amounts: [1.5, 2] }],
	["amounts=1.5,2", undefined],
	["counts=7", { counts: [7] }],
	["counts=1,2", undefined],
	["counts=007", undefined],
	["flags=false", { flags: [false] }],
	["flags=true,false", undefined],
	[`ids=${LIST_UUID.toUpperCase()}`, { ids: [LIST_UUID] }],
	[`ids=${LIST_UUID},${LIST_UUID}`, undefined],
	["names=abc", { names: ["abc"] }],
	["names=ab,cd", undefined],
	["amount=1e2", { amount: 100 }],
	["amount=-0.25", { amount: -0.25 }],
	["amount=16.0", { amount: 16 }],
	["amount=", undefined],
	// An empty value is one empty item, checked by the item rule of every type.
	["amounts=", undefined],
	["counts=", undefined],
	["days=", undefined],
	["flags=", undefined],
	["ids=", undefined],
	["names=", undefined],
	["statuses=", undefined],
	["labels=", { labels: [""] }],
	["amount=0x10", undefined],
	["amount=%2016%20", undefined],
	["amount=.5", undefined],
	["amount=Infinity", undefined],
];

/**
 * Builds the testing module of the canonical path value suite.
 * @param {StartedPostgreSqlContainer | undefined} container - PostgreSQL container, or undefined for SQLite.
 * @param {Array<new () => unknown>} controllers - Controllers to register.
 * @returns {Promise<INestApplication>} Application that is not initialized yet.
 */
const createCanonicalApplication = async (container: StartedPostgreSqlContainer | undefined, controllers: Array<new () => unknown>): Promise<INestApplication> => {
	const moduleReference = await Test.createTestingModule({
		controllers,
		imports: [
			TypeOrmModule.forRoot(container ? { dropSchema: true, entities: ENTITIES, synchronize: true, type: "postgres", url: container.getConnectionUri() } : { database: ":memory:", dropSchema: true, entities: ENTITIES, synchronize: true, type: "better-sqlite3" }),
			TypeOrmModule.forFeature(ENTITIES),
			ApiAuthorizationModule.forRoot({
				iam: {
					attachmentSources: [{ getAttachments: async (principal: IApiAuthorizationPrincipal) => await Promise.resolve({ attachments: [{ policyId: principal.id, principalId: principal.id, principalType: EApiAuthorizationPrincipalType.USER }], boundaries: [] }) }],
					documentSources: [{ getDocumentsByIds: async (ids: ReadonlyArray<string>) => await Promise.resolve(E2E_PATH_PARAMETER_CANONICAL_DOCUMENTS.filter((document: Record<string, unknown>): boolean => ids.includes(document.id as string))) }],
				},
				principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) },
			} as never),
			ApiSubscriberModule,
		],
		providers: PROVIDERS,
	}).compile();

	return moduleReference.createNestApplication(new FastifyAdapter());
};

describe.each([
	{ databaseName: "SQLite", isPostgres: false, pipe: "none" },
	{ databaseName: "SQLite", isPostgres: false, pipe: "transform" },
	{ databaseName: "SQLite", isPostgres: false, pipe: "implicit" },
	{ databaseName: "SQLite", isPostgres: false, pipe: "consumer" },
	{ databaseName: "PostgreSQL", isPostgres: true, pipe: "none" },
	{ databaseName: "PostgreSQL", isPostgres: true, pipe: "transform" },
	{ databaseName: "PostgreSQL", isPostgres: true, pipe: "implicit" },
	{ databaseName: "PostgreSQL", isPostgres: true, pipe: "consumer" },
])("canonical path values on $databaseName, host pipe: $pipe (E2E)", ({ isPostgres, pipe }: { databaseName: string; isPostgres: boolean; pipe: string }) => {
	let app: INestApplication | undefined;
	let container: StartedPostgreSqlContainer | undefined;
	let fastify: TCanonicalFastify;

	const expectStatus = async (url: string, status: HttpStatus, method: string = "GET", payload?: Record<string, unknown>): Promise<unknown> => {
		const response = await fastify.inject({ method, payload, url });

		expect({ status: response.statusCode, url }).toEqual({ status, url, ...(response.statusCode === status ? {} : { body: response.json() }) });

		return response.json();
	};

	beforeAll(async () => {
		if (isPostgres) {
			container = await new PostgreSqlContainer("postgres:17-alpine").start();
		}

		app = await createCanonicalApplication(container, E2E_PATH_PARAMETER_CANONICAL_CONTROLLERS);
		app.useGlobalInterceptors(new CorrelationIDResponseBodyInterceptor());

		if (pipe === "transform") {
			app.useGlobalPipes(new ValidationPipe({ transform: true }));
		}

		if (pipe === "implicit") {
			app.useGlobalPipes(new ValidationPipe({ transform: true, transformOptions: { enableImplicitConversion: true } }));
		}

		if (pipe === "consumer") {
			app.useGlobalPipes(buildE2ePathParameterConsumerPipe());
		}

		await app.init();
		fastify = app.getHttpAdapter().getInstance();

		await app.get(E2ePathParameterCanonicalIntItemService).repository.save([
			{ active: true, id: 1, label: "one" },
			{ active: false, id: 16, label: "sixteen" },
		]);
		await app.get(E2ePathParameterCanonicalMomentItemService).repository.save([
			{ at: new Date(E2E_PATH_PARAMETER_CANONICAL_AT), id: 1, label: "first" },
			{ at: new Date(OTHER_AT), id: 2, label: "second" },
		]);
		await app.get(E2ePathParameterCanonicalUuidItemService).repository.save([
			{ id: E2E_PATH_PARAMETER_CANONICAL_DENIED_UUID, label: "denied" },
			{ id: E2E_PATH_PARAMETER_CANONICAL_ALLOWED_UUID, label: "allowed" },
		]);
	}, 240_000);

	afterAll(async () => {
		await app?.close();
		await container?.stop();
	});

	it("gives IAM the ISO 8601 UTC text of a DATE_TIME path value", async () => {
		await expectStatus(`/path-parameter/canonical/dt-deny/${E2E_PATH_PARAMETER_CANONICAL_AT}/items/1`, HttpStatus.FORBIDDEN);
		await expectStatus(`/path-parameter/canonical/dt-deny/${AT_WITHOUT_MILLISECONDS}/items/1`, HttpStatus.FORBIDDEN);
		await expectStatus(`/path-parameter/canonical/dt-deny/${OTHER_AT}/items/2`, HttpStatus.OK);
		await expectStatus(`/path-parameter/canonical/dt-res/${E2E_PATH_PARAMETER_CANONICAL_AT}/items/1`, HttpStatus.FORBIDDEN);
		await expectStatus(`/path-parameter/canonical/dt-res/${AT_WITHOUT_MILLISECONDS}/items/1`, HttpStatus.FORBIDDEN);
		await expectStatus(`/path-parameter/canonical/dt-res/${OTHER_AT}/items/2`, HttpStatus.OK);
	});

	it("matches the resource recipe on a DATE_TIME path value", async () => {
		expect(await expectStatus(`/path-parameter/canonical/dt-recipe/${E2E_PATH_PARAMETER_CANONICAL_AT}/items/1`, HttpStatus.OK)).toMatchObject({ id: 1, label: "first" });
		expect(await expectStatus(`/path-parameter/canonical/dt-recipe/${AT_WITHOUT_MILLISECONDS}/items/1`, HttpStatus.OK)).toMatchObject({ id: 1 });
		await expectStatus(`/path-parameter/canonical/dt-recipe/${OTHER_AT}/items/1`, HttpStatus.NOT_FOUND);
	});

	it("renders a BOOLEAN path value into the resource string a Deny names", async () => {
		await expectStatus("/path-parameter/canonical/bool-deny/true/items/1", HttpStatus.FORBIDDEN);
		expect(await expectStatus("/path-parameter/canonical/bool-deny/false/items/16", HttpStatus.OK)).toMatchObject({ id: 16 });
		await expectStatus("/path-parameter/canonical/bool-cond/true/items/1", HttpStatus.FORBIDDEN);
		expect(await expectStatus("/path-parameter/canonical/bool-cond/false/items/16", HttpStatus.OK)).toMatchObject({ id: 16 });
	});

	it.each(NON_CANONICAL_BOOLEANS)("rejects the BOOLEAN path text %s before authorization", async (value: string) => {
		await expectStatus(`/path-parameter/canonical/bool-deny/${value}/items/1`, HttpStatus.BAD_REQUEST);
		await expectStatus(`/path-parameter/canonical/bool-cond/${value}/items/1`, HttpStatus.BAD_REQUEST);
	});

	it.each(E2E_PATH_PARAMETER_CANONICAL_DTO_KINDS.map(({ kind }: { kind: string }) => kind))("converts the path value of a route with the configured %s PARAMETERS DTO by the column rule", async (kind: string) => {
		for (const access of ["open", "guard"]) {
			expect(await expectStatus(`/path-parameter/canonical/ppc-dto-${kind}-${access}/1`, HttpStatus.OK)).toMatchObject({ id: 1, label: "one" });

			for (const value of NON_CANONICAL_INTEGERS) {
				await expectStatus(`/path-parameter/canonical/ppc-dto-${kind}-${access}/${value}`, HttpStatus.BAD_REQUEST);
			}
		}
	});

	it("lets a configured PARAMETERS DTO narrow the column rule", async () => {
		await expectStatus("/path-parameter/canonical/narrow/1", HttpStatus.OK);
		await expectStatus(`/path-parameter/canonical/narrow/${String(E2E_PATH_PARAMETER_CANONICAL_NARROW_MAXIMUM + 6)}`, HttpStatus.BAD_REQUEST);
		await expectStatus("/path-parameter/canonical/narrow/016", HttpStatus.BAD_REQUEST);
	});

	it("stores a UUID body value lower-case, and refuses an upper-case path value instead of reading it as that key", async () => {
		const created: { id: string } = (await expectStatus("/path-parameter/canonical/text-uuid", HttpStatus.CREATED, "POST", { label: "created", ownerId: UPPER_TEXT_UUID })) as { id: string };
		const repository = app!.get(E2ePathParameterCanonicalTextUuidItemService).repository;

		expect(await repository.findOneBy({ id: created.id })).toMatchObject({ ownerId: UPPER_TEXT_UUID.toLowerCase() });
		expect(await expectStatus(`/path-parameter/canonical/text-uuid/${created.id}`, HttpStatus.OK)).toMatchObject({ id: created.id, ownerId: UPPER_TEXT_UUID.toLowerCase() });
		await expectStatus(`/path-parameter/canonical/text-uuid/${created.id.toUpperCase()}`, HttpStatus.BAD_REQUEST);
		await expectStatus(`/path-parameter/canonical/text-uuid/${created.id.toUpperCase()}`, HttpStatus.BAD_REQUEST, "PATCH", { ownerId: E2E_PATH_PARAMETER_CANONICAL_ALLOWED_UUID });
		await expectStatus(`/path-parameter/canonical/text-uuid/${created.id}`, HttpStatus.OK, "PATCH", { ownerId: E2E_PATH_PARAMETER_CANONICAL_DENIED_UUID.toUpperCase() });

		expect(await repository.findOneBy({ id: created.id })).toMatchObject({ ownerId: E2E_PATH_PARAMETER_CANONICAL_DENIED_UUID });
	});

	it("applies a Deny on a custom route to every spelling of its path value", async () => {
		await expectStatus("/path-parameter/canonical/ppc-custom-int/16", HttpStatus.FORBIDDEN);

		for (const value of NON_CANONICAL_INTEGERS) {
			await expectStatus(`/path-parameter/canonical/ppc-custom-int/${value}`, HttpStatus.BAD_REQUEST);
		}

		expect(await expectStatus("/path-parameter/canonical/ppc-custom-int/1", HttpStatus.OK)).toEqual({ value: "string:1" });
		await expectStatus(`/path-parameter/canonical/ppc-custom-uuid/${E2E_PATH_PARAMETER_CANONICAL_DENIED_UUID}`, HttpStatus.FORBIDDEN);
		await expectStatus(`/path-parameter/canonical/ppc-custom-uuid/${E2E_PATH_PARAMETER_CANONICAL_DENIED_UUID.toUpperCase()}`, HttpStatus.BAD_REQUEST);
		await expectStatus(`/path-parameter/canonical/ppc-custom-uuid/${E2E_PATH_PARAMETER_CANONICAL_ALLOWED_UUID.toUpperCase()}`, HttpStatus.BAD_REQUEST);
		expect(await expectStatus(`/path-parameter/canonical/ppc-custom-uuid/${E2E_PATH_PARAMETER_CANONICAL_ALLOWED_UUID}`, HttpStatus.OK)).toEqual({ value: `string:${E2E_PATH_PARAMETER_CANONICAL_ALLOWED_UUID}` });
	});

	it("validates an inherited custom route by the resource path of each subclass", async () => {
		await expectStatus("/path-parameter/canonical/ppc-inh-vb/true/1", HttpStatus.FORBIDDEN);

		for (const value of NON_CANONICAL_BOOLEANS) {
			await expectStatus(`/path-parameter/canonical/ppc-inh-vb/${value}/1`, HttpStatus.BAD_REQUEST);
		}

		await expectStatus("/path-parameter/canonical/ppc-inh-vb/true/016", HttpStatus.BAD_REQUEST);
		await expectStatus("/path-parameter/canonical/ppc-inh-va/true/016", HttpStatus.BAD_REQUEST);
		// Without a host pipe the handler reads the canonical text the guard wrote back; a host pipe converts the copied DTO from that text.
		expect(await expectStatus("/path-parameter/canonical/ppc-inh-vb/false/1", HttpStatus.OK)).toEqual({ value: pipe === "none" ? "string:false" : "boolean:false" });
	});

	it.skipIf(pipe === "none").each(["copy", "boolean"])("gives the handler the boolean of the %s body and query DTO exactly as sent", async (kind: string) => {
		for (const [sent, received] of [
			["true", "boolean:true"],
			["false", "boolean:false"],
			[false, "boolean:false"],
		] as Array<[boolean | string, string]>) {
			expect(await expectStatus(`/path-parameter/canonical/boolean-echo/${kind}`, HttpStatus.OK, "POST", { active: sent })).toEqual({ value: received });
			expect(await expectStatus(`/path-parameter/canonical/boolean-echo/${kind}?active=${String(sent)}`, HttpStatus.OK)).toEqual({ value: received });
		}

		for (const value of NON_CANONICAL_BOOLEANS) {
			await expectStatus(`/path-parameter/canonical/boolean-echo/${kind}`, HttpStatus.BAD_REQUEST, "POST", { active: value });
			await expectStatus(`/path-parameter/canonical/boolean-echo/${kind}?active=${value}`, HttpStatus.BAD_REQUEST);
		}

		await expectStatus(`/path-parameter/canonical/boolean-echo/${kind}`, HttpStatus.BAD_REQUEST, "POST", { active: 1 });
	});

	it.each(SENT_VALUE_CASES.map((sentCase: ISentValueCase): [string, ISentValueCase] => [`${sentCase.route} ${sentCase.target} ${JSON.stringify(sentCase.sent)}`, sentCase]))("checks exactly the value the client sent: %s", async (_name: string, sentCase: ISentValueCase) => {
		const key: string = (sentCase.route.endsWith("renamed") ? "sent_" : "") + (Array.isArray(sentCase.sent) ? "values" : "value");
		const url: string = `/path-parameter/canonical/sent-value/${sentCase.route}`;
		const response = sentCase.target === "body" ? await fastify.inject({ method: "POST", payload: { [key]: sentCase.sent }, url }) : await fastify.inject({ method: "GET", url: `${url}?${(Array.isArray(sentCase.sent) ? sentCase.sent : [sentCase.sent]).map((item: unknown) => `${key}=${encodeURIComponent(String(item))}`).join("&")}` });

		// Without a host pipe the route validates no body or query: the handler reads the request as sent.
		if (pipe === "none") {
			expect(response.statusCode).toBe(HttpStatus.OK);

			return;
		}

		const expected: { body: unknown; status: HttpStatus } = sentCase.received === undefined ? { body: expect.anything(), status: HttpStatus.BAD_REQUEST } : { body: { value: JSON.stringify({ [Array.isArray(sentCase.sent) ? "values" : "value"]: sentCase.received }) }, status: HttpStatus.OK };

		expect({ body: response.json(), status: response.statusCode }).toEqual(expected);
	});

	it("gives IAM the canonical text of a described path value that only a condition names", async () => {
		await expectStatus("/path-parameter/canonical/ppc-cond-only/16", HttpStatus.FORBIDDEN);

		for (const value of NON_CANONICAL_INTEGERS) {
			await expectStatus(`/path-parameter/canonical/ppc-cond-only/${value}`, HttpStatus.BAD_REQUEST);
		}

		expect(await expectStatus("/path-parameter/canonical/ppc-cond-only/1", HttpStatus.OK)).toEqual({ value: "string:1" });
	});

	it("gives IAM the canonical text of a path value its PARAMETERS DTO describes without copying a column", async () => {
		await expectStatus("/path-parameter/canonical/ppc-described-int/16", HttpStatus.FORBIDDEN);

		for (const value of [...NON_CANONICAL_INTEGERS, "1e1", "abc"]) {
			await expectStatus(`/path-parameter/canonical/ppc-described-int/${value}`, HttpStatus.BAD_REQUEST);
		}

		expect(await expectStatus("/path-parameter/canonical/ppc-described-int/1", HttpStatus.OK)).toEqual({ value: "string:1" });
		await expectStatus(`/path-parameter/canonical/ppc-described-uuid/${E2E_PATH_PARAMETER_CANONICAL_DENIED_UUID.toUpperCase()}`, HttpStatus.FORBIDDEN);
		await expectStatus("/path-parameter/canonical/ppc-described-uuid/not-a-uuid", HttpStatus.BAD_REQUEST);
		expect(await expectStatus(`/path-parameter/canonical/ppc-described-uuid/${E2E_PATH_PARAMETER_CANONICAL_ALLOWED_UUID.toUpperCase()}`, HttpStatus.OK)).toEqual({ value: `string:${E2E_PATH_PARAMETER_CANONICAL_ALLOWED_UUID}` });
	});

	it.each(SENT_LIST_CASES)("reads the query %s by one rule for every list type", async (query: string, received: Record<string, unknown> | undefined) => {
		const response = await fastify.inject({ method: "GET", url: `/path-parameter/canonical/sent-value/list?${query}` });

		// Without a host pipe the route validates no query: the handler reads the request as sent.
		if (pipe === "none") {
			expect(response.statusCode).toBe(HttpStatus.OK);

			return;
		}

		expect({ body: response.json(), status: response.statusCode }).toEqual(received === undefined ? { body: expect.anything(), status: HttpStatus.BAD_REQUEST } : { body: { value: JSON.stringify(received) }, status: HttpStatus.OK });
	});

	it("filters a UUID text column by the lower-case value it stores", async () => {
		const ownerId: string = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
		await app!.get(E2ePathParameterCanonicalTextUuidItemService).repository.save({ label: "filtered", ownerId });

		const list: { items: Array<{ ownerId: string }> } = (await expectStatus(`/path-parameter/canonical/text-uuid?ownerId[operator]=eq&ownerId[value]=${ownerId.toUpperCase()}&limit=10&page=1`, HttpStatus.OK)) as { items: Array<{ ownerId: string }> };

		expect(list.items).toEqual([expect.objectContaining({ ownerId })]);
	});

	it("leaves the raw path text to a guard that runs before authorization", async () => {
		E2ePathParameterCanonicalGuard.RAW_PARAMETERS.length = 0;
		await expectStatus("/path-parameter/canonical/ppc-custom-int/016", HttpStatus.BAD_REQUEST);

		expect(E2ePathParameterCanonicalGuard.RAW_PARAMETERS).toEqual([{ id: "016" }]);
	});
});

describe("custom route resource placeholders (E2E)", () => {
	it("fails at startup when the PARAMETERS DTO of a custom route does not describe a resource path placeholder", async () => {
		const app: INestApplication = await createCanonicalApplication(undefined, [buildE2ePathParameterCanonicalUndescribedCustomController()]);

		await expect(app.init()).rejects.toThrow(/path parameter "id"/);
		// A failed init leaves the Fastify server unbound, so its close fails; the application holds no database connection worth closing.
		await app.close().catch((): undefined => undefined);
	});
});

describe("inherited custom routes (E2E)", () => {
	const VB_DENIED_SPELLINGS: Array<string> = ["/path-parameter/canonical/ppc-inh-vb/TRUE/1", "/path-parameter/canonical/ppc-inh-vb/1/1"];

	/**
	 * Initializes an application, runs the requests and closes it.
	 * @param {Array<new () => unknown>} controllers - Controllers to register, in this order.
	 * @param {Array<[string, HttpStatus]>} expectations - Request URLs and the status each must return.
	 * @returns {Promise<void>}
	 */
	const expectInApplication = async (controllers: Array<new () => unknown>, expectations: Array<[string, HttpStatus]>): Promise<void> => {
		const app: INestApplication = await createCanonicalApplication(undefined, controllers);
		await app.init();
		const fastify: TCanonicalFastify = app.getHttpAdapter().getInstance();

		try {
			for (const [url, status] of expectations) {
				expect({ status: (await fastify.inject({ method: "GET", url })).statusCode, url }).toEqual({ status, url });
			}
		} finally {
			await app.close();
		}
	};

	const vbExpectations: Array<[string, HttpStatus]> = [["/path-parameter/canonical/ppc-inh-vb/true/1", HttpStatus.FORBIDDEN], ["/path-parameter/canonical/ppc-inh-vb/false/1", HttpStatus.OK], ...VB_DENIED_SPELLINGS.map((url: string): [string, HttpStatus] => [url, HttpStatus.BAD_REQUEST])];

	it.each([
		["Va then Vb", [E2ePathParameterCanonicalInheritedVaController, E2ePathParameterCanonicalInheritedVbController]],
		["Vb then Va", [E2ePathParameterCanonicalInheritedVbController, E2ePathParameterCanonicalInheritedVaController]],
	] as Array<[string, Array<new () => unknown>]>)("validates the subclass Vb by its own resource path when registered %s", async (_order: string, controllers: Array<new () => unknown>) => {
		await expectInApplication(controllers, [...vbExpectations, ["/path-parameter/canonical/ppc-inh-va/true/016", HttpStatus.BAD_REQUEST]]);
	});

	it("starts with an accessor inherited by a securable controller and still validates its custom route", async () => {
		await expectInApplication(
			[E2ePathParameterCanonicalGetterController],
			[
				["/path-parameter/canonical/ppc-getter/016", HttpStatus.BAD_REQUEST],
				["/path-parameter/canonical/ppc-getter/1", HttpStatus.OK],
			],
		);
	});

	it("does not carry the rule of one application into the next", async () => {
		await expectInApplication([E2ePathParameterCanonicalInheritedVaController], [["/path-parameter/canonical/ppc-inh-va/true/1", HttpStatus.OK]]);
		await expectInApplication([E2ePathParameterCanonicalInheritedVbController], vbExpectations);
	});

	it.each([
		["A then B", [E2ePathParameterCanonicalInheritedAController, E2ePathParameterCanonicalInheritedBController]],
		["B then A", [E2ePathParameterCanonicalInheritedBController, E2ePathParameterCanonicalInheritedAController]],
		["B alone", [E2ePathParameterCanonicalInheritedBController]],
	] as Array<[string, Array<new () => unknown>]>)("fails at startup on the undescribed placeholder of an inherited custom route, %s", async (_order: string, controllers: Array<new () => unknown>) => {
		const app: INestApplication = await createCanonicalApplication(undefined, controllers);

		await expect(app.init()).rejects.toThrow(/"E2ePathParameterCanonicalInheritedBController" method "read" names the path parameter "tenant"/);
		await app.close().catch((): undefined => undefined);
	});

	it("fails at startup on the undescribed placeholder after an application that started with the sibling subclass", async () => {
		await expectInApplication([E2ePathParameterCanonicalInheritedAController], [["/path-parameter/canonical/ppc-inh-a/016", HttpStatus.BAD_REQUEST]]);
		const app: INestApplication = await createCanonicalApplication(undefined, [E2ePathParameterCanonicalInheritedBController]);

		await expect(app.init()).rejects.toThrow(/path parameter "tenant"/);
		await app.close().catch((): undefined => undefined);
	});
});
