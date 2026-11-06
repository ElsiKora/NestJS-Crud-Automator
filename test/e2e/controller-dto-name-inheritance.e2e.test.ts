import "reflect-metadata";

import type { INestApplication, Type } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";

import { HttpStatus, ValidationPipe } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../src/index";
import { E2eDtoNameItemEntity, E2eDtoNameItemService } from "./controller-dto-names";
import {
	E2eDtoNameAnonymousMineController,
	E2eDtoNameAnonymousMixinController,
	E2eDtoNameChainChildController,
	E2eDtoNameChildCrudController,
	E2eDtoNameCountingInterceptor,
	E2eDtoNameGuardedAController,
	E2eDtoNameGuardedBase,
	E2eDtoNameGuardedBController,
	E2eDtoNameLoggedKaController,
	E2eDtoNameLoggedKbController,
	E2eDtoNameMineMixinAController,
	E2eDtoNameMineMixinBController,
	E2eDtoNameOverrideController,
	E2eDtoNameRenamePostAController,
	E2eDtoNameRenamePostBController,
	E2eDtoNameSharedAController,
	E2eDtoNameSharedBController,
	E2eDtoNameTwoLevelsController,
} from "./controller-dto-names/inheritance";
import { E2eHydrationAttachmentEntity, E2eHydrationBankDetailEntity, E2eHydrationCardDetailEntity, E2eHydrationDetailEntity, E2eHydrationNoteEntity, E2eHydrationOwnerEntity, E2eHydrationPostEntity, E2eHydrationTagEntity } from "./to-many-relation-request/entity";
import { E2eHydrationPostService } from "./to-many-relation-request/service";

const RUNTIME_SCHEMA_PREFIXES: Array<string> = vi.hoisted((): Array<string> => []);

vi.mock("@utility/api/controller/get/dto.utility", async (importOriginal: () => Promise<typeof import("@utility/api/controller/get/dto.utility")>) => {
	const original: typeof import("@utility/api/controller/get/dto.utility") = await importOriginal();

	return {
		...original,
		ApiControllerGetResponseDto: (...arguments_: Parameters<typeof original.ApiControllerGetResponseDto>): ReturnType<typeof original.ApiControllerGetResponseDto> => {
			RUNTIME_SCHEMA_PREFIXES.push(arguments_[4]);

			return original.ApiControllerGetResponseDto(...arguments_);
		},
	};
});

interface ISchema {
	$ref?: string;
	properties?: Record<string, ISchema>;
}

interface IInheritanceApp {
	app: INestApplication;
	document: OpenAPIObject;
	inject: (url: string) => Promise<{ fields: Array<string>; statusCode: number }>;
}

/**
 * Starts an application with the given controllers and one stored item.
 * @param {Array<Type<unknown>>} controllers - Controller classes to register.
 * @param {boolean} [shouldValidate] - Whether to install the global validation pipe that an application uses.
 * @returns {Promise<IInheritanceApp>} The application, its OpenAPI document and a GET helper.
 */
async function startApp(controllers: Array<Type<unknown>>, shouldValidate: boolean = false): Promise<IInheritanceApp> {
	const moduleReference = await Test.createTestingModule({
		controllers,
		imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities: [E2eDtoNameItemEntity], logging: false, synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature([E2eDtoNameItemEntity]), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
		providers: [E2eDtoNameItemService],
	}).compile();
	const app: INestApplication = moduleReference.createNestApplication(new FastifyAdapter());

	if (shouldValidate) {
		app.useGlobalPipes(new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }));
	}

	await app.init();
	await app.get(E2eDtoNameItemService).repository.save({ id: "item-1", name: "Item", secret: "Secret" });

	const fastify: { inject: (options: { method: string; url: string }) => Promise<{ json: () => unknown; statusCode: number }> } = app.getHttpAdapter().getInstance();

	return {
		app,
		document: SwaggerModule.createDocument(app, new DocumentBuilder().build()),
		inject: async (url: string): Promise<{ fields: Array<string>; statusCode: number }> => {
			const response = await fastify.inject({ method: "GET", url });

			return { fields: Object.keys(response.json() as Record<string, unknown>).sort(), statusCode: response.statusCode };
		},
	};
}

