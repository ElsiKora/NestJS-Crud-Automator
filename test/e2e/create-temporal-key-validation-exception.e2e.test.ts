import "reflect-metadata";

import type { ArgumentsHost, INestApplication, Type } from "@nestjs/common";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { ValidationError } from "class-validator";

import { BadRequestException, Catch, HttpStatus, Inject, Injectable, Module, ValidationPipe } from "@nestjs/common";
import { BaseExceptionFilter, HttpAdapterHost } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Column, DataSource, Entity, PrimaryColumn, Repository } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiPropertyDescribe, ApiRequestValidationGetErrors, ApiService, ApiServiceBase, ApiSubscriberModule, AuthorizationResolveDefaultPrincipal, EApiDtoType, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../src/index";

const CORE_RULES: Record<string, string> = { isDateFormatValue: "DATE" };

const describeKey: PropertyDecorator = ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, properties: { [EApiRouteType.CREATE]: { [EApiDtoType.BODY]: { isRequired: false } } }, type: EApiPropertyDescribeType.DATE } as never);
const describeName: PropertyDecorator = ApiPropertyDescribe({ description: "name", exampleValue: "value", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING });

@Entity("validation_exception_key_instant")
class ValidationExceptionInstantKeyEntity {
	@PrimaryColumn({ type: "timestamptz" })
	@describeKey
	public at!: Date;

	@Column({ type: "varchar" })
	@describeName
	public name!: string;
}

@Entity("validation_exception_key_wall")
class ValidationExceptionWallClockKeyEntity {
	@PrimaryColumn({ type: "timestamp" })
	@describeKey
	public at!: Date;

	@Column({ type: "varchar" })
	@describeName
	public name!: string;
}

const entities: Array<Type<object>> = [ValidationExceptionInstantKeyEntity, ValidationExceptionWallClockKeyEntity];

const REFUSALS: Array<{ at: string; constraint: string; entity: Type<object>; message: string; name: string }> = [
	{ at: "2026-02-30T00:00:00.000Z", constraint: "isDateFormatValue", entity: ValidationExceptionInstantKeyEntity, message: "at must be a valid ISO 8601 date-time", name: "an impossible date" },
	{ at: "2024-03-10T02:30:00", constraint: "createKeyNoTimeZone", entity: ValidationExceptionInstantKeyEntity, message: "at must carry a time zone designator or an offset", name: "an instant without a zone" },
	{ at: "2024-01-02T03:04:05.678912Z", constraint: "createKeyFinerThanColumn", entity: ValidationExceptionInstantKeyEntity, message: "at must not hold more than 3 fractional second digits", name: "a value finer than the column" },
	{ at: "2024-11-03T06:30:00.000Z", constraint: "createKeyRepeatedHour", entity: ValidationExceptionWallClockKeyEntity, message: "at falls in the second occurrence of an hour that a daylight saving change repeats in the process time zone, which this column cannot store apart from the first", name: "the second occurrence of a repeated hour" },
];

/**
 * The exception factory of a host with its own error contract, as Core has it on its ValidationPipe.
 * @param {Array<ValidationError>} errors - Validation failures.
 * @returns {BadRequestException} The host's answer.
 */
function coreExceptionFactory(errors: Array<ValidationError>): BadRequestException {
	return new BadRequestException({ code: "VALIDATION_FAILED", errors: errors.flatMap((error: ValidationError): Array<{ path: string; rule: string }> => Object.keys(error.constraints ?? {}).map((constraint: string): { path: string; rule: string } => ({ path: error.property, rule: CORE_RULES[constraint] ?? constraint }))) });
}

// Translates a refusal raised outside the pipe with the same factory the pipe uses.
@Catch()
class E2eCreateKeyExceptionCoreFilter extends BaseExceptionFilter {
	public override catch(exception: unknown, host: ArgumentsHost): void {
		const errors: Array<ValidationError> | undefined = ApiRequestValidationGetErrors(exception);

		super.catch(errors ? coreExceptionFactory(errors) : exception, host);
	}
}

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

describe("A refused CREATE date and time key on PostgreSQL (E2E)", () => {
	let container: StartedPostgreSqlContainer;
	let timeZone: string | undefined;

	beforeAll(async () => {
		// The repeated hour exists only in a zone with a daylight saving change.
		timeZone = process.env.TZ;
		process.env.TZ = "America/New_York";
		container = await new PostgreSqlContainer("postgres:17-alpine").start();
	}, 180_000);

	afterAll(async () => {
		await container?.stop();

		if (timeZone === undefined) {
			delete process.env.TZ;
		} else {
			process.env.TZ = timeZone;
		}
	}, 60_000);

	describe.each([
		["with a host filter that uses the pipe's exception factory", true],
		["without a host filter", false],
	])("%s", (_mode: string, hasFilter: boolean) => {
		let app: INestApplication;
		let dataSource: DataSource;
		let fastify: { inject: (options: { method: string; payload?: unknown; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };

		beforeAll(async () => {
			@Module({
				controllers: fixtures.map((fixture) => fixture.controller),
				imports: [TypeOrmModule.forRoot({ database: container.getDatabase(), dropSchema: true, entities, host: container.getHost(), logging: false, password: container.getPassword(), port: container.getPort(), synchronize: true, type: "postgres", username: container.getUsername() }), TypeOrmModule.forFeature(entities), ApiAuthorizationModule.forRoot({ principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user) } }), ApiSubscriberModule],
				providers: fixtures.map((fixture) => fixture.service),
			})
			class CreateKeyExceptionModule {}

			const moduleRef = await Test.createTestingModule({ imports: [CreateKeyExceptionModule] }).compile();

			app = moduleRef.createNestApplication(new FastifyAdapter(), { logger: false });
			app.useGlobalPipes(new ValidationPipe({ exceptionFactory: coreExceptionFactory, skipMissingProperties: true, transform: true }));

			if (hasFilter) {
				app.useGlobalFilters(new E2eCreateKeyExceptionCoreFilter(app.get(HttpAdapterHost).httpAdapter));
			}

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
		});

		it.each(REFUSALS)("refuses $name before the insert", async ({ at, constraint, entity, message }: { at: string; constraint: string; entity: Type<object>; message: string }) => {
			const response = await fastify.inject({ method: "POST", payload: { at, name: "refused" }, url: `/${entity.name}` });

			expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
			expect(response.json()).toEqual(hasFilter ? { code: "VALIDATION_FAILED", errors: [{ path: "at", rule: CORE_RULES[constraint] ?? constraint }] } : { error: "Bad Request", message: [message], statusCode: HttpStatus.BAD_REQUEST });
			expect(await dataSource.getRepository(entity).count()).toBe(0);
		});

		it("still stores a valid key", async () => {
			const response = await fastify.inject({ method: "POST", payload: { at: "2024-01-02T03:04:05.678Z", name: "stored" }, url: `/${ValidationExceptionInstantKeyEntity.name}` });

			expect(response.statusCode).toBe(HttpStatus.CREATED);
			expect(await dataSource.getRepository(ValidationExceptionInstantKeyEntity).count()).toBe(1);
		});
	});
});
