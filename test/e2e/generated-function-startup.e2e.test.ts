import "reflect-metadata";

import type { INestApplication, Type } from "@nestjs/common";
import type { DataSource, Repository } from "typeorm";

import { HttpStatus, Inject } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { getDataSourceToken, InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { Column, Entity, PrimaryColumn } from "typeorm";
import { afterEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiPropertyDescribe, ApiService, ApiServiceBase, ApiSubscriberModule, EApiFunctionTransactionMode, EApiFunctionType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../src/index";

type TCheckedFunctionType = EApiFunctionType.CREATE | EApiFunctionType.DELETE | EApiFunctionType.GET | EApiFunctionType.UPDATE;

const ITEM_ID: string = "dddddddd-dddd-4ddd-8ddd-ddddddddddd1";
const READ_PURPOSE: string = "reads its response through";
const WRITE_PURPOSE: string = "writes through";

/**
 * Each checked route with the functions it calls and what it does through each.
 */
const ROUTE_FUNCTIONS: ReadonlyArray<[EApiRouteType, TCheckedFunctionType, string]> = [
	[EApiRouteType.CREATE, EApiFunctionType.CREATE, WRITE_PURPOSE],
	[EApiRouteType.CREATE, EApiFunctionType.GET, READ_PURPOSE],
	[EApiRouteType.DELETE, EApiFunctionType.DELETE, WRITE_PURPOSE],
	[EApiRouteType.GET, EApiFunctionType.GET, READ_PURPOSE],
	[EApiRouteType.PARTIAL_UPDATE, EApiFunctionType.UPDATE, WRITE_PURPOSE],
	[EApiRouteType.PARTIAL_UPDATE, EApiFunctionType.GET, READ_PURPOSE],
	[EApiRouteType.UPDATE, EApiFunctionType.UPDATE, WRITE_PURPOSE],
	[EApiRouteType.UPDATE, EApiFunctionType.GET, READ_PURPOSE],
];

/**
 * Each checked route other than CREATE, which always holds a transaction, with the functions it calls.
 */
const MODE_ROUTE_FUNCTIONS: ReadonlyArray<[EApiRouteType, TCheckedFunctionType, string]> = ROUTE_FUNCTIONS.filter(([routeType]: [EApiRouteType, TCheckedFunctionType, string]): boolean => routeType !== EApiRouteType.CREATE);

const HELD_CREATE_ROUTE_MODES: ReadonlyArray<EApiFunctionTransactionMode> = [EApiFunctionTransactionMode.SUPPORTS, EApiFunctionTransactionMode.REQUIRED, EApiFunctionTransactionMode.MANDATORY];

const WRITE_ROUTE_TYPES: ReadonlyArray<EApiRouteType> = [EApiRouteType.CREATE, EApiRouteType.DELETE, EApiRouteType.PARTIAL_UPDATE, EApiRouteType.UPDATE];

@Entity("e2e_generated_function_startup_items")
class GeneratedFunctionStartupItemEntity {
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@ApiPropertyDescribe({ description: "name", exampleValue: "Item", format: EApiPropertyStringType.STRING, maxLength: 32, minLength: 1, pattern: "/^[A-Za-z]+$/", type: EApiPropertyDescribeType.STRING })
	@Column({ type: "varchar" })
	public name!: string;
}

/**
 * Builds a service whose generated functions run in the given transaction modes, with one function left as a plain method.
 * @param {Partial<Record<TCheckedFunctionType, EApiFunctionTransactionMode>>} modes - Transaction mode of each generated function.
 * @param {TCheckedFunctionType} [undecorated] - Function the service declares as a plain method, so no built-in decorator protects it.
 * @returns {Type<ApiServiceBase<GeneratedFunctionStartupItemEntity>>} Service class.
 */
function createService(modes: Partial<Record<TCheckedFunctionType, EApiFunctionTransactionMode>>, undecorated?: TCheckedFunctionType): Type<ApiServiceBase<GeneratedFunctionStartupItemEntity>> {
	class GeneratedFunctionStartupService extends ApiServiceBase<GeneratedFunctionStartupItemEntity> {
		public readonly repository!: Repository<GeneratedFunctionStartupItemEntity>;
	}

	InjectRepository(GeneratedFunctionStartupItemEntity)(GeneratedFunctionStartupService.prototype, "repository");

	if (undecorated) {
		Object.defineProperty(GeneratedFunctionStartupService.prototype, undecorated, {
			configurable: true,
			value(this: GeneratedFunctionStartupService): Promise<GeneratedFunctionStartupItemEntity> {
				return this.repository.findOneByOrFail({ id: ITEM_ID });
			},
			writable: true,
		});
	}

	const functions: Record<string, object> = Object.fromEntries(Object.entries(modes).map(([functionType, mode]: [string, EApiFunctionTransactionMode]): [string, object] => [functionType, { transaction: { mode } }]));

	return ApiService({ entity: GeneratedFunctionStartupItemEntity, functions } as never)(GeneratedFunctionStartupService) as Type<ApiServiceBase<GeneratedFunctionStartupItemEntity>>;
}

/**
 * Builds a controller that serves only the given route, in one transaction mode.
 * @param {Type<ApiServiceBase<GeneratedFunctionStartupItemEntity>>} service - Service of the controller.
 * @param {EApiRouteType} routeType - The one generated route of the controller.
 * @param {EApiFunctionTransactionMode} routeMode - Transaction mode of that route.
 * @returns {Type<unknown>} Controller class.
 */
function createController(service: Type<ApiServiceBase<GeneratedFunctionStartupItemEntity>>, routeType: EApiRouteType, routeMode: EApiFunctionTransactionMode): Type<unknown> {
	class GeneratedFunctionStartupController {
		public readonly service!: ApiServiceBase<GeneratedFunctionStartupItemEntity>;
	}

	Inject(service)(GeneratedFunctionStartupController.prototype, "service");

	const routes: Record<string, object> = Object.fromEntries(Object.values(EApiRouteType).map((candidate: EApiRouteType): [string, object] => [candidate, candidate === routeType ? { transaction: { mode: routeMode } } : { generation: { isEnabled: false } }]));

	return ApiController<GeneratedFunctionStartupItemEntity>({ entity: GeneratedFunctionStartupItemEntity, name: "GeneratedFunctionStartupItems", path: "generated-function-startup-items", routes } as never)(GeneratedFunctionStartupController) as Type<unknown>;
}

/**
 * Gives every checked function one mode, and one function another.
 * @param {EApiFunctionTransactionMode} mode - Mode of every function.
 * @param {TCheckedFunctionType} [functionType] - The function that runs in its own mode.
 * @param {EApiFunctionTransactionMode} [functionMode] - Mode of that function.
 * @returns {Record<TCheckedFunctionType, EApiFunctionTransactionMode>} Mode of each function.
 */
function createModes(mode: EApiFunctionTransactionMode, functionType?: TCheckedFunctionType, functionMode?: EApiFunctionTransactionMode): Record<TCheckedFunctionType, EApiFunctionTransactionMode> {
	const modes: Record<TCheckedFunctionType, EApiFunctionTransactionMode> = { [EApiFunctionType.CREATE]: mode, [EApiFunctionType.DELETE]: mode, [EApiFunctionType.GET]: mode, [EApiFunctionType.UPDATE]: mode };

	if (functionType && functionMode) {
		modes[functionType] = functionMode;
	}

	return modes;
}

describe("Generated routes and the service functions they call at startup (E2E)", () => {
	let app: INestApplication | undefined;

	const start = async (service: Type<ApiServiceBase<GeneratedFunctionStartupItemEntity>>, routeType: EApiRouteType, routeMode: EApiFunctionTransactionMode = EApiFunctionTransactionMode.SUPPORTS): Promise<INestApplication> => {
		const moduleReference = await Test.createTestingModule({
			controllers: [createController(service, routeType, routeMode)],
			imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities: [GeneratedFunctionStartupItemEntity], logging: false, synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature([GeneratedFunctionStartupItemEntity]), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
			providers: [service],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();

		return app;
	};

	afterEach(async () => {
		await app?.close();
		app = undefined;
	});

	it.each(ROUTE_FUNCTIONS)("refuses route %s on a service whose %s function is a plain method", async (routeType: EApiRouteType, functionType: TCheckedFunctionType, purpose: string) => {
		const name: string = functionType.toUpperCase();

		await expect(start(createService({}, functionType), routeType)).rejects.toThrow(`Controller "GeneratedFunctionStartupController" route "${routeType}" ${purpose} the ${name} function of service "GeneratedFunctionStartupService", but its ${functionType} method is a plain method, not the ${name} function protected by its built-in decorator. Remove the method and let @ApiService define the function`);
	});

	it("starts a DELETE route on a service whose GET function is a plain method", async () => {
		await expect(start(createService({}, EApiFunctionType.GET), EApiRouteType.DELETE)).resolves.toBeDefined();
	});

	describe.each(MODE_ROUTE_FUNCTIONS)("route %s and its %s function", (routeType: EApiRouteType, functionType: TCheckedFunctionType) => {
		const name: string = functionType.toUpperCase();

		it.each([EApiFunctionTransactionMode.NONE, EApiFunctionTransactionMode.SUPPORTS])("refuses route mode %s with a MANDATORY function", async (routeMode: EApiFunctionTransactionMode) => {
			await expect(start(createService(createModes(routeMode, functionType, EApiFunctionTransactionMode.MANDATORY)), routeType, routeMode)).rejects.toThrow(`Controller "GeneratedFunctionStartupController" route "${routeType}" runs in transaction mode ${routeMode}, but the ${name} function of service "GeneratedFunctionStartupService" runs in mode MANDATORY`);
		});

		it.each([EApiFunctionTransactionMode.MANDATORY, EApiFunctionTransactionMode.REQUIRED])("refuses route mode %s with a NONE function", async (routeMode: EApiFunctionTransactionMode) => {
			await expect(start(createService(createModes(EApiFunctionTransactionMode.SUPPORTS, functionType, EApiFunctionTransactionMode.NONE)), routeType, routeMode)).rejects.toThrow(`Controller "GeneratedFunctionStartupController" route "${routeType}" runs in transaction mode ${routeMode}, but the ${name} function of service "GeneratedFunctionStartupService" runs in mode NONE`);
		});

		it.each([
			[EApiFunctionTransactionMode.REQUIRED, EApiFunctionTransactionMode.MANDATORY],
			[EApiFunctionTransactionMode.SUPPORTS, EApiFunctionTransactionMode.NONE],
			[EApiFunctionTransactionMode.NONE, EApiFunctionTransactionMode.NONE],
			[EApiFunctionTransactionMode.REQUIRED, EApiFunctionTransactionMode.REQUIRED],
			[EApiFunctionTransactionMode.SUPPORTS, EApiFunctionTransactionMode.SUPPORTS],
		])("starts route mode %s with a %s function", async (routeMode: EApiFunctionTransactionMode, functionMode: EApiFunctionTransactionMode) => {
			const fittingMode: EApiFunctionTransactionMode = routeMode === EApiFunctionTransactionMode.NONE ? EApiFunctionTransactionMode.NONE : EApiFunctionTransactionMode.SUPPORTS;

			await expect(start(createService(createModes(fittingMode, functionType, functionMode)), routeType, routeMode)).resolves.toBeDefined();
		});
	});

	describe.each([EApiFunctionType.CREATE, EApiFunctionType.GET] as const)("route create and its %s function", (functionType: TCheckedFunctionType) => {
		const name: string = functionType.toUpperCase();
		const failure: string = functionType === EApiFunctionType.CREATE ? "when it writes" : "when it reads its response, after any write it made";

		it.each(HELD_CREATE_ROUTE_MODES)("starts route mode %s with a MANDATORY function, because a generated create always holds a transaction", async (routeMode: EApiFunctionTransactionMode) => {
			await expect(start(createService(createModes(EApiFunctionTransactionMode.SUPPORTS, functionType, EApiFunctionTransactionMode.MANDATORY)), EApiRouteType.CREATE, routeMode)).resolves.toBeDefined();
		});

		it.each(HELD_CREATE_ROUTE_MODES)("refuses route mode %s with a NONE function at startup, because a generated create always holds a transaction", async (routeMode: EApiFunctionTransactionMode) => {
			await expect(start(createService(createModes(EApiFunctionTransactionMode.SUPPORTS, functionType, EApiFunctionTransactionMode.NONE)), EApiRouteType.CREATE, routeMode)).rejects.toThrow(
				`Controller "GeneratedFunctionStartupController" route "create" runs in transaction mode ${routeMode}, but the ${name} function of service "GeneratedFunctionStartupService" runs in mode NONE and refuses the transaction every generated create holds, so the route would fail ${failure}. Set the ${name} function mode to SUPPORTS or REQUIRED.`,
			);
		});

		it("refuses route mode NONE, because a generated create always runs in a transaction", async () => {
			await expect(start(createService(createModes(EApiFunctionTransactionMode.NONE)), EApiRouteType.CREATE, EApiFunctionTransactionMode.NONE)).rejects.toThrow('Controller "GeneratedFunctionStartupController" route "create" runs in transaction mode NONE, but a generated create always runs in a transaction, because it checks the row it stored before it commits');
		});
	});

	describe.each<[EApiFunctionTransactionMode, EApiFunctionTransactionMode, ReadonlyArray<EApiRouteType>]>([
		[EApiFunctionTransactionMode.REQUIRED, EApiFunctionTransactionMode.MANDATORY, WRITE_ROUTE_TYPES],
		[EApiFunctionTransactionMode.SUPPORTS, EApiFunctionTransactionMode.MANDATORY, [EApiRouteType.CREATE]],
		[EApiFunctionTransactionMode.NONE, EApiFunctionTransactionMode.NONE, WRITE_ROUTE_TYPES.filter((routeType: EApiRouteType): boolean => routeType !== EApiRouteType.CREATE)],
	])("in route mode %s with every function in mode %s", (routeMode: EApiFunctionTransactionMode, functionMode: EApiFunctionTransactionMode, routeTypes: ReadonlyArray<EApiRouteType>) => {
		it.each(routeTypes)("answers %s", async (routeType: EApiRouteType) => {
			const application: INestApplication = await start(createService(createModes(functionMode)), routeType, routeMode);
			const fastify: { inject: (options: { method: string; payload?: object; url: string }) => Promise<{ body: string; json: () => unknown; statusCode: number }> } = application.getHttpAdapter().getInstance();
			const repository: Repository<GeneratedFunctionStartupItemEntity> = application.get<DataSource>(getDataSourceToken()).getRepository(GeneratedFunctionStartupItemEntity);

			if (routeType === EApiRouteType.CREATE) {
				const response = await fastify.inject({ method: "POST", payload: { id: ITEM_ID, name: "Created" }, url: "/generated-function-startup-items" });

				expect(response.statusCode, response.body).toBe(HttpStatus.CREATED);
				expect(response.json()).toEqual({ id: ITEM_ID, name: "Created" });

				return;
			}

			await repository.insert({ id: ITEM_ID, name: "Item" });

			if (routeType === EApiRouteType.DELETE) {
				const response = await fastify.inject({ method: "DELETE", url: `/generated-function-startup-items/${ITEM_ID}` });

				expect(response.statusCode, response.body).toBeLessThan(HttpStatus.BAD_REQUEST);
				expect(await repository.count()).toBe(0);

				return;
			}

			const response = await fastify.inject({ method: routeType === EApiRouteType.UPDATE ? "PUT" : "PATCH", payload: { name: "Changed" }, url: `/generated-function-startup-items/${ITEM_ID}` });

			expect(response.statusCode, response.body).toBe(HttpStatus.OK);
			expect(response.json()).toEqual({ id: ITEM_ID, name: "Changed" });
		});
	});
});
