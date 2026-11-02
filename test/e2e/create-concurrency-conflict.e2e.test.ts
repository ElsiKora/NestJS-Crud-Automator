import "reflect-metadata";

import type { ExecutionContext, INestApplication } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";
import type { StartedTestContainer } from "testcontainers";

import { Inject, Injectable, Module } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { GenericContainer, Wait } from "testcontainers";
import { Column, DataSource, Entity, PrimaryColumn, Repository } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiAuthorizationPolicy, ApiAuthorizationPolicyBase, ApiController, ApiControllerSecurable, ApiPropertyDescribe, ApiService, ApiServiceBase, ApiSubscriberModule, AuthorizationResolveDefaultPrincipal, EApiAuthenticationType, EApiAuthorizationMode, EApiDtoType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../src/index";

const IN_SCOPE: string = "tenant-1";
const OUT_OF_SCOPE: string = "tenant-2";
const RACE_ROUNDS: number = 5;
const RACE_SIZE: number = 12;
const SHARED_ROOT_PASSWORD: string = "root-password";
const SHARED_DATABASE: string = "race_db";
const MYSQL_PORT: number = 3306;

const describeString: (description: string) => PropertyDecorator = (description: string): PropertyDecorator =>
	ApiPropertyDescribe({
		description,
		exampleValue: "value",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		properties: { [EApiRouteType.CREATE]: { [EApiDtoType.BODY]: { isRequired: true } } },
		type: EApiPropertyDescribeType.STRING,
	});

@Entity("create_race_items")
class RaceItemEntity {
	@PrimaryColumn({ length: 64, type: "varchar" })
	@describeString("id")
	public id!: string;

	@Column({ length: 64, type: "varchar" })
	@describeString("tenantId")
	public tenantId!: string;
}

@Injectable()
@ApiService({ entity: RaceItemEntity })
class RaceItemService extends ApiServiceBase<RaceItemEntity> {
	@InjectRepository(RaceItemEntity)
	public readonly repository!: Repository<RaceItemEntity>;
}

@Injectable()
@ApiAuthorizationPolicy({ entity: RaceItemEntity })
class RaceItemPolicy extends ApiAuthorizationPolicyBase<RaceItemEntity> {
	public onBeforeCreate() {
		return this.allow({ scope: () => ({ where: { tenantId: IN_SCOPE } }) });
	}
}

@Injectable()
class RaceAuthGuard implements IAuthGuard {
	public canActivate(context: ExecutionContext): boolean {
		context.switchToHttp().getRequest<{ user?: unknown }>().user = { id: "user-1", tenantId: IN_SCOPE };

		return true;
	}

	public getAuthenticateOptions(): undefined {
		return undefined;
	}

	public getRequest<T = unknown>(context: ExecutionContext): T {
		return context.switchToHttp().getRequest<T>();
	}

	public handleRequest<T = unknown>(_error: unknown, user: T): T {
		return user;
	}

	public async logIn(): Promise<void> {
		await Promise.resolve();
	}
}

