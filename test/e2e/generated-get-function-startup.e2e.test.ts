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

const ITEM_ID: string = "dddddddd-dddd-4ddd-8ddd-ddddddddddd1";
const WRITE_ROUTE_TYPES: ReadonlyArray<EApiRouteType> = [EApiRouteType.CREATE, EApiRouteType.PARTIAL_UPDATE, EApiRouteType.UPDATE];
const GET_READING_ROUTE_TYPES: ReadonlyArray<EApiRouteType> = [...WRITE_ROUTE_TYPES, EApiRouteType.GET];

@Entity("e2e_generated_get_startup_items")
class GeneratedGetStartupItemEntity {
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@ApiPropertyDescribe({ description: "name", exampleValue: "Item", format: EApiPropertyStringType.STRING, maxLength: 32, minLength: 1, pattern: "/^[A-Za-z]+$/", type: EApiPropertyDescribeType.STRING })
	@Column({ type: "varchar" })
	public name!: string;
}

@ApiService({ entity: GeneratedGetStartupItemEntity })
class GeneratedGetStartupUndecoratedGetService extends ApiServiceBase<GeneratedGetStartupItemEntity> {
	@InjectRepository(GeneratedGetStartupItemEntity)
	public readonly repository!: Repository<GeneratedGetStartupItemEntity>;

	public override get(): Promise<GeneratedGetStartupItemEntity> {
		return this.repository.findOneByOrFail({ id: ITEM_ID });
	}
}

/**
 * Builds a service whose generated GET function runs in one transaction mode.
 * @param {EApiFunctionTransactionMode} getMode - Transaction mode of the GET function.
 * @returns {Type<ApiServiceBase<GeneratedGetStartupItemEntity>>} Service class.
 */
function createModeService(getMode: EApiFunctionTransactionMode): Type<ApiServiceBase<GeneratedGetStartupItemEntity>> {
	class GeneratedGetStartupModeService extends ApiServiceBase<GeneratedGetStartupItemEntity> {
		public readonly repository!: Repository<GeneratedGetStartupItemEntity>;
	}

	InjectRepository(GeneratedGetStartupItemEntity)(GeneratedGetStartupModeService.prototype, "repository");

	return ApiService({ entity: GeneratedGetStartupItemEntity, functions: { [EApiFunctionType.GET]: { transaction: { mode: getMode } } } })(GeneratedGetStartupModeService) as Type<ApiServiceBase<GeneratedGetStartupItemEntity>>;
}

/**
 * Builds a controller that serves only the given route, in one transaction mode.
 * @param {Type<ApiServiceBase<GeneratedGetStartupItemEntity>>} service - Service of the controller.
 * @param {EApiRouteType} routeType - The one generated route of the controller.
 * @param {EApiFunctionTransactionMode} routeMode - Transaction mode of that route.
 * @returns {Type<unknown>} Controller class.
 */
function createController(service: Type<ApiServiceBase<GeneratedGetStartupItemEntity>>, routeType: EApiRouteType, routeMode: EApiFunctionTransactionMode): Type<unknown> {
	class GeneratedGetStartupController {
		public readonly service!: ApiServiceBase<GeneratedGetStartupItemEntity>;
	}

	Inject(service)(GeneratedGetStartupController.prototype, "service");

	const routes: Record<string, object> = Object.fromEntries(Object.values(EApiRouteType).map((candidate: EApiRouteType): [string, object] => [candidate, candidate === routeType ? { transaction: { mode: routeMode } } : { generation: { isEnabled: false } }]));

	return ApiController<GeneratedGetStartupItemEntity>({ entity: GeneratedGetStartupItemEntity, name: "GeneratedGetStartupItems", path: "generated-get-startup-items", routes } as never)(GeneratedGetStartupController) as Type<unknown>;
}

