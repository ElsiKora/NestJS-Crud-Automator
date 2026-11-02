import "reflect-metadata";

import { readFileSync } from "node:fs";

import type { INestApplication } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";

import { HttpStatus } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiSubscriberModule, EApiRouteType } from "../../src/index";
import { expectEveryComponentToBeReachable } from "./expect-every-component-to-be-reachable";
import { expectEveryReferenceToResolve } from "./expect-every-reference-to-resolve";
import { E2eDtoNameAdminItemController, E2eDtoNameCopyController, E2eDtoNameCustomItemController, E2eDtoNameItemEntity, E2eDtoNameItemService, E2eDtoNameOwnerEntity, E2eDtoNamePublicItemController, E2eDtoNameRecordController, E2eDtoNameRecordEntity, E2eDtoNameRecordService } from "./controller-dto-names";

const COMPONENT_REFERENCE_PREFIX: string = "#/components/schemas/";
const UUID_PATTERN: RegExp = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/;
const EPOCH_MILLISECONDS_FLOOR: number = 1_000_000_000_000;

/**
 * Replaces example values that change on every run (random UUIDs, `Date.now()` timestamps) with fixed placeholders.
 * @param {unknown} value - OpenAPI document fragment.
 * @param {string} [key] - Property name that holds the fragment.
 * @returns {unknown} The fragment with stable example values.
 */
const normalizeExamples = (value: unknown, key?: string): unknown => {
	if (Array.isArray(value)) {
		return value.map((item: unknown): unknown => normalizeExamples(item));
	}

	if (value && typeof value === "object") {
		return Object.fromEntries(Object.entries(value).map(([entryKey, entryValue]: [string, unknown]): [string, unknown] => [entryKey, normalizeExamples(entryValue, entryKey)]));
	}

	if (key === "example" && typeof value === "string" && UUID_PATTERN.test(value)) {
		return "<uuid>";
	}

	if (key === "example" && typeof value === "number" && value > EPOCH_MILLISECONDS_FLOOR) {
		return 0;
	}

	return value;
};

/**
 * Renames component keys and component references of an OpenAPI document fragment.
 * @param {unknown} value - OpenAPI document fragment.
 * @param {(name: string) => string} rename - Component name mapping.
 * @param {string} [parentKey] - Property name that holds the fragment.
 * @returns {unknown} The fragment with renamed components.
 */
const renameComponents = (value: unknown, rename: (name: string) => string, parentKey?: string): unknown => {
	if (Array.isArray(value)) {
		return value.map((item: unknown): unknown => renameComponents(item, rename));
	}

	if (value && typeof value === "object") {
		return Object.fromEntries(Object.entries(value).map(([entryKey, entryValue]: [string, unknown]): [string, unknown] => [parentKey === "schemas" ? rename(entryKey) : entryKey, renameComponents(entryValue, rename, entryKey)]));
	}

	if (typeof value === "string" && value.startsWith(COMPONENT_REFERENCE_PREFIX)) {
		return `${COMPONENT_REFERENCE_PREFIX}${rename(value.slice(COMPONENT_REFERENCE_PREFIX.length))}`;
	}

	return value;
};

/**
 * Sorts object keys recursively, so two documents compare by content and not by key order.
 * @param {unknown} value - JSON value.
 * @returns {unknown} The value with sorted object keys.
 */
const sortKeys = (value: unknown): unknown => {
	if (Array.isArray(value)) {
		return value.map((item: unknown): unknown => sortKeys(item));
	}

	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value)
				.sort(([left]: [string, unknown], [right]: [string, unknown]): number => left.localeCompare(right))
				.map(([entryKey, entryValue]: [string, unknown]): [string, unknown] => [entryKey, sortKeys(entryValue)]),
		);
	}

	return value;
};

interface ISchema {
	$ref?: string;
	allOf?: Array<ISchema>;
	items?: ISchema;
	properties?: Record<string, ISchema>;
}

