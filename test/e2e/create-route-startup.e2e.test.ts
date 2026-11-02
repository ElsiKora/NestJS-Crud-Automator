import "reflect-metadata";

import type { ArgumentsHost, ExceptionFilter, INestApplication, Type } from "@nestjs/common";

import { Catch, Inject, Injectable, Module, Scope } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { getRepositoryToken, InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { Column, DataSource, Entity, PrimaryColumn, PrimaryGeneratedColumn, Repository } from "typeorm";
import { describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiPropertyDescribe, ApiService, ApiServiceBase, ApiSubscriberModule, AuthorizationResolveDefaultPrincipal, EApiDtoType, EApiFunctionTransactionMode, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../src/index";

const describeString: PropertyDecorator = ApiPropertyDescribe({ description: "text", exampleValue: "value", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING });
const describeKey: PropertyDecorator = ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, properties: { [EApiRouteType.CREATE]: { [EApiDtoType.BODY]: { isRequired: false } } }, type: EApiPropertyDescribeType.DATE } as never);
const disabled = { generation: { isEnabled: false } };
const disabledRoutes = { [EApiRouteType.DELETE]: disabled, [EApiRouteType.GET]: disabled, [EApiRouteType.GET_LIST]: disabled, [EApiRouteType.PARTIAL_UPDATE]: disabled, [EApiRouteType.UPDATE]: disabled };

@Entity("startup_items")
class StartupItemEntity {
	@PrimaryGeneratedColumn("uuid")
	@describeString
	public id!: string;

	@Column({ type: "varchar" })
	@describeString
	public name!: string;
}

@Entity("startup_filled_key_items")
class StartupFilledKeyEntity {
	@PrimaryColumn({ default: () => "CURRENT_TIMESTAMP", type: "datetime" })
	@describeKey
	public at!: Date;

	@Column({ type: "varchar" })
	@describeString
	public name!: string;
}

@Injectable()
@ApiService({ entity: StartupItemEntity })
class StartupItemService extends ApiServiceBase<StartupItemEntity> {
	@InjectRepository(StartupItemEntity)
	public readonly repository!: Repository<StartupItemEntity>;
}

@Injectable()
class StartupUndecoratedService extends ApiServiceBase<StartupItemEntity> {
	@InjectRepository(StartupItemEntity)
	public readonly repository!: Repository<StartupItemEntity>;
}

@Injectable({ scope: Scope.REQUEST })
@ApiService({ entity: StartupFilledKeyEntity })
class StartupFilledKeyService extends ApiServiceBase<StartupFilledKeyEntity> {
	@InjectRepository(StartupFilledKeyEntity)
	public readonly repository!: Repository<StartupFilledKeyEntity>;
}

@ApiController<StartupItemEntity>({ entity: StartupItemEntity, name: "startup-none", path: "startup-none", routes: { [EApiRouteType.CREATE]: { transaction: { mode: EApiFunctionTransactionMode.NONE } }, ...disabledRoutes } })
class StartupNoneRouteController {
	@Inject(StartupItemService)
	public readonly service!: StartupItemService;
}

@ApiController<StartupItemEntity>({ entity: StartupItemEntity, name: "startup-undecorated", path: "startup-undecorated", routes: disabledRoutes })
class StartupUndecoratedController {
	@Inject(StartupUndecoratedService)
	public readonly service!: StartupUndecoratedService;
}

@ApiController<StartupItemEntity>({ entity: StartupItemEntity, name: "startup-mocked", path: "startup-mocked", routes: disabledRoutes })
class StartupMockedRepositoryController {
	@Inject(StartupItemService)
	public readonly service!: StartupItemService;
}

const StartupNoServiceController: Type<unknown> = ApiController<StartupItemEntity>({ entity: StartupItemEntity, name: "startup-no-service", path: "startup-no-service", routes: disabledRoutes })(class StartupNoService {} as never);

@ApiController<StartupFilledKeyEntity>({ entity: StartupFilledKeyEntity, name: "startup-request-scoped", path: "startup-request-scoped", routes: disabledRoutes })
class StartupRequestScopedController {
	@Inject(StartupFilledKeyService)
	public readonly service!: StartupFilledKeyService;
}