/**
 * Resolves the GET response component of a path.
 * @param {OpenAPIObject} document - OpenAPI document.
 * @param {string} path - Documented path.
 * @returns {{ fields: Array<string>; name: string }} The component name and its property names.
 */
function getResponseComponent(document: OpenAPIObject, path: string): { fields: Array<string>; name: string } {
	const reference: string = String((document.paths[path]?.get?.responses[String(HttpStatus.OK)] as { content?: Record<string, { schema?: ISchema }> } | undefined)?.content?.["application/json"]?.schema?.$ref);
	const name: string = reference.replace("#/components/schemas/", "");

	return { fields: Object.keys((document.components?.schemas?.[name] as ISchema | undefined)?.properties ?? {}).sort(), name };
}

describe("generated routes on a controller subclass (E2E)", () => {
	describe("an anonymous mixin over a decorated controller", () => {
		let started: IInheritanceApp | undefined;

		beforeAll(async () => {
			started = await startApp([E2eDtoNameAnonymousMixinController]);
		});

		afterAll(async () => {
			await started?.app.close();
		});

		it("serves the generated GET route with the decorated controller's DTOs", async () => {
			const response: { fields: Array<string>; statusCode: number } = await (started as IInheritanceApp).inject("/mixin/dto-name-items/item-1");

			expect(response.statusCode).toBe(HttpStatus.OK);
			expect(getResponseComponent((started as IInheritanceApp).document, "/mixin/dto-name-items/{id}")).toEqual({ fields: response.fields, name: "E2eDtoNameMixinBaseGetResponseDTO" });
		});
	});

	describe("one named mixin over two decorated controllers", () => {
		let started: IInheritanceApp | undefined;

		beforeAll(async () => {
			started = await startApp([E2eDtoNameLoggedKaController, E2eDtoNameLoggedKbController]);
		});

		afterAll(async () => {
			await started?.app.close();
		});

		it.each([
			["/ka/dto-name-items", "E2eDtoNameKaGetResponseDTO", ["id", "name", "secret"]],
			["/kb/dto-name-items", "E2eDtoNameKbGetResponseDTO", ["id", "name"]],
		])("serves %s with its own decorated controller's DTOs", async (path: string, componentName: string, expectedFields: Array<string>) => {
			const response: { fields: Array<string>; statusCode: number } = await (started as IInheritanceApp).inject(`${path}/item-1`);

			expect(response.statusCode).toBe(HttpStatus.OK);
			expect(response.fields).toEqual(expectedFields);
			expect(getResponseComponent((started as IInheritanceApp).document, `${path}/{id}`)).toEqual({ fields: expectedFields, name: componentName });
		});
	});

	describe("a subclass of a decorated controller", () => {
		let started: IInheritanceApp | undefined;

		beforeAll(async () => {
			started = await startApp([E2eDtoNameChildCrudController]);
		});

		afterAll(async () => {
			await started?.app.close();
		});

		it("serializes the response with the DTO that the document shows, named after the decorated class", async () => {
			RUNTIME_SCHEMA_PREFIXES.length = 0;

			const response: { fields: Array<string>; statusCode: number } = await (started as IInheritanceApp).inject("/base-crud/dto-name-items/item-1");

			expect(response.statusCode).toBe(HttpStatus.OK);
			expect(RUNTIME_SCHEMA_PREFIXES).toEqual(["E2eDtoNameBaseCrud"]);
			expect(getResponseComponent((started as IInheritanceApp).document, "/base-crud/dto-name-items/{id}")).toEqual({ fields: response.fields, name: "E2eDtoNameBaseCrudGetResponseDTO" });
		});
	});
});