const disabledRoutes = {
	[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
	[EApiRouteType.GET]: { generation: { isEnabled: false } },
	[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
	[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
	[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
};

@ApiControllerSecurable()
@ApiController<RaceItemEntity>({
	authorization: {
		defaultMode: EApiAuthorizationMode.HOOKS,
		policyNamespace: "create-race:item",
		resourceDefinition: { entity: RaceItemEntity, fields: [{ isFilterable: true, path: "resource.tenantId", queryPath: "tenantId" }], namespace: "create-race", resourcePath: "create-race/{id}", resourceType: "create-race" },
	},
	entity: RaceItemEntity,
	name: "race-scoped",
	path: "race-scoped",
	routes: { [EApiRouteType.CREATE]: { security: { authentication: { guard: RaceAuthGuard, type: EApiAuthenticationType.USER } } }, ...disabledRoutes },
})
class ScopedRaceItemController {
	@Inject(RaceItemService)
	public readonly service!: RaceItemService;
}

@ApiController<RaceItemEntity>({ entity: RaceItemEntity, name: "race-open", path: "race-open", routes: { [EApiRouteType.CREATE]: {}, ...disabledRoutes } })
class OpenRaceItemController {
	@Inject(RaceItemService)
	public readonly service!: RaceItemService;
}

interface IRaceDriver {
	name: string;
	start: () => Promise<{ container: StartedTestContainer; options: object }>;
}

const sharedDriver = (name: string, image: string, environment: Record<string, string>, type: string): IRaceDriver => ({
	name,
	start: async () => {
		const container: StartedTestContainer = await new GenericContainer(image)
			.withEnvironment(environment)
			.withExposedPorts(MYSQL_PORT)
			.withWaitStrategy(Wait.forLogMessage(/port: 3306\s/u))
			.withStartupTimeout(180_000)
			.start();

		return { container, options: { database: SHARED_DATABASE, host: container.getHost(), password: SHARED_ROOT_PASSWORD, port: container.getMappedPort(MYSQL_PORT), type, username: "root" } };
	},
});

const DRIVERS: Array<IRaceDriver> = [
	sharedDriver("mariadb", "mariadb:11", { MARIADB_DATABASE: SHARED_DATABASE, MARIADB_ROOT_PASSWORD: SHARED_ROOT_PASSWORD }, "mariadb"),
	sharedDriver("mysql", "mysql:8", { MYSQL_DATABASE: SHARED_DATABASE, MYSQL_ROOT_PASSWORD: SHARED_ROOT_PASSWORD }, "mysql"),
	{
		name: "postgres",
		start: async () => {
			const container = await new PostgreSqlContainer("postgres:17-alpine").start();

			return { container, options: { database: container.getDatabase(), host: container.getHost(), password: container.getPassword(), port: container.getPort(), type: "postgres", username: container.getUsername() } };
		},
	},
];

describe.each(DRIVERS)("Generated CREATE concurrency conflict on $name (E2E)", (driver: IRaceDriver) => {
	let app: INestApplication;
	let container: StartedTestContainer | undefined;
	let items: Repository<RaceItemEntity>;

	const post = async (path: string, id: string, tenantId: string): Promise<number> => {
		const response = await app
			.getHttpAdapter()
			.getInstance()
			.inject({ method: "POST", payload: { id, tenantId }, url: `/${path}` });

		return response.statusCode;
	};

	const statuses = async (run: (index: number) => Promise<number>): Promise<Array<number>> => [...(await Promise.all(Array.from({ length: RACE_SIZE }, async (_value: unknown, index: number): Promise<number> => await run(index))))].sort();

	beforeAll(async () => {
		const started = await driver.start();
		container = started.container;

		@Module({
			controllers: [OpenRaceItemController, ScopedRaceItemController],
			imports: [TypeOrmModule.forRoot({ ...started.options, dropSchema: true, entities: [RaceItemEntity], extra: driver.name === "postgres" ? { max: RACE_SIZE * 2 } : { connectionLimit: RACE_SIZE * 2 }, logging: false, synchronize: true } as never), TypeOrmModule.forFeature([RaceItemEntity]), ApiAuthorizationModule.forRoot({ principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) } } as never), ApiSubscriberModule],
			providers: [RaceAuthGuard, RaceItemPolicy, RaceItemService],
		})
		class RaceModule {}

		const moduleRef = await Test.createTestingModule({ imports: [RaceModule] }).compile();
		app = moduleRef.createNestApplication(new FastifyAdapter());
		await app.init();
		await app.getHttpAdapter().getInstance().ready();
		items = moduleRef.get(DataSource).getRepository(RaceItemEntity);
	}, 300_000);

	afterAll(async () => {
		await app?.close();
		await container?.stop();
	}, 60_000);

	beforeEach(async () => {
		await items.clear();
	});

	it("answers 201 or 409 and keeps one row when requests race for one key", { timeout: 120_000 }, async () => {
		for (let round: number = 0; round < RACE_ROUNDS; round += 1) {
			const id: string = `race-${String(round)}`;
			const answers: Array<number> = await statuses(async (): Promise<number> => await post("race-open", id, IN_SCOPE));

			expect(new Set(answers).size <= 2 && answers.every((status: number): boolean => status === 201 || status === 409)).toBe(true);
			expect(await items.countBy({ id })).toBe(1);
		}
	});

	it("never answers 500 or leaves an out-of-scope row when a scoped race mixes tenants", { timeout: 120_000 }, async () => {
		for (let round: number = 0; round < RACE_ROUNDS; round += 1) {
			const id: string = `mixed-${String(round)}`;
			const answers: Array<number> = await statuses(async (index: number): Promise<number> => await post("race-scoped", id, index % 2 === 0 ? OUT_OF_SCOPE : IN_SCOPE));

			expect(answers.filter((status: number): boolean => ![201, 403, 409].includes(status))).toEqual([]);
			expect(await items.countBy({ id, tenantId: OUT_OF_SCOPE })).toBe(0);
		}
	});
});