describe("generated DTO names with two controllers on one entity (E2E)", () => {
	let app: INestApplication | undefined;
	let document: OpenAPIObject;
	let fastify: {
		inject: (options: { method: string; url: string }) => Promise<{ json: () => unknown; statusCode: number }>;
	};

	const resolveSchema = (schema: ISchema | undefined): ISchema => {
		if (!schema) {
			return {};
		}

		if (schema.$ref) {
			return resolveSchema(document.components?.schemas?.[schema.$ref.replace("#/components/schemas/", "")] as ISchema | undefined);
		}

		if (schema.allOf?.length === 1) {
			return resolveSchema(schema.allOf[0]);
		}

		return schema;
	};

	const getResponseSchema = (path: string): { name: string; schema: ISchema } => {
		const reference: string | undefined = (document.paths[path]?.get?.responses[String(HttpStatus.OK)] as { content?: Record<string, { schema?: ISchema }> } | undefined)?.content?.["application/json"]?.schema?.$ref;

		return { name: String(reference?.replace("#/components/schemas/", "")), schema: resolveSchema({ $ref: reference }) };
	};

	const getPropertyNames = (schema: ISchema): Array<string> => Object.keys(schema.properties ?? {}).sort();

	beforeAll(async () => {
		const moduleReference = await Test.createTestingModule({
			controllers: [E2eDtoNameAdminItemController, E2eDtoNamePublicItemController],
			imports: [
				TypeOrmModule.forRoot({
					database: ":memory:",
					dropSchema: true,
					entities: [E2eDtoNameItemEntity],
					logging: false,
					synchronize: true,
					type: "better-sqlite3",
				}),
				TypeOrmModule.forFeature([E2eDtoNameItemEntity]),
				ApiAuthorizationModule.forRoot(),
				ApiSubscriberModule,
			],
			providers: [E2eDtoNameItemService],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
		fastify = app.getHttpAdapter().getInstance();
		await app.get(E2eDtoNameItemService).repository.save({ id: "item-1", name: "Item", secret: "Secret" });
	});

	afterAll(async () => {
		await app?.close();
	});

	it.each([
		["/admin/dto-name-items/{id}", "/admin/dto-name-items/item-1", ["id", "name", "secret"]],
		["/public/dto-name-items/{id}", "/public/dto-name-items/item-1", ["id", "name"]],
	])("documents the GET response of %s as the shape it sends", async (documentPath: string, url: string, expectedFields: Array<string>) => {
		const response = await fastify.inject({ method: "GET", url });
		const wireFields: Array<string> = Object.keys(response.json() as Record<string, unknown>).sort();

		expect(response.statusCode).toBe(HttpStatus.OK);
		expect(wireFields).toEqual(expectedFields);
		expect(getPropertyNames(getResponseSchema(documentPath).schema)).toEqual(wireFields);
	});

	it.each([
		["/admin/dto-name-items", ["id", "name", "secret"]],
		["/public/dto-name-items", ["id", "name"]],
	])("documents the GET_LIST items of %s as the shape it sends", async (path: string, expectedFields: Array<string>) => {
		const response = await fastify.inject({ method: "GET", url: `${path}?limit=10&page=1` });
		const items: Array<Record<string, unknown>> = (response.json() as { items: Array<Record<string, unknown>> }).items;
		const wireFields: Array<string> = Object.keys(items[0] ?? {}).sort();
		const listSchema: ISchema = getResponseSchema(path).schema;

		expect(response.statusCode).toBe(HttpStatus.OK);
		expect(wireFields).toEqual(expectedFields);
		expect(getPropertyNames(resolveSchema(listSchema.properties?.items?.items))).toEqual(wireFields);
	});

	it("resolves every component reference", () => {
		expectEveryReferenceToResolve(document);
	});

	it("reaches every component from a route", () => {
		expectEveryComponentToBeReachable(document);
	});

	it("gives each controller its own response component names", () => {
		const names: Array<string> = ["/admin/dto-name-items/{id}", "/public/dto-name-items/{id}", "/admin/dto-name-items", "/public/dto-name-items"].map((path: string): string => getResponseSchema(path).name);

		expect(names).toEqual(["E2eDtoNameAdminItemGetResponseDTO", "E2eDtoNamePublicItemGetResponseDTO", "E2eDtoNameAdminItemGetListPageDTO", "E2eDtoNamePublicItemGetListPageDTO"]);
	});
});

describe("generated DTO names with one controller on an entity (E2E)", () => {
	let app: INestApplication | undefined;
	let document: OpenAPIObject;

	beforeAll(async () => {
		const moduleReference = await Test.createTestingModule({
			controllers: [E2eDtoNameRecordController],
			imports: [
				TypeOrmModule.forRoot({
					database: ":memory:",
					dropSchema: true,
					entities: [E2eDtoNameOwnerEntity, E2eDtoNameRecordEntity],
					logging: false,
					synchronize: true,
					type: "better-sqlite3",
				}),
				TypeOrmModule.forFeature([E2eDtoNameRecordEntity]),
				ApiAuthorizationModule.forRoot(),
				ApiSubscriberModule,
			],
			providers: [E2eDtoNameRecordService],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
	});

	afterAll(async () => {
		await app?.close();
	});

	it("resolves every component reference", () => {
		expectEveryReferenceToResolve(document);
	});

	it("reaches every component from a route", () => {
		expectEveryComponentToBeReachable(document);
	});

	it("matches the previous document apart from the generated component names", () => {
		// Captured on dev at 4a38d328, before the schema prefix rule, with run-dependent examples normalized. The controller is E2eDtoNameRecordController, so its prefix is E2eDtoNameRecord, and the GET_LIST wrapper is named GetListPageDTO. Its filter [values] arrays then took at least two items; they now take at least one, as in and notin do. Array items of string, UUID and date properties later gained `type: "string"`.
		const previousDocument: unknown = JSON.parse(readFileSync(new URL("controller-dto-names/record.dev-openapi.json", import.meta.url), "utf8"));
		const renameGenerated = (name: string): string => name.replace(/^E2eDtoNameRecordEntity/, "E2eDtoNameRecord").replace(/GetListResponseItemsDTO$/, "GetListPageDTO");

		expect(JSON.stringify(sortKeys(normalizeExamples(document)))).toBe(JSON.stringify(sortKeys(renameComponents(previousDocument, renameGenerated))));
	});
});

describe("generated DTO names of a custom route next to a generated route (E2E)", () => {
	let app: INestApplication | undefined;
	let document: OpenAPIObject;

	beforeAll(async () => {
		const moduleReference = await Test.createTestingModule({
			controllers: [E2eDtoNameCustomItemController],
			imports: [
				TypeOrmModule.forRoot({
					database: ":memory:",
					dropSchema: true,
					entities: [E2eDtoNameItemEntity],
					logging: false,
					synchronize: true,
					type: "better-sqlite3",
				}),
				TypeOrmModule.forFeature([E2eDtoNameItemEntity]),
				ApiAuthorizationModule.forRoot(),
				ApiSubscriberModule,
			],
			providers: [E2eDtoNameItemService],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
	});

	afterAll(async () => {
		await app?.close();
	});

	it("resolves every component reference", () => {
		expectEveryReferenceToResolve(document);
	});

	it("reaches every component from a route", () => {
		expectEveryComponentToBeReachable(document);
	});

	it("names the custom route DTOs after their handler methods, so they stay apart from each other and from the generated route DTOs", () => {
		const schemaNames: Array<string> = Object.keys(document.components?.schemas ?? {});

		expect(schemaNames).toContain("E2eDtoNameCustomItemGetPublicParametersDTO");
		expect(schemaNames).toContain("E2eDtoNameCustomItemGetMineParametersDTO");
		expect(schemaNames).toContain("E2eDtoNameCustomItemGetResponseDTO");
		expect(schemaNames.filter((name: string): boolean => name.startsWith("E2eDtoNameCustomItemGetParameters"))).toHaveLength(1);
	});
});

describe("controller names that cannot start generated DTO names (E2E)", () => {
	it("fails startup for an application with two controller classes named UserController, naming both paths", async () => {
		const { UserController: AdminUserController }: typeof import("./controller-dto-names/duplicate/admin-user.controller") = await import("./controller-dto-names/duplicate/admin-user.controller");
		const { UserController: PublicUserController }: typeof import("./controller-dto-names/duplicate/public-user.controller") = await import("./controller-dto-names/duplicate/public-user.controller");
		const moduleReference = await Test.createTestingModule({
			controllers: [AdminUserController, PublicUserController],
			imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities: [E2eDtoNameItemEntity], logging: false, synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature([E2eDtoNameItemEntity]), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
			providers: [E2eDtoNameItemService],
		}).compile();
		const application: INestApplication = moduleReference.createNestApplication(new FastifyAdapter());

		await expect(application.init()).rejects.toThrow('Controllers UserController in module RootTestModule (path "admin/users") and UserController in module RootTestModule (path "public/users") have the same schema prefix "User" in one application');
		await moduleReference.close();
	});

	it("fails startup for an anonymous controller class", () => {
		const anonymousController: new () => { service: E2eDtoNameItemService } = (() =>
			class {
				public readonly service!: E2eDtoNameItemService;
			})();

		expect(() =>
			ApiController<E2eDtoNameItemEntity>({
				entity: E2eDtoNameItemEntity,
				path: "anonymous/dto-name-items",
				routes: {
					[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
					[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
					[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
					[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
				},
			})(anonymousController),
		).toThrow('Controller with path "anonymous/dto-name-items" is an anonymous class');
	});
});

describe("generated DTO names of properties copied into hand-written DTOs (E2E)", () => {
	let app: INestApplication | undefined;
	let document: OpenAPIObject;

	beforeAll(async () => {
		const moduleReference = await Test.createTestingModule({
			controllers: [E2eDtoNameCopyController],
			imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities: [E2eDtoNameOwnerEntity, E2eDtoNameRecordEntity], logging: false, synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature([E2eDtoNameRecordEntity]), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
			providers: [E2eDtoNameRecordService],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
	});

	afterAll(async () => {
		await app?.close();
	});

	const reference = (schemaName: string, propertyName: string): string | undefined => {
		const property: ISchema | undefined = (document.components?.schemas?.[schemaName] as ISchema | undefined)?.properties?.[propertyName];

		return property?.$ref ?? (property as { allOf?: Array<ISchema> } | undefined)?.allOf?.[0]?.$ref ?? (property as { oneOf?: Array<ISchema> } | undefined)?.oneOf?.[0]?.$ref;
	};

	it("resolves every component reference", () => {
		expectEveryReferenceToResolve(document);
	});

	it("reaches every component from a route", () => {
		expectEveryComponentToBeReachable(document);
	});

	it("names one entity property copied into two properties of one host DTO after each host property", () => {
		expect(reference("E2eDtoNameCopyHostDTO", "owner")).toBe(`${COMPONENT_REFERENCE_PREFIX}E2eDtoNameCopyHostOwnerDTO`);
		expect(reference("E2eDtoNameCopyHostDTO", "previousOwner")).toBe(`${COMPONENT_REFERENCE_PREFIX}E2eDtoNameCopyHostPreviousOwnerDTO`);
		expect(reference("E2eDtoNameCopyHostDTO", "details")).toBe(`${COMPONENT_REFERENCE_PREFIX}E2eDtoNameCopyHostDetailsVariantDTO`);
		expect(reference("E2eDtoNameCopyHostDTO", "previousDetails")).toBe(`${COMPONENT_REFERENCE_PREFIX}E2eDtoNameCopyHostPreviousDetailsVariantDTO`);
		expect(document.components?.schemas).toHaveProperty("E2eDtoNameCopyHostDetailsVariantDTO");
		expect(document.components?.schemas).toHaveProperty("E2eDtoNameCopyHostPreviousDetailsVariantDTO");
	});

	it("names the copies of one entity property in GET and GET_LIST contexts of one host DTO after each host property", () => {
		expect(reference("E2eDtoNameCopyContextDTO", "owner")).toBe(`${COMPONENT_REFERENCE_PREFIX}E2eDtoNameCopyContextOwnerDTO`);
		expect(reference("E2eDtoNameCopyContextDTO", "listOwner")).toBe(`${COMPONENT_REFERENCE_PREFIX}E2eDtoNameCopyContextListOwnerDTO`);
	});
});