describe("custom routes inherited by decorated controllers (E2E)", () => {
	describe.each([
		["a shared base class", [E2eDtoNameSharedAController, E2eDtoNameSharedBController], ["shared-a", "E2eDtoNameSharedA"], ["shared-b", "E2eDtoNameSharedB"]],
		["one mixin factory", [E2eDtoNameMineMixinAController, E2eDtoNameMineMixinBController], ["mine-mixin-a", "E2eDtoNameMineMixinA"], ["mine-mixin-b", "E2eDtoNameMineMixinB"]],
	] as const)("%s with a custom route under two controllers", (_label: string, controllers: ReadonlyArray<Type<unknown>>, first: readonly [string, string], second: readonly [string, string]) => {
		let started: IInheritanceApp | undefined;

		beforeAll(async () => {
			started = await startApp([...controllers]);
		});

		afterAll(async () => {
			await started?.app.close();
		});

		it("names the custom route DTOs of each controller after that decorated controller", () => {
			const schemaNames: Array<string> = Object.keys((started as IInheritanceApp).document.components?.schemas ?? {});

			expect(schemaNames).toContain(`${first[1]}MineParametersDTO`);
			expect(schemaNames).toContain(`${second[1]}MineParametersDTO`);
			expect(schemaNames.filter((name: string): boolean => name.endsWith("MineParametersDTO"))).toHaveLength(2);
		});

		it.each([first, second])("serves the custom route of %s", async (path: string) => {
			const fastify: { inject: (options: { method: string; url: string }) => Promise<{ statusCode: number }> } = (started as IInheritanceApp).app.getHttpAdapter().getInstance();

			expect((await fastify.inject({ method: "GET", url: `/${path}/dto-name-items/mine/item-1` })).statusCode).toBe(HttpStatus.NO_CONTENT);
		});
	});
});

