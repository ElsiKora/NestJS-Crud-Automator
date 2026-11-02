import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";

import { Logger } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { DataSource } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../src/index";

import { E2eValidationPipe } from "./app/validation-pipe";
import { SAME_NAME_ENTITY_EVENTS, SameNameFirstItemCursorModule, SameNameFirstItemEntity, SameNameFirstItemModule, SameNameRelationFirstHolderEntity, SameNameRelationFirstOwnerEntity, SameNameRelationModule, SameNameRelationSecondHolderEntity, SameNameRelationSecondOwnerEntity, SameNameSecondItemCursorModule, SameNameSecondItemEntity, SameNameSecondItemModule } from "./same-name-entities";
import { SameNameRulesDigitEntity, SameNameRulesDigitModule, SameNameRulesLowerEntity, SameNameRulesLowerModule } from "./same-name-entities/both-entities-first/modules";
import { SameNameLateHolderEntity, SameNameLateModule, SameNameLateOwnerEntity } from "./same-name-entities/late-arrival";
import { createScopedHolder, declareOwner } from "./same-name-entities/request-scoped/fixture";
import { SameNameAdminGuard, SameNameGuardedAdminModule, SameNameGuardedDifferentControllersModule, SameNameGuardedEntity, SameNameGuardedPublicModule, SameNamePublicGuard } from "./same-name-entities/same-guard-name";
import { SameNameTwinFirstEntity, SameNameTwinFirstModule, SameNameTwinSecondEntity, SameNameTwinSecondModule } from "./same-name-entities/same-controller-name";

