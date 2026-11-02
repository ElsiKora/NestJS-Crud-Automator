import "reflect-metadata";

import type { ExecutionContext, INestApplication, Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";

import { Inject, Injectable, Module } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Column, DataSource, Entity, PrimaryColumn, PrimaryGeneratedColumn, Repository } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiAuthorizationPolicy, ApiAuthorizationPolicyBase, ApiController, ApiControllerSecurable, ApiPropertyDescribe, ApiService, ApiServiceBase, ApiSubscriberModule, AuthorizationResolveDefaultPrincipal, CamelCaseString, EApiAuthenticationType, EApiAuthorizationMode, EApiDtoType, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../src/index";

const IN_SCOPE: string = "tenant-1";
const OUT_OF_SCOPE: string = "tenant-2";
const RACE_ROUNDS: number = 20;
const RACE_SIZE: number = 12;

const describeKey: PropertyDecorator = ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, properties: { [EApiRouteType.CREATE]: { [EApiDtoType.BODY]: { isRequired: false } } }, type: EApiPropertyDescribeType.DATE } as never);
const describeText: PropertyDecorator = ApiPropertyDescribe({ description: "text", exampleValue: "value", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", properties: { [EApiRouteType.CREATE]: { [EApiDtoType.BODY]: { isRequired: true } } }, type: EApiPropertyDescribeType.STRING });

@Entity("create_precision_filled_default")
class FinerDefaultEntity {
	@PrimaryColumn({ default: () => "clock_timestamp()", type: "timestamptz" })
	@describeKey
	public at!: Date;

	@Column({ length: 64, type: "varchar" })
	@describeText
	public tenantId!: string;
}

@Entity("create_precision_body_default")
class FinerBodyEntity {
	@PrimaryColumn({ type: "timestamp" })
	@describeKey
	public at!: Date;

	@Column({ length: 64, type: "varchar" })
	@describeText
	public tenantId!: string;
}

@Entity("create_precision_six")
class FinerDeclaredEntity {
	@PrimaryColumn({ precision: 6, type: "timestamptz" })
	@describeKey
	public at!: Date;

	@Column({ length: 64, type: "varchar" })
	@describeText
	public tenantId!: string;
}

@Entity("create_precision_composite")
class FinerCompositeEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ type: EApiPropertyDescribeType.UUID } as never)
	public id!: string;

	@PrimaryColumn({ type: "timestamptz" })
	@describeKey
	public at!: Date;

	@Column({ length: 64, type: "varchar" })
	@describeText
	public tenantId!: string;
}

@Entity("create_precision_three")
class MillisecondKeyEntity {
	@PrimaryColumn({ default: () => "clock_timestamp()", precision: 3, type: "timestamptz" })
	@describeKey
	public at!: Date;

	@Column({ length: 64, type: "varchar" })
	@describeText
	public tenantId!: string;
}

@Injectable()
class PrecisionAuthGuard implements IAuthGuard {
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

function createFixture(entity: Type<object>, path: string, isSecurable: boolean): { controller: Type<unknown>; providers: Array<Type<unknown>> } {
	@Injectable()
	@ApiService({ entity } as never)
	class PrecisionService extends ApiServiceBase<never> {
		@InjectRepository(entity)
		public readonly repository!: Repository<never>;
	}

	@Injectable()
	@ApiAuthorizationPolicy({ entity } as never)
	class PrecisionPolicy extends ApiAuthorizationPolicyBase<never> {
		public onBeforeCreate() {
			return this.allow({ scope: () => ({ where: { tenantId: IN_SCOPE } as never }) });
		}
	}

	class PrecisionController {
		@Inject(PrecisionService)
		public readonly service!: PrecisionService;
	}

	// Every controller of one application needs its own class name, because the name starts its generated DTO names.
	Object.defineProperty(PrecisionController, "name", { value: `${CamelCaseString(path)}Controller` });

	const authorization: object = isSecurable ? { authorization: { defaultMode: EApiAuthorizationMode.HOOKS, policyNamespace: path, resourceDefinition: { entity, fields: [{ isFilterable: true, path: "resource.tenantId", queryPath: "tenantId" }], namespace: path, resourcePath: `${path}/{id}`, resourceType: path } } } : {};
	const security: object = isSecurable ? { security: { authentication: { guard: PrecisionAuthGuard, type: EApiAuthenticationType.USER } } } : {};
	const controller = ApiController<never>({ ...authorization, entity, name: path, path, routes: { [EApiRouteType.CREATE]: security, ...disabledRoutes } } as never)(PrecisionController);

	if (isSecurable) {
		ApiControllerSecurable()(controller);
	}

	return { controller, providers: [PrecisionPolicy, PrecisionService] };
}

describe("Generated CREATE key precision on PostgreSQL (E2E)", () => {
	let container: StartedPostgreSqlContainer;
	let options: object;

	const createApplication = async (fixture: ReturnType<typeof createFixture>, entity: Type<object>): Promise<{ app: INestApplication; dataSource: () => DataSource }> => {
		@Module({
			controllers: [fixture.controller],
			imports: [TypeOrmModule.forRoot({ ...options, dropSchema: true, entities: [entity], extra: { max: RACE_SIZE * 2 }, logging: false, synchronize: true } as never), TypeOrmModule.forFeature([entity]), ApiAuthorizationModule.forRoot({ principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) } } as never), ApiSubscriberModule],
			providers: [PrecisionAuthGuard, ...fixture.providers],
		})
		class PrecisionModule {}

		const moduleRef = await Test.createTestingModule({ imports: [PrecisionModule] }).compile();

		return { app: moduleRef.createNestApplication(new FastifyAdapter()), dataSource: (): DataSource => moduleRef.get(DataSource) };
	};