describe("Generated routes that read through the GET function at startup (E2E)", () => {
	let app: INestApplication | undefined;

	const start = async (service: Type<ApiServiceBase<GeneratedGetStartupItemEntity>>, routeType: EApiRouteType, routeMode: EApiFunctionTransactionMode = EApiFunctionTransactionMode.SUPPORTS): Promise<INestApplication> => {
		const moduleReference = await Test.createTestingModule({
			controllers: [createController(service, routeType, routeMode)],
			imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities: [GeneratedGetStartupItemEntity], logging: false, synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature([GeneratedGetStartupItemEntity]), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
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

	it.each(GET_READING_ROUTE_TYPES)("refuses route %s on a service without a decorated GET function", async (routeType: EApiRouteType) => {
		await expect(start(GeneratedGetStartupUndecoratedGetService, routeType)).rejects.toThrow(`Controller "GeneratedGetStartupController" route "${routeType}" reads its response through the GET function of service "GeneratedGetStartupUndecoratedGetService", but that service has no GET function protected by its built-in decorator.`);
	});

	it("starts a DELETE route on a service without a decorated GET function", async () => {
		await expect(start(GeneratedGetStartupUndecoratedGetService, EApiRouteType.DELETE)).resolves.toBeDefined();
	});

	describe.each(GET_READING_ROUTE_TYPES)("route %s", (routeType: EApiRouteType) => {
		it.each([EApiFunctionTransactionMode.NONE, EApiFunctionTransactionMode.SUPPORTS])("refuses route mode %s with a MANDATORY GET function", async (routeMode: EApiFunctionTransactionMode) => {
			await expect(start(createModeService(EApiFunctionTransactionMode.MANDATORY), routeType, routeMode)).rejects.toThrow(`Controller "GeneratedGetStartupController" route "${routeType}" runs in transaction mode ${routeMode}, but the GET function of service "GeneratedGetStartupModeService" runs in mode MANDATORY`);
		});

		it.each([EApiFunctionTransactionMode.MANDATORY, EApiFunctionTransactionMode.REQUIRED])("refuses route mode %s with a NONE GET function", async (routeMode: EApiFunctionTransactionMode) => {
			await expect(start(createModeService(EApiFunctionTransactionMode.NONE), routeType, routeMode)).rejects.toThrow(`Controller "GeneratedGetStartupController" route "${routeType}" runs in transaction mode ${routeMode}, but the GET function of service "GeneratedGetStartupModeService" runs in mode NONE`);
		});

		it.each([
			[EApiFunctionTransactionMode.REQUIRED, EApiFunctionTransactionMode.MANDATORY],
			[EApiFunctionTransactionMode.SUPPORTS, EApiFunctionTransactionMode.NONE],
			[EApiFunctionTransactionMode.NONE, EApiFunctionTransactionMode.NONE],
			[EApiFunctionTransactionMode.REQUIRED, EApiFunctionTransactionMode.REQUIRED],
			[EApiFunctionTransactionMode.SUPPORTS, EApiFunctionTransactionMode.SUPPORTS],
		])("starts route mode %s with a %s GET function", async (routeMode: EApiFunctionTransactionMode, getMode: EApiFunctionTransactionMode) => {
			await expect(start(createModeService(getMode), routeType, routeMode)).resolves.toBeDefined();
		});
	});

	it.each(WRITE_ROUTE_TYPES)("answers %s in route mode REQUIRED with a MANDATORY GET function", async (routeType: EApiRouteType) => {
		const application: INestApplication = await start(createModeService(EApiFunctionTransactionMode.MANDATORY), routeType, EApiFunctionTransactionMode.REQUIRED);
		const fastify: { inject: (options: { method: string; payload?: object; url: string }) => Promise<{ body: string; json: () => unknown; statusCode: number }> } = application.getHttpAdapter().getInstance();

		const isCreate: boolean = routeType === EApiRouteType.CREATE;

		if (!isCreate) {
			await application.get<DataSource>(getDataSourceToken()).getRepository(GeneratedGetStartupItemEntity).insert({ id: ITEM_ID, name: "Item" });
		}

		const response = await fastify.inject(isCreate ? { method: "POST", payload: { id: ITEM_ID, name: "Created" }, url: "/generated-get-startup-items" } : { method: routeType === EApiRouteType.UPDATE ? "PUT" : "PATCH", payload: { name: "Changed" }, url: `/generated-get-startup-items/${ITEM_ID}` });

		expect(response.statusCode, response.body).toBe(isCreate ? HttpStatus.CREATED : HttpStatus.OK);
		expect(response.json()).toEqual({ id: ITEM_ID, name: isCreate ? "Created" : "Changed" });
	});
});