describe.each<{ driver: "better-sqlite3" | "postgres" }>([{ driver: "better-sqlite3" }, { driver: "postgres" }])("Entity classes that share one name on $driver (E2E)", ({ driver }: { driver: "better-sqlite3" | "postgres" }) => {
	let app: INestApplication | undefined;
	let container: StartedPostgreSqlContainer | undefined;
	let fastify: { inject: (options: { method: string; payload?: object; url: string }) => Promise<{ json: () => Record<string, unknown>; statusCode: number }> };

	beforeAll(async () => {
		const entities: Array<new () => object> = [SameNameFirstItemEntity, SameNameRelationFirstHolderEntity, SameNameRelationFirstOwnerEntity, SameNameRelationSecondHolderEntity, SameNameRelationSecondOwnerEntity, SameNameSecondItemEntity];

		if (driver === "postgres") {
			container = await new PostgreSqlContainer("postgres:17-alpine").start();
		}

		const moduleReference = await Test.createTestingModule({
			imports: [
				TypeOrmModule.forRoot(container ? { dropSchema: true, entities, logging: false, synchronize: true, type: "postgres", url: container.getConnectionUri() } : { database: ":memory:", dropSchema: true, entities, logging: false, synchronize: true, type: "better-sqlite3" }),
				ApiAuthorizationModule.forRoot(),
				ApiSubscriberModule,
				SameNameFirstItemModule,
				SameNameRelationModule,
				SameNameSecondItemModule,
				...(container ? [SameNameFirstItemCursorModule, SameNameSecondItemCursorModule] : []),
			],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		app.useGlobalPipes(new E2eValidationPipe());
		await app.init();
		await (app.getHttpAdapter().getInstance() as { ready: () => Promise<void> }).ready();
		fastify = app.getHttpAdapter().getInstance();
	});

	beforeEach(() => {
		SAME_NAME_ENTITY_EVENTS.length = 0;
	});

	afterAll(async () => {
		await app?.close();
		await container?.stop();
	});

	it("declares two distinct classes with one name", () => {
		expect(SameNameFirstItemEntity).not.toBe(SameNameSecondItemEntity);
		expect(SameNameFirstItemEntity.name).toBe(SameNameSecondItemEntity.name);
	});

	it("validates each create body against its own entity", async () => {
		const first = await fastify.inject({ method: "POST", payload: { alpha: "abc" }, url: "/same-name-first-items" });
		const firstInvalid = await fastify.inject({ method: "POST", payload: { alpha: "ABC" }, url: "/same-name-first-items" });
		const second = await fastify.inject({ method: "POST", payload: { beta: 3 }, url: "/same-name-second-items" });
		const secondInvalid = await fastify.inject({ method: "POST", payload: { beta: 30 }, url: "/same-name-second-items" });

		expect(first.statusCode).toBe(201);
		expect(first.json()).toMatchObject({ alpha: "abc" });
		expect(firstInvalid.statusCode).toBe(400);
		expect(second.statusCode).toBe(201);
		expect(second.json()).toMatchObject({ beta: 3 });
		expect(secondInvalid.statusCode).toBe(400);
	});

	it("runs only the subscribers of the entity class behind the route", async () => {
		await fastify.inject({ method: "POST", payload: { beta: 4 }, url: "/same-name-second-items" });

		expect(SAME_NAME_ENTITY_EVENTS.toSorted()).toEqual(["second:function:create", "second:route:create"]);
	});

	it("builds each list query from its own entity", async () => {
		const secondByBeta = await fastify.inject({ method: "GET", url: "/same-name-second-items?limit=10&page=1&orderBy=beta&orderDirection=asc" });
		const firstByAlpha = await fastify.inject({ method: "GET", url: "/same-name-first-items?limit=10&page=1&orderBy=alpha&orderDirection=asc" });

		expect(secondByBeta.statusCode).toBe(200);
		expect((secondByBeta.json().items as Array<{ beta: number }>).map((item) => item.beta)).toEqual([3, 4]);
		expect(firstByAlpha.statusCode).toBe(200);
		expect((firstByAlpha.json().items as Array<{ alpha: string }>).map((item) => item.alpha)).toEqual(["abc"]);
	});

	describe("relation and primary key of a same-named entity", () => {
		let holderCode: string;
		const count = async (query: string): Promise<unknown> => (await fastify.inject({ method: "GET", url: `/same-name-relation-holders?limit=10&page=1${query}` })).json().totalCount;

		beforeAll(async () => {
			const dataSource: DataSource = (app as INestApplication).get(DataSource);
			const owner: SameNameRelationSecondOwnerEntity = await dataSource.getRepository(SameNameRelationSecondOwnerEntity).save({ onlyOnB: "y" });
			const holder: SameNameRelationSecondHolderEntity = await dataSource.getRepository(SameNameRelationSecondHolderEntity).save({ id: "ordinary", owner });

			holderCode = holder.code;
		});

		it("reads the row through the primary key of its own class", async () => {
			const response = await fastify.inject({ method: "GET", url: `/same-name-relation-holders/${holderCode}` });

			expect(response.statusCode).toBe(200);
			expect(response.json()).toMatchObject({ code: holderCode, id: "ordinary" });
		});

		it("filters through the relation of its own class", async () => {
			expect(await count("")).toBe(1);
			expect(await count("&owner.onlyOnB%5Boperator%5D=eq&owner.onlyOnB%5Bvalue%5D=y")).toBe(1);
			expect(await count("&owner.onlyOnB%5Boperator%5D=eq&owner.onlyOnB%5Bvalue%5D=x")).toBe(0);
			expect(await count("&owner.onlyOnA%5Boperator%5D=eq&owner.onlyOnA%5Bvalue%5D=x")).toBe(1);
		});

		it("publishes the path and relation filters of its own class in OpenAPI", () => {
			const paths = SwaggerModule.createDocument(app as INestApplication, new DocumentBuilder().build()).paths;
			const parameterNames = (paths["/same-name-relation-holders"]?.get?.parameters ?? []).map((parameter) => ("name" in parameter ? parameter.name : ""));

			expect(paths).toHaveProperty(["/same-name-relation-holders/{code}"]);
			expect(paths).not.toHaveProperty(["/same-name-relation-holders/{id}"]);
			expect(parameterNames).toContain("owner.onlyOnB[value]");
			expect(parameterNames.filter((name) => name.includes("onlyOnA"))).toEqual([]);
		});
	});

	it("names the DTOs of each module after its controller and keeps the fields of its own class", () => {
		const document = SwaggerModule.createDocument(app as INestApplication, new DocumentBuilder().build());
		const schemaOf = (path: string): { $ref?: string } | undefined => (document.paths[path]?.get?.responses["200"] as { content?: Record<string, { schema?: { $ref?: string } }> } | undefined)?.content?.["application/json"]?.schema;
		const fieldsOf = (name: string): Array<string> => Object.keys((document.components?.schemas?.[name] as { properties?: object } | undefined)?.properties ?? {}).toSorted();

		expect(schemaOf("/same-name-first-items/{id}")?.$ref).toBe("#/components/schemas/SameNameFirstItemGetResponseDTO");
		expect(schemaOf("/same-name-second-items/{id}")?.$ref).toBe("#/components/schemas/SameNameSecondItemGetResponseDTO");
		expect(fieldsOf("SameNameFirstItemGetResponseDTO")).toEqual(["alpha", "id"]);
		expect(fieldsOf("SameNameSecondItemGetResponseDTO")).toEqual(["beta", "id"]);
		expect(fieldsOf("SameNameFirstItemCreateBodyDTO")).toEqual(["alpha"]);
		expect(fieldsOf("SameNameSecondItemCreateBodyDTO")).toEqual(["beta"]);
	});

	it.runIf(driver === "postgres")("pages each CURSOR list through the wrapper of its own entity and item class", async () => {
		const first = await fastify.inject({ method: "GET", url: "/same-name-first-items-cursor?limit=10" });
		const secondPage = await fastify.inject({ method: "GET", url: "/same-name-second-items-cursor?limit=1" });
		const secondNextPage = await fastify.inject({ method: "GET", url: `/same-name-second-items-cursor?limit=1&after=${encodeURIComponent(String(secondPage.json().nextCursor))}` });

		expect(first.statusCode).toBe(200);
		expect(first.json().items).toEqual([{ alpha: "abc", id: expect.any(String) }]);
		expect(secondPage.statusCode).toBe(200);
		expect(secondNextPage.statusCode).toBe(200);
		expect([...(secondPage.json().items as Array<{ beta: number }>), ...(secondNextPage.json().items as Array<{ beta: number }>)].map((item) => item.beta).toSorted()).toEqual([3, 4]);
		expect(Object.keys((secondPage.json().items as Array<object>)[0] ?? {}).toSorted()).toEqual(["beta", "id"]);
	});
});

describe("Entity and controller classes that share one name in two modules (E2E)", () => {
	const boot = async (modules: Array<new () => object>, entities: Array<new () => object>): Promise<INestApplication> => {
		const moduleReference = await Test.createTestingModule({
			imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities, logging: false, synchronize: true, type: "better-sqlite3" }), ApiAuthorizationModule.forRoot(), ...modules],
		}).compile();
		const application: INestApplication = moduleReference.createNestApplication(new FastifyAdapter());

		application.useGlobalPipes(new E2eValidationPipe());

		try {
			await application.init();
			await (application.getHttpAdapter().getInstance() as { ready: () => Promise<void> }).ready();
		} catch (error) {
			await application.close();

			throw error;
		}

		return application;
	};

	it.each([
		{ entity: SameNameTwinFirstEntity, field: "alpha", module: SameNameTwinFirstModule, otherField: "beta", path: "/same-name-twins-first" },
		{ entity: SameNameTwinSecondEntity, field: "beta", module: SameNameTwinSecondModule, otherField: "alpha", path: "/same-name-twins-second" },
	])("gives the application of one module the DTOs of its own class on $path", async ({ entity, field, module, otherField, path }) => {
		const application: INestApplication = await boot([module], [entity]);

		try {
			const fastify = application.getHttpAdapter().getInstance() as { inject: (options: { method: string; payload?: object; url: string }) => Promise<{ statusCode: number }> };
			const schemas = SwaggerModule.createDocument(application, new DocumentBuilder().build()).components?.schemas ?? {};
			const properties = (name: string): object => (schemas[name] as { properties?: object } | undefined)?.properties ?? {};

			expect(properties("SameNameTwinGetResponseDTO")).toHaveProperty([field]);
			expect(properties("SameNameTwinGetResponseDTO")).not.toHaveProperty([otherField]);
			expect(properties("SameNameTwinCreateBodyDTO")).toHaveProperty([field]);
			expect(properties("SameNameTwinCreateBodyDTO")).not.toHaveProperty([otherField]);
			expect((await fastify.inject({ method: "POST", payload: { [field]: "abc" }, url: path })).statusCode).toBe(201);
			expect((await fastify.inject({ method: "POST", payload: { [field]: "ABC" }, url: path })).statusCode).toBe(400);
		} finally {
			await application.close();
		}
	});

	it("fails the startup of one application with both modules, naming the modules", async () => {
		const failure: Promise<INestApplication> = boot([SameNameTwinFirstModule, SameNameTwinSecondModule], [SameNameTwinFirstEntity, SameNameTwinSecondEntity]);

		await expect(failure).rejects.toThrowError('have the same schema prefix "SameNameTwin" in one application');
		await expect(failure).rejects.toThrowError(/in module SameNameTwinFirstModule.*in module SameNameTwinSecondModule/);
	});
});

