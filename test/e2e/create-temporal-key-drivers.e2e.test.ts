import "reflect-metadata";

import type { ExecutionContext, INestApplication, Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";
import type { StartedTestContainer } from "testcontainers";
import type { DataSourceOptions } from "typeorm";

import { Inject, Injectable, Module, ValidationPipe } from "@nestjs/common";
import { APP_PIPE } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { GenericContainer, Wait } from "testcontainers";
import { Column, DataSource, Entity, PrimaryColumn, Repository } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiAuthorizationPolicy, ApiAuthorizationPolicyBase, ApiController, ApiControllerSecurable, ApiPropertyDescribe, ApiService, ApiServiceBase, ApiSubscriberModule, AuthorizationResolveDefaultPrincipal, EApiAuthenticationType, EApiAuthorizationMode, EApiDtoType, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../src/index";

interface IColumnOptions {
	default?: () => string;
	precision?: number;
	type?: unknown;
}

type TKeyName = "dateFunction" | "inferred" | "instant" | "instantAlias" | "instantDefault" | "instantThree" | "timestamp" | "wall" | "wallDefault" | "wallZero";

interface IDriverSpec {
	columns: Partial<Record<TKeyName, IColumnOptions>>;
	name: string;
	readAt: (table: string, isInstant: boolean) => string;
	start: () => Promise<{ container?: StartedTestContainer; options: DataSourceOptions }>;
}

const IN_SCOPE: string = "scope-in";
const OUT_OF_SCOPE: string = "scope-out";
const MYSQL_PASSWORD: string = "temporal";
const MYSQL_DATABASE: string = "temporal";
const MYSQL_PORT: number = 3306;
const COCKROACH_PORT: number = 26_257;
const CONTAINER_START_TIMEOUT: number = 240_000;
const MICROSECOND_DEFAULT: string = "'2024-01-02 03:04:05.678912'";
const STORED_PATTERN: RegExp = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.(\d+))?/u;

const describeKey: PropertyDecorator = ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, properties: { [EApiRouteType.CREATE]: { [EApiDtoType.BODY]: { isRequired: false } } }, type: EApiPropertyDescribeType.DATE } as never);
const describeName: PropertyDecorator = ApiPropertyDescribe({ description: "name", exampleValue: "value", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING });

function startMysqlFamily(image: string, type: "mariadb" | "mysql", environment: Record<string, string>): () => Promise<{ container: StartedTestContainer; options: DataSourceOptions }> {
	return async () => {
		const container: StartedTestContainer = await new GenericContainer(image)
			.withEnvironment(environment)
			.withExposedPorts(MYSQL_PORT)
			// The image first runs a temporary server on port 0 to initialize the database.
			.withWaitStrategy(Wait.forLogMessage(/port: 3306\s/u))
			.withStartupTimeout(CONTAINER_START_TIMEOUT)
			.start();

		return { container, options: { database: MYSQL_DATABASE, host: container.getHost(), password: MYSQL_PASSWORD, port: container.getMappedPort(MYSQL_PORT), type, username: "root" } as DataSourceOptions };
	};
}