describe("an inherited custom update route under two decorated controllers (E2E)", () => {
	const POST: string = "33333333-3333-4333-8333-333333333331";
	const TAG: string = "44444444-4444-4444-8444-444444444441";
	let app: INestApplication | undefined;
	let fastify: { inject: (options: { method: string; payload: object; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };
	let readTitle: () => Promise<string>;

	beforeAll(async () => {
		const moduleReference = await Test.createTestingModule({
			controllers: [E2eDtoNameRenamePostAController, E2eDtoNameRenamePostBController],
			imports: [
				TypeOrmModule.forRoot({
					database: ":memory:",
					dropSchema: true,
					entities: [E2eHydrationAttachmentEntity, E2eHydrationBankDetailEntity, E2eHydrationCardDetailEntity, E2eHydrationDetailEntity, E2eHydrationNoteEntity, E2eHydrationOwnerEntity, E2eHydrationPostEntity, E2eHydrationTagEntity],
					logging: false,
					synchronize: true,
					type: "better-sqlite3",
				}),
				TypeOrmModule.forFeature([E2eHydrationPostEntity]),
				ApiAuthorizationModule.forRoot(),
				ApiSubscriberModule,
			],
			providers: [E2eHydrationPostService],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		await app.getHttpAdapter().getInstance().ready();
		fastify = app.getHttpAdapter().getInstance();

		const service: E2eHydrationPostService = app.get(E2eHydrationPostService);
		const tag: E2eHydrationTagEntity = await service.repository.manager.save(E2eHydrationTagEntity, { id: TAG });

		await service.repository.manager.save(E2eHydrationPostEntity, { id: POST, tags: [tag], title: "stored" });
		readTitle = async (): Promise<string> => (await service.repository.findOneByOrFail({ id: POST })).title;
	});

	afterAll(async () => {
		await app?.close();
	});

	it.each(["rename-a", "rename-b"])("rejects a to-many key on the route inherited by %s before the handler runs", async (path: string) => {
		const response = await fastify.inject({ method: "PATCH", payload: { tags: [TAG], title: "changed" }, url: `/${path}/dto-name-posts/rename/${POST}` });
		const body = response.json() as { details?: unknown; message: string };

		expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
		expect(body.message).toContain("REFERENCE_NOT_VALID");
		expect(body.details).toEqual({ propertyName: "tags", type: "TO_MANY_UPDATE_KEY" });
		expect(await readTitle()).toBe("stored");
	});

	it.each(["rename-a", "rename-b"])("runs the handler of the route inherited by %s without a to-many key", async (path: string) => {
		const response = await fastify.inject({ method: "PATCH", payload: { title: `changed by ${path}` }, url: `/${path}/dto-name-posts/rename/${POST}` });

		expect(response.statusCode).toBe(HttpStatus.OK);
		expect(await readTitle()).toBe(`changed by ${path}`);
	});
});

describe("guards, interceptors and handlers of inherited custom routes (E2E)", () => {
	let started: IInheritanceApp | undefined;

	/**
	 * Sends a GET request to the started application.
	 * @param {string} url - Request URL.
	 * @returns {Promise<{ body: string; statusCode: number }>} The response status and raw body.
	 */
	const request = async (url: string): Promise<{ body: string; statusCode: number }> => {
		const response = await (started?.app.getHttpAdapter().getInstance() as { inject: (options: { method: string; url: string }) => Promise<{ payload: string; statusCode: number }> }).inject({ method: "GET", url });

		return { body: response.payload, statusCode: response.statusCode };
	};

	beforeAll(async () => {
		started = await startApp([E2eDtoNameGuardedAController, E2eDtoNameGuardedBController, E2eDtoNameOverrideController]);
	});

	afterAll(async () => {
		await started?.app.close();
	});

	it.each([
		["guarded-a", "denied-execution"],
		["guarded-b", "denied-execution"],
		["guarded-a", "denied-authentication"],
		["guarded-b", "denied-authentication"],
	])("keeps the refusing guard on the copy of the route that %s inherits: %s", async (controllerPath: string, route: string) => {
		const handlerCalls: number = E2eDtoNameGuardedBase.handlerCalls;
		const response = await request(`/${controllerPath}/dto-name-items/${route}/item-1`);

		expect(response.statusCode).toBe(HttpStatus.FORBIDDEN);
		expect(E2eDtoNameGuardedBase.handlerCalls).toBe(handlerCalls);
	});

	it.each(["guarded-a", "guarded-b"])("runs the interceptor and the handler of the route that %s inherits exactly once per request", async (controllerPath: string) => {
		const count: number = E2eDtoNameCountingInterceptor.count;
		const handlerCalls: number = E2eDtoNameGuardedBase.handlerCalls;
		const response = await request(`/${controllerPath}/dto-name-items/counted/item-1`);

		expect(response.statusCode).toBe(HttpStatus.NO_CONTENT);
		expect(E2eDtoNameCountingInterceptor.count).toBe(count + 1);
		expect(E2eDtoNameGuardedBase.handlerCalls).toBe(handlerCalls + 1);
	});

	it("keeps the body of a route that the controller overrides itself", async () => {
		const response = await request("/override/dto-name-items/source/item-1");

		expect(response.statusCode).toBe(HttpStatus.OK);
		expect(JSON.parse(response.body)).toEqual({ source: "own" });
	});
});

describe("custom routes inherited through several classes (E2E)", () => {
	it.each([
		["a decorated controller that extends a decorated controller", E2eDtoNameChainChildController, "/chain-child/dto-name-items/mine/{id}", "E2eDtoNameChainChildMineParametersDTO", ["E2eDtoNameChainParentMineParametersDTO", "E2eDtoNameSharedMineBaseMineParametersDTO"]],
		["a handler two classes up", E2eDtoNameTwoLevelsController, "/two-levels/dto-name-items/mine/{id}", "E2eDtoNameTwoLevelsMineParametersDTO", ["E2eDtoNameSharedMineBaseMineParametersDTO"]],
		["a class without a name under a decorated controller", E2eDtoNameAnonymousMineController, "/anonymous-mine/dto-name-items/mine/{id}", "E2eDtoNameAnonymousMineMineParametersDTO", []],
	])("names the request DTO after the served controller only: %s", async (_case: string, controller: Type<unknown>, path: string, name: string, foreign: Array<string>) => {
		const started: IInheritanceApp = await startApp([controller]);

		try {
			const schemas: Array<string> = Object.keys(started.document.components?.schemas ?? {});

			expect(started.document.paths[path]?.get).toBeDefined();
			expect(schemas).toContain(name);

			for (const foreignName of foreign) {
				expect(schemas).not.toContain(foreignName);
			}
		} finally {
			await started.app.close();
		}
	});

	it("validates the request of a route inherited from a class without a name", async () => {
		const started: IInheritanceApp = await startApp([E2eDtoNameAnonymousMineController], true);

		try {
			const fastify: { inject: (options: { method: string; url: string }) => Promise<{ statusCode: number }> } = started.app.getHttpAdapter().getInstance();

			expect((await fastify.inject({ method: "GET", url: `/anonymous-mine/dto-name-items/mine/${"x".repeat(70)}` })).statusCode).toBe(HttpStatus.BAD_REQUEST);
			expect((await fastify.inject({ method: "GET", url: "/anonymous-mine/dto-name-items/mine/item-1" })).statusCode).toBe(HttpStatus.NO_CONTENT);
		} finally {
			await started.app.close();
		}
	});
});