describe("Guard classes that share one name and see different fields (E2E)", () => {
	type TInject = (options: { method: string; url: string }) => Promise<{ json: () => Record<string, unknown>; statusCode: number }>;

	const boot = async (modules: Array<new () => object>): Promise<{ application: INestApplication; id: string; inject: TInject }> => {
		const moduleReference = await Test.createTestingModule({
			imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities: [SameNameGuardedEntity], logging: false, synchronize: true, type: "better-sqlite3" }), ApiAuthorizationModule.forRoot(), ...modules],
		}).compile();
		const application: INestApplication = moduleReference.createNestApplication(new FastifyAdapter());

		application.useGlobalPipes(new E2eValidationPipe());

		try {
			await application.init();
			await (application.getHttpAdapter().getInstance() as { ready: () => Promise<void> }).ready();
		} catch (error) {
			await application.close();

			throw error;
		}

		const row: SameNameGuardedEntity = await application.get(DataSource).getRepository(SameNameGuardedEntity).save({ label: "label", secret: "secret" });

		return { application, id: row.id, inject: (application.getHttpAdapter().getInstance() as { inject: TInject }).inject.bind(application.getHttpAdapter().getInstance()) };
	};

	const schemaFields = (application: INestApplication, name: string): Array<string> => Object.keys((SwaggerModule.createDocument(application, new DocumentBuilder().build()).components?.schemas?.[name] as { properties?: object } | undefined)?.properties ?? {}).toSorted();

	it("declares two different guard classes with one name", () => {
		expect(SameNameAdminGuard).not.toBe(SameNamePublicGuard);
		expect(SameNameAdminGuard.name).toBe(SameNamePublicGuard.name);
	});

	it("keeps the schema and the response of each guard on two controllers of one application", async () => {
		const { application, id, inject } = await boot([SameNameGuardedDifferentControllersModule]);

		try {
			expect(schemaFields(application, "SameNameGuardedStaffGetResponseDTO")).toEqual(["id", "label", "secret"]);
			expect(schemaFields(application, "SameNameGuardedGuestGetResponseDTO")).toEqual(["id", "label"]);
			expect((await inject({ method: "GET", url: `/same-name-guarded-staff/${id}` })).json()).toEqual({ id, label: "label", secret: "secret" });
			expect((await inject({ method: "GET", url: `/same-name-guarded-guest/${id}` })).json()).toEqual({ id, label: "label" });
		} finally {
			await application.close();
		}
	});

	it.each([
		{ fields: ["id", "label", "secret"], module: SameNameGuardedAdminModule, path: "same-name-guarded-admin", response: { label: "label", secret: "secret" } },
		{ fields: ["id", "label"], module: SameNameGuardedPublicModule, path: "same-name-guarded-public", response: { label: "label" } },
	])("keeps the schema and the response of the guard in a separate application with a same-named controller on /$path", async ({ fields, module, path, response }) => {
		const { application, id, inject } = await boot([module]);

		try {
			expect(schemaFields(application, "SameNameGuardedGetResponseDTO")).toEqual(fields);
			expect((await inject({ method: "GET", url: `/${path}/${id}` })).json()).toEqual({ id, ...response });
		} finally {
			await application.close();
		}
	});

	it("fails the startup of one application with both same-named controllers instead of sharing a schema name", async () => {
		const failure: Promise<unknown> = boot([SameNameGuardedAdminModule, SameNameGuardedPublicModule]);

		await expect(failure).rejects.toThrowError('have the same schema prefix "SameNameGuarded" in one application');
		await expect(failure).rejects.toThrowError(/in module SameNameGuardedAdminModule.*in module SameNameGuardedPublicModule/);
	});
});