@Catch()
class StartupCaptureFilter implements ExceptionFilter {
	public static captured: unknown;

	public catch(exception: unknown, host: ArgumentsHost): void {
		StartupCaptureFilter.captured = exception;
		void host.switchToHttp().getResponse<{ code: (status: number) => { send: (body: unknown) => void } }>().code(500).send({ statusCode: 500 });
	}
}

function createDatabaseImports(entities: Array<Type<object>>): Array<unknown> {
	return [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities, logging: false, synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature(entities), ApiAuthorizationModule.forRoot({ principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) } } as never), ApiSubscriberModule];
}

async function createApp(metadata: { controllers: Array<Type<unknown>>; entities: Array<Type<object>>; providers: Array<unknown> }): Promise<{ app: INestApplication; dataSource: DataSource }> {
	@Module({ controllers: metadata.controllers, imports: createDatabaseImports(metadata.entities) as never, providers: metadata.providers as never })
	class StartupAppModule {}

	const moduleRef = await Test.createTestingModule({ imports: [StartupAppModule] }).compile();

	return { app: moduleRef.createNestApplication(new FastifyAdapter()), dataSource: moduleRef.get(DataSource) };
}

describe("Generated CREATE route at startup (E2E)", () => {
	it.each([
		["a NONE route", StartupNoneRouteController, StartupItemService, 'Controller "StartupNoneRouteController" route "create" cannot use transaction mode NONE, because a generated create checks the stored row before it commits'],
		["an undecorated create", StartupUndecoratedController, StartupUndecoratedService, 'Controller "StartupUndecoratedController" route "create": Generated create service function is not protected by its built-in decorator'],
	])("fails startup for %s, naming the controller and the reason", async (_name: string, controller: Type<unknown>, service: Type<unknown>, message: string) => {
		const { app, dataSource } = await createApp({ controllers: [controller], entities: [StartupItemEntity], providers: [service] });

		await expect(app.init()).rejects.toThrow(message);
		await dataSource.destroy();
	});

	it("fails startup for a mocked repository, as the sibling startup check does", async () => {
		@Module({ controllers: [StartupMockedRepositoryController], imports: createDatabaseImports([StartupItemEntity]) as never, providers: [StartupItemService] })
		class StartupMockedModule {}

		const moduleRef = await Test.createTestingModule({ imports: [StartupMockedModule] })
			.overrideProvider(getRepositoryToken(StartupItemEntity))
			.useValue({ find: () => [] })
			.compile();
		const app: INestApplication = moduleRef.createNestApplication(new FastifyAdapter());

		await expect(app.init()).rejects.toThrow('Controller "StartupMockedRepositoryController" of entity "StartupItemEntity": service.repository is not a usable TypeORM repository');
		await moduleRef.get(DataSource).destroy();
	});

	it("fails startup for a controller without a service property", async () => {
		const { app, dataSource } = await createApp({ controllers: [StartupNoServiceController], entities: [StartupItemEntity], providers: [] });

		await expect(app.init()).rejects.toThrow("service.repository is not a usable TypeORM repository because the controller has no service");
		await dataSource.destroy();
	});

	it("names the refusal at request time on a request-scoped controller, which no startup hook reaches", async () => {
		const { app, dataSource } = await createApp({ controllers: [StartupRequestScopedController], entities: [StartupFilledKeyEntity], providers: [StartupFilledKeyService, { provide: APP_FILTER, useClass: StartupCaptureFilter }] });

		await app.init();

		const fastify = app.getHttpAdapter().getInstance() as { inject: (options: { method: string; payload?: unknown; url: string }) => Promise<{ statusCode: number }> };
		const response = await fastify.inject({ method: "POST", payload: { name: "first" }, url: "/startup-request-scoped" });

		expect(response.statusCode).toBe(500);
		expect(StartupCaptureFilter.captured).toBeInstanceOf(Error);
		expect((StartupCaptureFilter.captured as Error).message).toContain('route "create" cannot identify the row it creates: the database fills date and time primary column at of StartupFilledKeyEntity, and the better-sqlite3 driver cannot read that value back');
		expect(await dataSource.getRepository(StartupFilledKeyEntity).count()).toBe(0);
		await app.close();
	});
});
