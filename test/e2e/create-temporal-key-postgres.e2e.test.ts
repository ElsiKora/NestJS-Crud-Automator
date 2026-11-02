import "reflect-metadata";

import type { INestApplication, Type } from "@nestjs/common";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { ValueTransformer } from "typeorm";

import { Inject, Injectable, Module, ValidationPipe } from "@nestjs/common";
import { APP_PIPE } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Column, DataSource, Entity, PrimaryColumn, Repository } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiPropertyDescribe, ApiService, ApiServiceBase, ApiSubscriberModule, AuthorizationResolveDefaultPrincipal, EApiDtoType, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../src/index";

const MICROSECOND_DEFAULT: string = "'2024-01-02 03:04:05.678912'";
const MILLISECONDS_PER_SECOND: number = 1000;

// What each call of the key transformer received, so a test sees that the key reached it as a Date.
const transformerInputs: Array<string> = [];

// Stores whole seconds, so a range over the key would collapse once each end went through it.
const secondsTransformer: ValueTransformer = {
	from: (value: unknown): unknown => value,
	to: (value: unknown): unknown => {
		transformerInputs.push(value instanceof Date ? "Date" : typeof value);

		return value instanceof Date ? new Date(Math.floor(value.getTime() / MILLISECONDS_PER_SECOND) * MILLISECONDS_PER_SECOND) : value;
	},
};

const describeKey: PropertyDecorator = ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, properties: { [EApiRouteType.CREATE]: { [EApiDtoType.BODY]: { isRequired: false } } }, type: EApiPropertyDescribeType.DATE } as never);
const describeName: PropertyDecorator = ApiPropertyDescribe({ description: "name", exampleValue: "value", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING });

@Entity("temporal_key_instant")
class InstantKeyEntity {
	@PrimaryColumn({ type: "timestamptz" })
	@describeKey
	public at!: Date;

	@Column({ type: "varchar" })
	@describeName
	public name!: string;
}

@Entity("temporal_key_instant_alias")
class InstantAliasKeyEntity {
	@PrimaryColumn({ type: "timestamp with time zone" })
	@describeKey
	public at!: Date;

	@Column({ type: "varchar" })
	@describeName
	public name!: string;
}

@Entity("temporal_key_instant_default")
class InstantDefaultKeyEntity {
	@PrimaryColumn({ default: () => "now()", type: "timestamptz" })
	@describeKey
	public at!: Date;

	@Column({ type: "varchar" })
	@describeName
	public name!: string;
}

@Entity("temporal_key_instant_three")
class InstantThreeDigitsKeyEntity {
	@PrimaryColumn({ precision: 3, type: "timestamptz" })
	@describeKey
	public at!: Date;

	@Column({ type: "varchar" })
	@describeName
	public name!: string;
}

@Entity("temporal_key_wall")
class WallClockKeyEntity {
	@PrimaryColumn({ type: "timestamp" })
	@describeKey
	public at!: Date;

	@Column({ type: "varchar" })
	@describeName
	public name!: string;
}

@Entity("temporal_key_wall_default")
class WallClockDefaultKeyEntity {
	@PrimaryColumn({ default: () => "now()", type: "timestamp" })
	@describeKey
	public at!: Date;

	@Column({ type: "varchar" })
	@describeName
	public name!: string;
}

@Entity("temporal_key_wall_zero")
class WallClockZeroDigitsKeyEntity {
	@PrimaryColumn({ precision: 0, type: "timestamp" })
	@describeKey
	public at!: Date;

	@Column({ type: "varchar" })
	@describeName
	public name!: string;
}

@Entity("temporal_key_date_function")
class DateFunctionKeyEntity {
	@PrimaryColumn({ default: () => MICROSECOND_DEFAULT, type: Date })
	@describeKey
	public at!: Date;

	@Column({ type: "varchar" })
	@describeName
	public name!: string;
}

@Entity("temporal_key_inferred")
class InferredKeyEntity {
	@PrimaryColumn({ default: () => MICROSECOND_DEFAULT })
	@describeKey
	public at!: Date;

	@Column({ type: "varchar" })
	@describeName
	public name!: string;
}

@Entity("temporal_key_instant_transformed")
class InstantTransformedKeyEntity {
	@PrimaryColumn({ transformer: secondsTransformer, type: "timestamptz" })
	@describeKey
	public at!: Date;

	@Column({ type: "varchar" })
	@describeName
	public name!: string;
}

@Entity("temporal_key_instant_alias_transformed")
class InstantAliasTransformedKeyEntity {
	@PrimaryColumn({ transformer: secondsTransformer, type: "timestamp with time zone" })
	@describeKey
	public at!: Date;

	@Column({ type: "varchar" })
	@describeName
	public name!: string;
}

@Entity("temporal_key_wall_transformed")
class WallClockTransformedKeyEntity {
	@PrimaryColumn({ transformer: secondsTransformer, type: "timestamp" })
	@describeKey
	public at!: Date;