describe("Two same-named entity classes both imported before any controller (E2E)", () => {
	it("keeps the rules of each class for one property name", async () => {
		const moduleReference = await Test.createTestingModule({
			imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities: [SameNameRulesLowerEntity, SameNameRulesDigitEntity], logging: false, synchronize: true, type: "better-sqlite3" }), ApiAuthorizationModule.forRoot(), SameNameRulesLowerModule, SameNameRulesDigitModule],
		}).compile();
		const application: INestApplication = moduleReference.createNestApplication(new FastifyAdapter());

		application.useGlobalPipes(new E2eValidationPipe());
		await application.init();
		await (application.getHttpAdapter().getInstance() as { ready: () => Promise<void> }).ready();

		try {
			const fastify = application.getHttpAdapter().getInstance() as { inject: (options: { method: string; payload: object; url: string }) => Promise<{ statusCode: number }> };
			const post = async (path: string, label: string): Promise<number> => (await fastify.inject({ method: "POST", payload: { label }, url: `/same-name-rules-${path}` })).statusCode;
			const schemas = SwaggerModule.createDocument(application, new DocumentBuilder().build()).components?.schemas ?? {};
			const pattern = (name: string): unknown => (schemas[name] as { properties?: { label?: { pattern?: unknown } } } | undefined)?.properties?.label?.pattern;

			expect([await post("lower", "abc"), await post("lower", "123")]).toEqual([201, 400]);
			expect([await post("digit", "123"), await post("digit", "abc")]).toEqual([201, 400]);
			expect(pattern("SameNameRulesLowerCreateBodyDTO")).toBe("^[a-z]+$");
			expect(pattern("SameNameRulesDigitCreateBodyDTO")).toBe("^[0-9]+$");
		} finally {
			await application.close();
		}
	});
});