const DRIVERS: Array<IDriverSpec> = [
	{
		columns: {
			dateFunction: { default: () => MICROSECOND_DEFAULT, precision: 6, type: Date },
			inferred: { default: () => MICROSECOND_DEFAULT, precision: 6 },
			timestamp: { precision: 3, type: "timestamp" },
			wall: { precision: 3, type: "datetime" },
			wallDefault: { default: () => "CURRENT_TIMESTAMP(3)", precision: 3, type: "datetime" },
			wallZero: { type: "datetime" },
		},
		name: "mariadb",
		readAt: (table: string): string => `select cast(at as char) as at from ${table}`,
		start: startMysqlFamily("mariadb:11", "mariadb", { MARIADB_DATABASE: MYSQL_DATABASE, MARIADB_ROOT_PASSWORD: MYSQL_PASSWORD }),
	},
	{
		columns: {
			dateFunction: { default: () => MICROSECOND_DEFAULT, type: Date },
			inferred: { default: () => MICROSECOND_DEFAULT },
			instant: { type: "timestamptz" },
			instantAlias: { type: "timestamp with time zone" },
			instantDefault: { default: () => "now()", type: "timestamptz" },
			instantThree: { precision: 3, type: "timestamptz" },
			wall: { type: "timestamp" },
			wallDefault: { default: () => "now()", type: "timestamp" },
			wallZero: { precision: 0, type: "timestamp" },
		},
		name: "cockroachdb",
		readAt: (table: string, isInstant: boolean): string => `select (at${isInstant ? " at time zone 'UTC'" : ""})::string as at from ${table}`,
		start: async () => {
			const container: StartedTestContainer = await new GenericContainer("cockroachdb/cockroach:latest-v25.2")
				.withCommand(["start-single-node", "--insecure"])
				.withExposedPorts(COCKROACH_PORT)
				.withWaitStrategy(Wait.forLogMessage(/CockroachDB node starting/u))
				.withStartupTimeout(CONTAINER_START_TIMEOUT)
				.start();

			return { container, options: { database: "defaultdb", host: container.getHost(), port: container.getMappedPort(COCKROACH_PORT), timeTravelQueries: false, type: "cockroachdb", username: "root" } as DataSourceOptions };
		},
	},
];

// These drivers have no INSERT RETURNING, so a primary key the column default fills cannot be read back.
const REFUSED_DRIVERS: Array<{ column: IColumnOptions; name: string; start: IDriverSpec["start"] }> = [
	{ column: { precision: 3, type: "datetime" }, name: "mysql", start: startMysqlFamily("mysql:8", "mysql", { MYSQL_DATABASE, MYSQL_ROOT_PASSWORD: MYSQL_PASSWORD }) },
	{ column: { type: "datetime" }, name: "better-sqlite3", start: async () => ({ options: { database: ":memory:", type: "better-sqlite3" } }) },
];

function normalizeStored(value: string): string {
	const match: null | RegExpExecArray = STORED_PATTERN.exec(value);

	return match ? `${String(match[1])} ${String(match[2])}.${(match[3] ?? "").padEnd(6, "0")}` : value;
}

@Injectable()
class DriverAuthGuard implements IAuthGuard {
	public canActivate(context: ExecutionContext): boolean {
		context.switchToHttp().getRequest<{ user?: unknown }>().user = { id: "user-1" };

		return true;
	}

	public getAuthenticateOptions(): undefined {
		return undefined;
	}

	public getRequest<TRequest = any>(context: ExecutionContext): TRequest {
		return context.switchToHttp().getRequest();
	}

	public handleRequest<TUser = any>(_error: any, user: any): TUser {
		return user;
	}

	public async logIn(): Promise<void> {
		return Promise.resolve();
	}
}