	@Column({ type: "varchar" })
	@describeName
	public name!: string;
}

const entities: Array<Type<object>> = [DateFunctionKeyEntity, InferredKeyEntity, InstantAliasKeyEntity, InstantAliasTransformedKeyEntity, InstantDefaultKeyEntity, InstantKeyEntity, InstantThreeDigitsKeyEntity, InstantTransformedKeyEntity, WallClockDefaultKeyEntity, WallClockKeyEntity, WallClockTransformedKeyEntity, WallClockZeroDigitsKeyEntity];

function createFixture(entity: Type<object>): { controller: Type<unknown>; service: Type<unknown> } {
	@Injectable()
	@ApiService({ entity } as never)
	class TemporalKeyService extends ApiServiceBase<never> {
		@InjectRepository(entity)
		public readonly repository!: Repository<never>;
	}

	class TemporalKeyController {
		@Inject(TemporalKeyService)
		public readonly service!: TemporalKeyService;
	}

	// Every controller of one application needs its own class name, because the name starts its generated DTO names.
	Object.defineProperty(TemporalKeyController, "name", { value: `${entity.name}Controller` });

	const controller = ApiController<never>({
		entity,
		name: entity.name,
		path: entity.name,
		routes: {
			[EApiRouteType.CREATE]: {},
			[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
			[EApiRouteType.GET]: { generation: { isEnabled: false } },
			[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
			[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
			[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
		},
	} as never)(TemporalKeyController);

	return { controller, service: TemporalKeyService };
}

const fixtures: Array<{ controller: Type<unknown>; service: Type<unknown> }> = entities.map((entity: Type<object>) => createFixture(entity));

describe("Generated CREATE temporal key from the body on PostgreSQL (E2E)", () => {
	let container: StartedPostgreSqlContainer;

	beforeAll(async () => {
		container = await new PostgreSqlContainer("postgres:17-alpine").start();
	}, 180_000);

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
				controllers: fixtures.map((fixture) => fixture.controller),
				imports: [TypeOrmModule.forRoot({ database: container.getDatabase(), dropSchema: true, entities, host: container.getHost(), logging: false, password: container.getPassword(), port: container.getPort(), synchronize: true, type: "postgres", username: container.getUsername() }), TypeOrmModule.forFeature(entities), ApiAuthorizationModule.forRoot({ principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user) } }), ApiSubscriberModule],
				providers: [...fixtures.map((fixture) => fixture.service), ...(hasPipe ? [{ provide: APP_PIPE, useValue: new ValidationPipe({ skipMissingProperties: true, transform: true }) }] : [])],
			})
			class TemporalKeyModule {}

			const moduleRef = await Test.createTestingModule({ imports: [TemporalKeyModule] }).compile();

			app = moduleRef.createNestApplication(new FastifyAdapter());
			await app.init();
			fastify = app.getHttpAdapter().getInstance() as typeof fastify;
			dataSource = app.get(DataSource);
		}, 120_000);

		afterAll(async () => {
			await app?.close();
		}, 60_000);

		beforeEach(async () => {
			for (const entity of entities) {
				await dataSource.getRepository(entity).clear();
			}

			transformerInputs.length = 0;
		});

		async function readStored(entity: Type<object>): Promise<Array<string>> {
			const rows: Array<{ at: string }> = await dataSource.query(`select to_char(at ${dataSource.getMetadata(entity).primaryColumns[0]?.type === "timestamp" ? "" : "at time zone 'UTC'"}, 'YYYY-MM-DD HH24:MI:SS.US') as at from ${dataSource.getMetadata(entity).tableName}`);

			return rows.map((row: { at: string }): string => row.at);
		}

		describe.each(["UTC", "Europe/Moscow", "America/New_York", "Asia/Kolkata"])("in the %s time zone", (zone: string) => {
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

			it.runIf(zone === "America/New_York")("refuses the second occurrence of a repeated hour on timestamp, which stores the wall clock of the first", async () => {
				const response = await fastify.inject({ method: "POST", payload: { at: "2024-11-03T06:30:00.000Z", name: "second" }, url: `/${WallClockKeyEntity.name}` });

				expect(response.statusCode).toBe(400);
				expect(await readStored(WallClockKeyEntity)).toEqual([]);
			});

			it.each([
				["timestamptz", InstantKeyEntity],
				["the long timestamptz alias", InstantAliasKeyEntity],
				["timestamptz with a default", InstantDefaultKeyEntity],
			])("stores the instant of a zoned value on %s", async (_name: string, entity: Type<object>) => {
				const offset = await fastify.inject({ method: "POST", payload: { at: "2024-11-03T01:30:00-04:00", name: "offset" }, url: `/${entity.name}` });
				const utc = await fastify.inject({ method: "POST", payload: { at: "2024-01-02T03:04:05.678Z", name: "utc" }, url: `/${entity.name}` });

				expect([offset.statusCode, utc.statusCode]).toEqual([201, 201]);
				expect((await readStored(entity)).sort()).toEqual(["2024-01-02 03:04:05.678000", "2024-11-03 05:30:00.000000"]);
			});

			it.each([
				["timestamptz", InstantKeyEntity],
				["the long timestamptz alias", InstantAliasKeyEntity],
				["timestamptz with a default", InstantDefaultKeyEntity],
			])("refuses a value without a zone on %s with the validation body", async (_name: string, entity: Type<object>) => {
				const response = await fastify.inject({ method: "POST", payload: { at: "2024-03-10T02:30:00", name: "wall" }, url: `/${entity.name}` });

				expect(response.statusCode).toBe(400);
				expect(response.json()).toEqual({ error: "Bad Request", message: ["at must carry a time zone designator or an offset"], statusCode: 400 });
				expect(await readStored(entity)).toEqual([]);
			});

			it.each([
				["timestamp", WallClockKeyEntity],
				["timestamp with a default", WallClockDefaultKeyEntity],
			])("stores a value without a zone as its wall clock on %s", async (_name: string, entity: Type<object>) => {
				const response = await fastify.inject({ method: "POST", payload: { at: "2024-01-02T03:04:05.678", name: "wall" }, url: `/${entity.name}` });

				expect(response.statusCode).toBe(201);
				expect(await readStored(entity)).toEqual(["2024-01-02 03:04:05.678000"]);
			});

			it.each([
				["milliseconds on timestamp(0)", WallClockZeroDigitsKeyEntity, "2024-01-02T03:04:05.678", 0],
				["microseconds on timestamptz(3)", InstantThreeDigitsKeyEntity, "2024-01-02T03:04:05.678912Z", 3],
				["microseconds on timestamptz", InstantKeyEntity, "2024-01-02T03:04:05.678912Z", 3],
			])("refuses %s before the insert", async (_name: string, entity: Type<object>, at: string, digits: number) => {
				const response = await fastify.inject({ method: "POST", payload: { at, name: "fine" }, url: `/${entity.name}` });

				expect(response.statusCode).toBe(400);
				expect(response.json()).toEqual({ error: "Bad Request", message: [`at must not hold more than ${digits} fractional second digits`], statusCode: 400 });
				expect(await readStored(entity)).toEqual([]);
			});

			it.each([
				["timestamptz", InstantKeyEntity],
				["the long timestamptz alias", InstantAliasKeyEntity],
				["timestamptz with a default", InstantDefaultKeyEntity],
			])("stores a historic instant exactly on %s", async (_name: string, entity: Type<object>) => {
				// Before standard time a zone offset holds seconds, which node-postgres cuts from a Date it writes.
				const response = await fastify.inject({ method: "POST", payload: { at: "1800-06-01T12:00:02Z", name: "historic" }, url: `/${entity.name}` });

				expect(response.statusCode).toBe(201);
				expect(await readStored(entity)).toEqual(["1800-06-01 12:00:02.000000"]);
			});

			it.each([
				["timestamptz", InstantTransformedKeyEntity, "2024-01-02T03:04:05.678Z"],
				["the long timestamptz alias", InstantAliasTransformedKeyEntity, "2024-01-02T03:04:05.678Z"],
				["timestamp", WallClockTransformedKeyEntity, "2024-01-02T03:04:05.678"],
			])("identifies a transformed key on %s by its stored value", async (_name: string, entity: Type<object>, at: string) => {
				const response = await fastify.inject({ method: "POST", payload: { at, name: "transformed" }, url: `/${entity.name}` });

				expect(response.statusCode).toBe(201);
				expect(await readStored(entity)).toEqual(["2024-01-02 03:04:05.000000"]);
				expect(transformerInputs.length).toBeGreaterThan(0);
				expect(new Set(transformerInputs)).toEqual(new Set(["Date"]));
			});

			it("stores a value the column precision holds", async () => {
				const response = await fastify.inject({ method: "POST", payload: { at: "2024-01-02T03:04:05", name: "whole" }, url: `/${WallClockZeroDigitsKeyEntity.name}` });

				expect(response.statusCode).toBe(201);
				expect(await readStored(WallClockZeroDigitsKeyEntity)).toEqual(["2024-01-02 03:04:05.000000"]);
			});

			it.each([
				["a Date column type", DateFunctionKeyEntity],
				["an inferred column type", InferredKeyEntity],
			])("identifies a microsecond default on %s", async (_name: string, entity: Type<object>) => {
				const response = await fastify.inject({ method: "POST", payload: { name: "default" }, url: `/${entity.name}` });

				expect(response.statusCode).toBe(201);
				expect(await readStored(entity)).toEqual(["2024-01-02 03:04:05.678912"]);
			});
		});
	});
});