describe("Request-scoped controller and a same-named relation target (E2E)", () => {
	const boot = async (entities: Array<new () => object>, module: new () => object): Promise<INestApplication> => {
		const moduleReference = await Test.createTestingModule({
			imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities, logging: false, synchronize: true, type: "better-sqlite3" }), ApiAuthorizationModule.forRoot(), module],
		}).compile();
		const application: INestApplication = moduleReference.createNestApplication(new FastifyAdapter());

		application.useGlobalPipes(new E2eValidationPipe());

		try {
			await application.init();
			await (application.getHttpAdapter().getInstance() as { ready: () => Promise<void> }).ready();
		} catch (error) {
			await application.close();

			throw error;
		}

		return application;
	};

	it("fails at startup when the second class arrived before the application started, as a singleton does", async () => {
		const Owner = declareOwner("SameNameScopedEarlyOwnerEntity", "e2e_same_name_scoped_early_owners_first");
		const { Holder, HolderModule } = createScopedHolder("SameNameScopedEarlyOwnerEntity", "e2e_same_name_scoped_early_holders", "same-name-scoped-early", "SameNameScopedEarlyController");

		declareOwner("SameNameScopedEarlyOwnerEntity", "e2e_same_name_scoped_early_owners_second");

		await expect(boot([Holder, Owner], HolderModule)).rejects.toThrowError('Metadata target "SameNameScopedEarlyOwnerEntity" matches 2 entity classes in TypeORM metadata');
	});

	it("keeps answering a plain list and fails only the filter through the relation when the second class arrives later, as a singleton does", async () => {
		const errors = vi.spyOn(Logger.prototype, "error").mockImplementation((): void => undefined);
		const Owner = declareOwner("SameNameScopedLateOwnerEntity", "e2e_same_name_scoped_late_owners_first");
		const { Holder, HolderModule } = createScopedHolder("SameNameScopedLateOwnerEntity", "e2e_same_name_scoped_late_holders", "same-name-scoped-late", "SameNameScopedLateController");
		const application: INestApplication = await boot([Holder, Owner], HolderModule);

		try {
			const fastify = application.getHttpAdapter().getInstance() as { inject: (options: { method: string; url: string }) => Promise<{ statusCode: number }> };
			const plain = async (): Promise<number> => (await fastify.inject({ method: "GET", url: "/same-name-scoped-late?limit=10&page=1" })).statusCode;

			expect(await plain()).toBe(200);

			declareOwner("SameNameScopedLateOwnerEntity", "e2e_same_name_scoped_late_owners_second");

			expect(await plain()).toBe(200);
			expect((await fastify.inject({ method: "GET", url: "/same-name-scoped-late?limit=10&page=1&owner.label%5Boperator%5D=eq&owner.label%5Bvalue%5D=x" })).statusCode).toBe(500);
			expect(errors.mock.calls.flat().join(" ")).toContain('Metadata target "SameNameScopedLateOwnerEntity" matches 2 entity classes');
			expect(await plain()).toBe(200);
		} finally {
			errors.mockRestore();
			await application.close();
		}
	});
});