const disabledRoutes = {
	[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
	[EApiRouteType.GET]: { generation: { isEnabled: false } },
	[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
	[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
	[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
};

function createFixture(driver: string, key: string, options: IColumnOptions): { controllers: Array<Type<unknown>>; entity: Type<object>; path: string; providers: Array<Type<unknown>>; table: string } {
	const path: string = `${driver}-${key}`.toLowerCase();
	const table: string = `temporal_${path.replaceAll("-", "_")}`;

	class DriverKeyEntity {
		public at!: Date;

		public name!: string;
	}

	Object.defineProperty(DriverKeyEntity, "name", { value: `DriverKey_${table}` });
	Reflect.defineMetadata("design:type", Date, DriverKeyEntity.prototype, "at");
	Reflect.defineMetadata("design:type", String, DriverKeyEntity.prototype, "name");
	PrimaryColumn(options as never)(DriverKeyEntity.prototype, "at");
	describeKey(DriverKeyEntity.prototype, "at");
	Column({ type: "varchar", length: 64 })(DriverKeyEntity.prototype, "name");
	describeName(DriverKeyEntity.prototype, "name");
	Entity(table)(DriverKeyEntity);

	@Injectable()
	@ApiService({ entity: DriverKeyEntity } as never)
	class DriverKeyService extends ApiServiceBase<never> {
		@InjectRepository(DriverKeyEntity)
		public readonly repository!: Repository<never>;
	}

	@Injectable()
	@ApiAuthorizationPolicy({ entity: DriverKeyEntity } as never)
	class DriverKeyPolicy extends ApiAuthorizationPolicyBase<never> {
		public onBeforeCreate() {
			return this.allow({ scope: () => ({ where: { name: IN_SCOPE } as never }) });
		}
	}

	@ApiController<never>({ entity: DriverKeyEntity, name: path, path, routes: { [EApiRouteType.CREATE]: {}, ...disabledRoutes } } as never)
	class OpenDriverKeyController {
		@Inject(DriverKeyService)
		public readonly service!: DriverKeyService;
	}

	const namespace: string = `temporal-${path}`;

	@ApiControllerSecurable()
	@ApiController<never>({
		authorization: { defaultMode: EApiAuthorizationMode.HOOKS, policyNamespace: namespace, resourceDefinition: { entity: DriverKeyEntity, fields: [{ isFilterable: true, path: "resource.name", queryPath: "name" }], namespace, resourcePath: `${namespace}/{id}`, resourceType: namespace } },
		entity: DriverKeyEntity,
		name: `${path}-scoped`,
		path: `${path}-scoped`,
		routes: { [EApiRouteType.CREATE]: { security: { authentication: { guard: DriverAuthGuard, type: EApiAuthenticationType.USER } } }, ...disabledRoutes },
	} as never)
	class ScopedDriverKeyController {
		@Inject(DriverKeyService)
		public readonly service!: DriverKeyService;
	}

	return { controllers: [OpenDriverKeyController, ScopedDriverKeyController], entity: DriverKeyEntity, path, providers: [DriverKeyPolicy, DriverKeyService], table };
}

describe.each(DRIVERS)("Generated CREATE temporal key on $name (E2E)", (driver: IDriverSpec) => {
	const fixtures = Object.fromEntries(Object.entries(driver.columns).map(([key, options]: [string, IColumnOptions]) => [key, createFixture(driver.name, key, options)])) as Partial<Record<TKeyName, ReturnType<typeof createFixture>>>;
	const all: Array<ReturnType<typeof createFixture>> = Object.values(fixtures);
	const pick = (...keys: Array<TKeyName>): Array<[TKeyName, ReturnType<typeof createFixture>]> => keys.flatMap((key: TKeyName): Array<[TKeyName, ReturnType<typeof createFixture>]> => (fixtures[key] ? [[key, fixtures[key]]] : []));
	const instants = pick("instant", "instantAlias", "instantDefault");
	const wallClocks = pick("wall", "wallDefault", "timestamp");
	const finer = pick("instant", "instantThree", "wall");
	const defaults = pick("dateFunction", "inferred");
	const wall = fixtures.wall as ReturnType<typeof createFixture>;
	const wallZero = fixtures.wallZero as ReturnType<typeof createFixture>;
	let container: StartedTestContainer | undefined;
	let options: DataSourceOptions;

	beforeAll(async () => {
		const started = await driver.start();

		container = started.container;
		options = started.options;
	}, CONTAINER_START_TIMEOUT);

	afterAll(async () => {
		await container?.stop();
	}, 60_000);

	describe.each([
		["without a body pipe", false],
		["behind a transforming ValidationPipe", true],
	])("%s", (_mode: string, hasPipe: boolean) => {
		let app: INestApplication;
		let dataSource: DataSource;
		let fastify: { inject: (options: { method: string; payload?: unknown; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };

		beforeAll(async () => {
			@Module({
				controllers: all.flatMap((fixture) => fixture.controllers),
				imports: [TypeOrmModule.forRoot({ ...options, dropSchema: true, entities: all.map((fixture) => fixture.entity), logging: false, synchronize: true } as never), TypeOrmModule.forFeature(all.map((fixture) => fixture.entity)), ApiAuthorizationModule.forRoot({ principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user) } }), ApiSubscriberModule],
				providers: [DriverAuthGuard, ...all.flatMap((fixture) => fixture.providers), ...(hasPipe ? [{ provide: APP_PIPE, useValue: new ValidationPipe({ skipMissingProperties: true, transform: true }) }] : [])],
			})
			class DriverKeyModule {}

			const moduleRef = await Test.createTestingModule({ imports: [DriverKeyModule] }).compile();

			app = moduleRef.createNestApplication(new FastifyAdapter());
			await app.init();
			fastify = app.getHttpAdapter().getInstance() as typeof fastify;
			dataSource = app.get(DataSource);
		}, CONTAINER_START_TIMEOUT);

		afterAll(async () => {
			await app?.close();
		}, 60_000);

		beforeEach(async () => {
			for (const fixture of all) {
				await dataSource.query(`delete from ${fixture.table}`);
			}
		});

		async function readStored(fixture: ReturnType<typeof createFixture>, isInstant: boolean = false): Promise<Array<string>> {
			const rows: Array<{ at: Date | string }> = await dataSource.query(driver.readAt(fixture.table, isInstant));

			return rows.map((row: { at: Date | string }): string => normalizeStored(String(row.at))).sort();
		}

		describe.each(["UTC", "America/New_York"])("in the %s time zone", (zone: string) => {
			let timeZone: string | undefined;

			beforeAll(() => {
				timeZone = process.env.TZ;
				process.env.TZ = zone;
			});

			afterAll(() => {
				if (timeZone === undefined) {
					delete process.env.TZ;
				} else {
					process.env.TZ = timeZone;
				}
			});

			it.runIf(instants.length > 0).each(instants)("stores the instant of a zoned value on %s", async (_name: TKeyName, fixture: ReturnType<typeof createFixture>) => {
				const offset = await fastify.inject({ method: "POST", payload: { at: "2024-11-03T01:30:00-04:00", name: IN_SCOPE }, url: `/${fixture.path}` });
				const utc = await fastify.inject({ method: "POST", payload: { at: "2024-01-02T03:04:05.678Z", name: IN_SCOPE }, url: `/${fixture.path}` });

				expect([offset.statusCode, utc.statusCode]).toEqual([201, 201]);
				expect(await readStored(fixture, true)).toEqual(["2024-01-02 03:04:05.678000", "2024-11-03 05:30:00.000000"]);
			});

			it.runIf(instants.length > 0).each(instants)("refuses a value without a zone on %s with the validation body", async (_name: TKeyName, fixture: ReturnType<typeof createFixture>) => {
				const response = await fastify.inject({ method: "POST", payload: { at: "2024-03-10T02:30:00", name: IN_SCOPE }, url: `/${fixture.path}` });

				expect(response.json()).toEqual({ error: "Bad Request", message: ["at must carry a time zone designator or an offset"], statusCode: 400 });
				expect(await readStored(fixture, true)).toEqual([]);
			});

			it.each(wallClocks)("stores a value without a zone as its wall clock on %s", async (_name: TKeyName, fixture: ReturnType<typeof createFixture>) => {
				const response = await fastify.inject({ method: "POST", payload: { at: "2024-01-02T03:04:05.678", name: IN_SCOPE }, url: `/${fixture.path}` });

				expect(response.statusCode).toBe(201);
				expect(await readStored(fixture)).toEqual(["2024-01-02 03:04:05.678000"]);
			});

			it.each(finer)("refuses microseconds on %s before the insert", async (name: TKeyName, fixture: ReturnType<typeof createFixture>) => {
				const response = await fastify.inject({ method: "POST", payload: { at: "2024-01-02T03:04:05.678912Z", name: IN_SCOPE }, url: `/${fixture.path}` });

				expect(response.json()).toEqual({ error: "Bad Request", message: ["at must not hold more than 3 fractional second digits"], statusCode: 400 });
				expect(await readStored(fixture, name.startsWith("instant"))).toEqual([]);
			});

			it("refuses milliseconds on a whole second column before the insert", async () => {
				const response = await fastify.inject({ method: "POST", payload: { at: "2024-01-02T03:04:05.678", name: IN_SCOPE }, url: `/${wallZero.path}` });

				expect(response.json()).toEqual({ error: "Bad Request", message: ["at must not hold more than 0 fractional second digits"], statusCode: 400 });
				expect(await readStored(wallZero)).toEqual([]);
			});

			it("stores a value the column precision holds", async () => {
				const response = await fastify.inject({ method: "POST", payload: { at: "2024-01-02T03:04:05", name: IN_SCOPE }, url: `/${wallZero.path}` });

				expect(response.statusCode).toBe(201);
				expect(await readStored(wallZero)).toEqual(["2024-01-02 03:04:05.000000"]);
			});

			it.each(defaults)("identifies a microsecond default on %s", async (_name: TKeyName, fixture: ReturnType<typeof createFixture>) => {
				const response = await fastify.inject({ method: "POST", payload: { name: IN_SCOPE }, url: `/${fixture.path}` });

				expect(response.statusCode).toBe(201);
				expect(await readStored(fixture)).toEqual(["2024-01-02 03:04:05.678912"]);
			});

			it("stores a row inside the scope and rolls back a row outside it", async () => {
				const stored = await fastify.inject({ method: "POST", payload: { at: "2024-01-02T03:04:05.678", name: IN_SCOPE }, url: `/${wall.path}-scoped` });
				const refused = await fastify.inject({ method: "POST", payload: { at: "2024-01-02T03:04:06.678", name: OUT_OF_SCOPE }, url: `/${wall.path}-scoped` });

				expect([stored.statusCode, refused.statusCode]).toEqual([201, 403]);
				expect(await readStored(wall)).toEqual(["2024-01-02 03:04:05.678000"]);
			});
		});
	});
});

describe.each(REFUSED_DRIVERS)("Generated CREATE temporal key on $name (E2E)", ({ column, name, start }) => {
	const fixture: ReturnType<typeof createFixture> = createFixture(name, "refused", column);
	let container: StartedTestContainer | undefined;
	let options: DataSourceOptions;

	beforeAll(async () => {
		const started = await start();

		container = started.container;
		options = started.options;
	}, CONTAINER_START_TIMEOUT);

	afterAll(async () => {
		await container?.stop();
	}, 60_000);

	it("fails at startup and names the supported drivers", async () => {
		@Module({
			controllers: fixture.controllers,
			imports: [TypeOrmModule.forRoot({ ...options, dropSchema: true, entities: [fixture.entity], logging: false, synchronize: true } as never), TypeOrmModule.forFeature([fixture.entity]), ApiAuthorizationModule.forRoot({ principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user) } }), ApiSubscriberModule],
			providers: [DriverAuthGuard, ...fixture.providers],
		})
		class RefusedDriverModule {}

		const moduleRef = await Test.createTestingModule({ imports: [RefusedDriverModule] }).compile();
		const app: INestApplication = moduleRef.createNestApplication(new FastifyAdapter());

		await expect(app.init()).rejects.toThrow(`cannot identify its date and time primary column at on the ${name} driver; supported drivers are cockroachdb, mariadb, postgres`);
		await moduleRef.get(DataSource).destroy();
	});
});