	beforeAll(async () => {
		container = await new PostgreSqlContainer("postgres:17-alpine").start();
		options = { database: container.getDatabase(), host: container.getHost(), password: container.getPassword(), port: container.getPort(), type: "postgres", username: container.getUsername() };
	}, 180_000);

	afterAll(async () => {
		await container?.stop();
	}, 60_000);

	it.each([
		["a key the database fills", FinerDefaultEntity, "finer-default"],
		["a key the body sends", FinerBodyEntity, "finer-body"],
		["a declared precision of 6", FinerDeclaredEntity, "finer-declared"],
		["one column of a composite key", FinerCompositeEntity, "finer-composite"],
	] as const)("refuses %s finer than a millisecond under authorization at startup", async (_name: string, entity: Type<object>, path: string) => {
		const { app, dataSource } = await createApplication(createFixture(entity, path, true), entity);

		await expect(app.init()).rejects.toThrow(`Controller "${CamelCaseString(path)}Controller" route "create" cannot identify the row it creates under authorization: date and time primary column at of ${entity.name} can hold values finer than a millisecond, which a JavaScript Date cannot tell apart, so the scope could be checked against another row; declare it with precision: 3`);
		await dataSource().destroy();
	});

	it("keeps a route without authorization on such a key", async () => {
		const { app } = await createApplication(createFixture(FinerDefaultEntity, "finer-open", false), FinerDefaultEntity);

		await app.init();
		await app.getHttpAdapter().getInstance().ready();

		const response = await app
			.getHttpAdapter()
			.getInstance()
			.inject({ method: "POST", payload: { tenantId: OUT_OF_SCOPE }, url: "/finer-open" });

		expect(response.statusCode).toBe(201);
		await app.close();
	});

	describe("on a key of millisecond precision", () => {
		let app: INestApplication;
		let items: Repository<MillisecondKeyEntity>;

		const post = async (payload: object): Promise<{ json: () => { at: string; tenantId: string }; statusCode: number }> => await app.getHttpAdapter().getInstance().inject({ method: "POST", payload, url: "/millisecond" });

		beforeAll(async () => {
			const created = await createApplication(createFixture(MillisecondKeyEntity, "millisecond", true), MillisecondKeyEntity);
			app = created.app;
			await app.init();
			await app.getHttpAdapter().getInstance().ready();
			items = created.dataSource().getRepository(MillisecondKeyEntity);
		});

		afterAll(async () => {
			await app?.close();
		});

		beforeEach(async () => {
			await items.clear();
		});

		it("stores a row in scope and rolls back a row out of scope", async () => {
			const stored = await post({ tenantId: IN_SCOPE });
			const refused = await post({ tenantId: OUT_OF_SCOPE });

			expect([stored.statusCode, refused.statusCode]).toEqual([201, 403]);
			expect(await items.countBy({ tenantId: OUT_OF_SCOPE })).toBe(0);
			expect(stored.json().tenantId).toBe(IN_SCOPE);
		});

		it("never answers with the row of another request for the millisecond an earlier response named", async () => {
			const stored = await post({ tenantId: IN_SCOPE });
			const refused = await post({ at: stored.json().at, tenantId: OUT_OF_SCOPE });

			expect(stored.statusCode).toBe(201);
			expect(refused.statusCode).not.toBe(201);
			expect(await items.countBy({ tenantId: OUT_OF_SCOPE })).toBe(0);
			expect(await items.countBy({ tenantId: IN_SCOPE })).toBe(1);
		});

		it("cannot hold a second row of one millisecond, whatever path writes it", async () => {
			const stored = await post({ tenantId: IN_SCOPE });
			const at: string = stored.json().at;

			await expect(items.query(`insert into create_precision_three (at, "tenantId") values ($1::timestamptz + interval '400 microseconds', $2)`, [at, OUT_OF_SCOPE])).rejects.toThrow("duplicate key");
			expect(await items.count()).toBe(1);
		});

		it("never commits an out-of-scope row or answers with another row when requests race", { timeout: 120_000 }, async () => {
			for (let round: number = 0; round < RACE_ROUNDS; round += 1) {
				const responses = await Promise.all(Array.from({ length: RACE_SIZE }, async (_value: unknown, index: number) => await post({ tenantId: index % 2 === 0 ? OUT_OF_SCOPE : IN_SCOPE })));

				for (const [index, response] of responses.entries()) {
					expect([201, 403, 409]).toContain(response.statusCode);

					if (response.statusCode === 201) {
						expect(index % 2).toBe(1);
						expect(response.json().tenantId).toBe(IN_SCOPE);
					}
				}

				expect(await items.countBy({ tenantId: OUT_OF_SCOPE })).toBe(0);
			}
		});
	});
});