describe("String relation target that names several entity classes (E2E)", () => {
	it("fails at startup with an error naming the target", async () => {
		const boot = async (): Promise<void> => {
			const { SameNameAmbiguousHolderController } = await import("./same-name-entities/ambiguous");
			const moduleReference = await Test.createTestingModule({ controllers: [SameNameAmbiguousHolderController], imports: [ApiAuthorizationModule.forRoot()] }).compile();
			const application: INestApplication = moduleReference.createNestApplication(new FastifyAdapter());

			try {
				await application.init();
			} finally {
				await application.close();
			}
		};

		await expect(boot()).rejects.toThrowError('Metadata target "SameNameAmbiguousOwnerEntity" matches 2 entity classes in TypeORM metadata');
	});

	it("fails at startup on a GET_LIST route with a manual QUERY DTO", async () => {
		await expect(import("./same-name-entities/ambiguous/manual-query-controller")).rejects.toThrowError('Metadata target "SameNameAmbiguousOwnerEntity" matches 2 entity classes in TypeORM metadata');
	});

	it("fails at startup on a GET_LIST route with a typed filter", async () => {
		await expect(import("./same-name-entities/ambiguous/typed-controller")).rejects.toThrowError('Metadata target "SameNameAmbiguousOwnerEntity" matches 2 entity classes in TypeORM metadata');
	});

	describe("when the second class is imported after the controller was decorated", () => {
		it.each(["SameNameImportOrderGeneratedController", "SameNameImportOrderManualController", "SameNameImportOrderTypedController"] as const)("fails at startup on %s", async (controllerName) => {
			const controllers = await import("./same-name-entities/import-order/controllers");

			await import("./same-name-entities/import-order/app-owner");

			await expect(Test.createTestingModule({ controllers: [controllers[controllerName]], imports: [ApiAuthorizationModule.forRoot()] }).compile()).rejects.toThrowError('Metadata target "SameNameImportOrderOwnerEntity" matches 2 entity classes in TypeORM metadata');
		});
	});

	describe("when the second class is loaded after the controllers were instantiated", () => {
		const relationFilter = (field: string): string => `limit=10&page=1&owner.${field}%5Boperator%5D=eq&owner.${field}%5Bvalue%5D=x`;
		let app: INestApplication;
		let fastify: { inject: (options: { method: string; url: string }) => Promise<{ statusCode: number }> };

		beforeAll(async () => {
			const moduleReference = await Test.createTestingModule({
				imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities: [SameNameLateHolderEntity, SameNameLateOwnerEntity], logging: false, synchronize: true, type: "better-sqlite3" }), ApiAuthorizationModule.forRoot(), SameNameLateModule],
			}).compile();

			app = moduleReference.createNestApplication(new FastifyAdapter());
			await app.init();
			await (app.getHttpAdapter().getInstance() as { ready: () => Promise<void> }).ready();
			fastify = app.getHttpAdapter().getInstance();

			expect((await fastify.inject({ method: "GET", url: `/same-name-late-typed-holders?${relationFilter("label")}` })).statusCode).toBe(200);
			expect((await fastify.inject({ method: "GET", url: `/same-name-late-typed-holders?${relationFilter("lateOnly")}` })).statusCode).toBe(400);

			await import("./same-name-entities/late-arrival/late-owner");
		});

		afterAll(async () => {
			await app.close();
		});

		it.each([
			["typed", "/same-name-late-typed-holders", "label"],
			["typed", "/same-name-late-typed-holders", "lateOnly"],
			["manual", "/same-name-late-manual-holders", "label"],
		])("answers a %s route's relation filter %s %s with the ambiguity error", async (_route, path, field) => {
			const loggerError = vi.spyOn(Logger.prototype, "error");
			const response = await fastify.inject({ method: "GET", url: `${path}?${relationFilter(field)}` });
			const logged: string = loggerError.mock.calls.map((call) => String(call[0])).join("\n");

			loggerError.mockRestore();

			expect(response.statusCode).toBe(500);
			expect(logged).toContain('Metadata target "SameNameLateOwnerEntity" matches 2 entity classes in TypeORM metadata');
		});

		it("keeps answering requests that do not reach the relation", async () => {
			expect((await fastify.inject({ method: "GET", url: "/same-name-late-typed-holders?limit=10&page=1" })).statusCode).toBe(200);
			expect((await fastify.inject({ method: "GET", url: "/same-name-late-typed-holders?limit=10&page=1&unknown%5Boperator%5D=eq&unknown%5Bvalue%5D=x" })).statusCode).toBe(400);
		});
	});
});
