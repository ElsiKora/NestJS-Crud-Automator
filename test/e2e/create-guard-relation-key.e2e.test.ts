import "reflect-metadata";

import type { INestApplication, Provider } from "@nestjs/common";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { Relation } from "typeorm";

import { Inject, Injectable, Module, ValidationPipe } from "@nestjs/common";
import { APP_PIPE } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Column, DataSource, DeleteDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, Repository } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiFunctionSubscriber, ApiFunctionSubscriberBase, ApiPropertyDescribe, ApiService, ApiServiceBase, ApiServiceObservable, ApiSubscriberModule, AuthorizationResolveDefaultPrincipal, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../src/index";

type TDriver = "postgres" | "sqlite";
type TPipe = "none" | "transform";
type TResponse = { json: () => unknown; statusCode: number };

interface IBodyCase<A extends Array<string>> {
	// Whether the function subscriber hands the save the relation too.
	isAttaching?: boolean;
	name: string;
	// A generated body never holds a key column, and a relation over one column is a scalar in it, so the whitelisting pipe answers 400 to other shapes.
	pipes: Array<TPipe>;
	toBody: (...key: A) => object;
}

enum ECreateGuardKeyKind {
	ACCOUNT = "account",
	DEVICE = "device",
}

const SOURCE_STORED: string = "aaaaaaaa-0000-4000-8000-000000000001";
const SOURCE_REMOVED: string = "aaaaaaaa-0000-4000-8000-000000000002";
const SOURCE_NEW: string = "aaaaaaaa-0000-4000-8000-000000000003";
const OWNER_STORED: string = "bbbbbbbb-0000-4000-8000-000000000001";
const OWNER_NEW: string = "bbbbbbbb-0000-4000-8000-000000000002";

const TEXT_PROPERTY: Parameters<typeof ApiPropertyDescribe>[0] = { description: "text", exampleValue: "value", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING };
const UUID_PROPERTY: Parameters<typeof ApiPropertyDescribe>[0] = { description: "id", type: EApiPropertyDescribeType.UUID };
const KIND_PROPERTY: Parameters<typeof ApiPropertyDescribe>[0] = { description: "kind", enum: ECreateGuardKeyKind, enumName: "ECreateGuardKeyKind", type: EApiPropertyDescribeType.ENUM };
const RELATION_PROPERTY: Parameters<typeof ApiPropertyDescribe>[0] = { description: "relation", type: EApiPropertyDescribeType.RELATION };

const disabledRoute = { generation: { isEnabled: false } } as const;

const createOnlyRoutes = {
	[EApiRouteType.CREATE]: {},
	[EApiRouteType.DELETE]: disabledRoute,
	[EApiRouteType.GET]: disabledRoute,
	[EApiRouteType.GET_LIST]: disabledRoute,
	[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
	[EApiRouteType.UPDATE]: disabledRoute,
} as const;

const PIPES: Record<TPipe, Array<Provider>> = {
	none: [],
	transform: [{ provide: APP_PIPE, useValue: new ValidationPipe({ forbidNonWhitelisted: true, skipMissingProperties: true, transform: true, whitelist: true }) }],
};

// Whether the function subscriber hands the save the identity relation, as a create that attaches the related row does.
const knob: { isAttaching: boolean } = { isAttaching: false };

/**
 * Declares the entities of one driver, whose key kind is a real enum type on PostgreSQL.
 * @param {TDriver} driver - Driver the entities are declared for.
 * @returns {object} Entities, controllers and providers of the fixture.
 */
function createFixture(driver: TDriver) {
	const kindColumn: NonNullable<Parameters<typeof PrimaryColumn>[1]> = driver === "postgres" ? { enum: ECreateGuardKeyKind, enumName: "create_guard_key_kind", type: "enum" } : { enum: ECreateGuardKeyKind, type: "simple-enum" };

	@Entity("create_guard_key_identities")
	class CreateGuardKeyIdentityEntity {
		@ApiPropertyDescribe(KIND_PROPERTY)
		@PrimaryColumn(kindColumn)
		public kind!: ECreateGuardKeyKind;

		@ApiPropertyDescribe(TEXT_PROPERTY)
		@Column({ length: 64, type: "varchar" })
		public name!: string;

		@ApiPropertyDescribe(UUID_PROPERTY)
		@PrimaryColumn({ name: "source_id", type: "uuid" })
		public sourceId!: string;
	}

	// Both key columns are also the join columns of the composite relation to the identity.
	@Entity("create_guard_key_bindings")
	class CreateGuardKeyBindingEntity {
		@DeleteDateColumn({ nullable: true })
		public deletedAt?: Date | null;

		@ApiPropertyDescribe(RELATION_PROPERTY)
		@JoinColumn([
			{ name: "kind", referencedColumnName: "kind" },
			{ name: "source_id", referencedColumnName: "sourceId" },
		])
		@ManyToOne(() => CreateGuardKeyIdentityEntity)
		public identity?: Relation<CreateGuardKeyIdentityEntity>;

		@ApiPropertyDescribe(KIND_PROPERTY)
		@PrimaryColumn(kindColumn)
		public kind!: ECreateGuardKeyKind;

		@ApiPropertyDescribe(TEXT_PROPERTY)
		@Column({ length: 64, type: "varchar" })
		public label!: string;

		@ApiPropertyDescribe(UUID_PROPERTY)
		@PrimaryColumn({ name: "source_id", type: "uuid" })
		public sourceId!: string;
	}

	@Entity("create_guard_key_owners")
	class CreateGuardKeyOwnerEntity {
		@ApiPropertyDescribe(UUID_PROPERTY)
		@PrimaryColumn({ type: "uuid" })
		public id!: string;

		@ApiPropertyDescribe(TEXT_PROPERTY)
		@Column({ length: 64, type: "varchar" })
		public name!: string;
	}

	// The one key column is also the join column of the relation to the owner.
	@Entity("create_guard_key_profiles")
	class CreateGuardKeyProfileEntity {
		@ApiPropertyDescribe(TEXT_PROPERTY)
		@Column({ length: 64, type: "varchar" })
		public label!: string;

		@ApiPropertyDescribe(RELATION_PROPERTY)
		@JoinColumn({ name: "ownerId" })
		@ManyToOne(() => CreateGuardKeyOwnerEntity)
		public owner?: Relation<CreateGuardKeyOwnerEntity>;

		@ApiPropertyDescribe(UUID_PROPERTY)
		@PrimaryColumn({ type: "uuid" })
		public ownerId!: string;
	}

	@Injectable()
	@ApiServiceObservable()
	@ApiService({ entity: CreateGuardKeyBindingEntity })
	class CreateGuardKeyBindingService extends ApiServiceBase<CreateGuardKeyBindingEntity> {
		@InjectRepository(CreateGuardKeyBindingEntity)
		public readonly repository!: Repository<CreateGuardKeyBindingEntity>;
	}

	@Injectable()
	@ApiService({ entity: CreateGuardKeyProfileEntity })
	class CreateGuardKeyProfileService extends ApiServiceBase<CreateGuardKeyProfileEntity> {
		@InjectRepository(CreateGuardKeyProfileEntity)
		public readonly repository!: Repository<CreateGuardKeyProfileEntity>;
	}

	@Injectable()
	@ApiFunctionSubscriber({ entity: CreateGuardKeyBindingEntity })
	class CreateGuardKeyBindingSubscriber extends ApiFunctionSubscriberBase<CreateGuardKeyBindingEntity> {
		public async onBeforeCreate(context: { result?: Record<string, unknown> }): Promise<never> {
			const result: Record<string, unknown> = context.result ?? {};

			return await Promise.resolve((knob.isAttaching ? { ...result, identity: { kind: result.kind, sourceId: result.sourceId } } : result) as never);
		}
	}

	@ApiController<CreateGuardKeyBindingEntity>({ entity: CreateGuardKeyBindingEntity, name: "create-guard-key-binding", path: "bindings", routes: createOnlyRoutes })
	class CreateGuardKeyBindingController {
		@Inject(CreateGuardKeyBindingService)
		public readonly service!: CreateGuardKeyBindingService;
	}

	@ApiController<CreateGuardKeyProfileEntity>({ entity: CreateGuardKeyProfileEntity, name: "create-guard-key-profile", path: "profiles", routes: createOnlyRoutes })
	class CreateGuardKeyProfileController {
		@Inject(CreateGuardKeyProfileService)
		public readonly service!: CreateGuardKeyProfileService;
	}

	return {
		bindingEntity: CreateGuardKeyBindingEntity,
		controllers: [CreateGuardKeyBindingController, CreateGuardKeyProfileController],
		entities: [CreateGuardKeyBindingEntity, CreateGuardKeyIdentityEntity, CreateGuardKeyOwnerEntity, CreateGuardKeyProfileEntity],
		identityEntity: CreateGuardKeyIdentityEntity,
		ownerEntity: CreateGuardKeyOwnerEntity,
		profileEntity: CreateGuardKeyProfileEntity,
		providers: [CreateGuardKeyBindingService, CreateGuardKeyBindingSubscriber, CreateGuardKeyProfileService],
	};
}

const DUPLICATE_BINDING: Record<string, unknown> = { details: { type: "UNIQUE_VIOLATION" }, error: "Conflict", message: "CREATEGUARDKEYBINDINGENTITY_DUPLICATE_KEY", statusCode: 409 };
const DUPLICATE_PROFILE: Record<string, unknown> = { ...DUPLICATE_BINDING, message: "CREATEGUARDKEYPROFILEENTITY_DUPLICATE_KEY" };

// The binding (account, stored) is live and (device, removed) is soft deleted; (account, new) has an identity and no binding.
const STORED_BINDINGS: Array<Record<string, unknown>> = [
	{ isDeleted: false, kind: ECreateGuardKeyKind.ACCOUNT, label: "stored", sourceId: SOURCE_STORED },
	{ isDeleted: true, kind: ECreateGuardKeyKind.DEVICE, label: "removed", sourceId: SOURCE_REMOVED },
];

const STORED_PROFILES: Array<Record<string, unknown>> = [{ label: "stored", ownerId: OWNER_STORED }];

describe.each<TDriver>(["postgres", "sqlite"])("A create whose key columns a relation also joins checks the key by its column values on %s (E2E)", (driver: TDriver) => {
	const fixture = createFixture(driver);
	let container: StartedPostgreSqlContainer | undefined;

	beforeAll(async () => {
		container = driver === "postgres" ? await new PostgreSqlContainer("postgres:17-alpine").start() : undefined;
	}, 300_000);

	afterAll(async () => {
		await container?.stop();
	}, 60_000);

	describe.each<TPipe>(["none", "transform"])("with the %s pipe", (pipe: TPipe) => {
		let app: INestApplication;
		let dataSource: DataSource;

		const send = async (url: string, body: object): Promise<TResponse> =>
			await app
				.getHttpAdapter()
				.getInstance()
				.inject({ headers: { "content-type": "application/json" }, method: "POST", payload: body, url });

		const readBindings = async (): Promise<Array<Record<string, unknown>>> => (await dataSource.getRepository(fixture.bindingEntity).find({ order: { sourceId: "ASC" }, withDeleted: true })).map((row: InstanceType<typeof fixture.bindingEntity>): Record<string, unknown> => ({ isDeleted: Boolean(row.deletedAt), kind: row.kind, label: row.label, sourceId: row.sourceId }));

		const readProfiles = async (): Promise<Array<Record<string, unknown>>> => (await dataSource.getRepository(fixture.profileEntity).find({ order: { ownerId: "ASC" } })).map((row: InstanceType<typeof fixture.profileEntity>): Record<string, unknown> => ({ label: row.label, ownerId: row.ownerId }));

		beforeAll(async () => {
			const options: object = container ? { type: "postgres", url: container.getConnectionUri() } : { database: ":memory:", type: "better-sqlite3" };

			@Module({
				controllers: fixture.controllers,
				imports: [TypeOrmModule.forRoot({ ...options, dropSchema: true, entities: fixture.entities, logging: false, synchronize: true } as never), TypeOrmModule.forFeature([fixture.bindingEntity, fixture.profileEntity]), ApiAuthorizationModule.forRoot({ principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) } } as never), ApiSubscriberModule],
				providers: [...fixture.providers, ...PIPES[pipe]],
			})
			class CreateGuardKeyModule {}

			const moduleRef = await Test.createTestingModule({ imports: [CreateGuardKeyModule] }).compile();
			app = moduleRef.createNestApplication(new FastifyAdapter());
			await app.init();
			await app.getHttpAdapter().getInstance().ready();
			dataSource = moduleRef.get(DataSource);
		}, 300_000);

		afterAll(async () => {
			await app?.close();
		}, 60_000);

		beforeEach(async () => {
			knob.isAttaching = false;
			await dataSource.getRepository(fixture.bindingEntity).createQueryBuilder().delete().execute();
			await dataSource.getRepository(fixture.identityEntity).createQueryBuilder().delete().execute();
			await dataSource.getRepository(fixture.profileEntity).createQueryBuilder().delete().execute();
			await dataSource.getRepository(fixture.ownerEntity).createQueryBuilder().delete().execute();
			await dataSource.getRepository(fixture.identityEntity).save([
				{ kind: ECreateGuardKeyKind.ACCOUNT, name: "stored", sourceId: SOURCE_STORED },
				{ kind: ECreateGuardKeyKind.DEVICE, name: "removed", sourceId: SOURCE_REMOVED },
				{ kind: ECreateGuardKeyKind.ACCOUNT, name: "new", sourceId: SOURCE_NEW },
			]);
			await dataSource.getRepository(fixture.bindingEntity).save([
				{ kind: ECreateGuardKeyKind.ACCOUNT, label: "stored", sourceId: SOURCE_STORED },
				{ kind: ECreateGuardKeyKind.DEVICE, label: "removed", sourceId: SOURCE_REMOVED },
			]);
			await dataSource.getRepository(fixture.bindingEntity).softDelete({ kind: ECreateGuardKeyKind.DEVICE, sourceId: SOURCE_REMOVED });
			await dataSource.getRepository(fixture.ownerEntity).save([
				{ id: OWNER_STORED, name: "stored" },
				{ id: OWNER_NEW, name: "new" },
			]);
			await dataSource.getRepository(fixture.profileEntity).save({ label: "stored", ownerId: OWNER_STORED });
		});

		const bindingCases: Array<IBodyCase<[ECreateGuardKeyKind, string]>> = [
			{ name: "the key columns", pipes: ["none"], toBody: (kind: ECreateGuardKeyKind, sourceId: string): object => ({ kind, label: "made", sourceId }) },
			{ name: "the relation object", pipes: ["none", "transform"], toBody: (kind: ECreateGuardKeyKind, sourceId: string): object => ({ identity: { kind, sourceId }, label: "made" }) },
			{ isAttaching: true, name: "the key columns, which a function subscriber also hands the save as the relation", pipes: ["none"], toBody: (kind: ECreateGuardKeyKind, sourceId: string): object => ({ kind, label: "made", sourceId }) },
			{ isAttaching: true, name: "the relation object, which a function subscriber hands the save again", pipes: ["none", "transform"], toBody: (kind: ECreateGuardKeyKind, sourceId: string): object => ({ identity: { kind, sourceId }, label: "made" }) },
		];

		const profileCases: Array<IBodyCase<[string]>> = [
			{ name: "the key column", pipes: ["none"], toBody: (ownerId: string): object => ({ label: "made", ownerId }) },
			{ name: "the relation key", pipes: ["none", "transform"], toBody: (ownerId: string): object => ({ label: "made", owner: ownerId }) },
			{ name: "the relation object", pipes: ["none"], toBody: (ownerId: string): object => ({ label: "made", owner: { id: ownerId } }) },
		];

		describe.each(bindingCases.filter((bodyCase: IBodyCase<[ECreateGuardKeyKind, string]>): boolean => bodyCase.pipes.includes(pipe)))("a binding the body names by $name", (bodyCase: IBodyCase<[ECreateGuardKeyKind, string]>) => {
			beforeEach(() => {
				knob.isAttaching = bodyCase.isAttaching === true;
			});

			it("is created under a new key", async () => {
				const response: TResponse = await send("/bindings", bodyCase.toBody(ECreateGuardKeyKind.ACCOUNT, SOURCE_NEW));

				expect.soft(response.json()).toMatchObject({ kind: ECreateGuardKeyKind.ACCOUNT, label: "made", sourceId: SOURCE_NEW });
				expect(response.statusCode).toBe(201);
				expect(await readBindings()).toEqual([...STORED_BINDINGS, { isDeleted: false, kind: ECreateGuardKeyKind.ACCOUNT, label: "made", sourceId: SOURCE_NEW }]);
			});

			it.each([
				["a stored binding", ECreateGuardKeyKind.ACCOUNT, SOURCE_STORED],
				["a soft deleted binding", ECreateGuardKeyKind.DEVICE, SOURCE_REMOVED],
			])("answers 409 to the key of %s and changes no row", async (_row: string, kind: ECreateGuardKeyKind, sourceId: string) => {
				const response: TResponse = await send("/bindings", bodyCase.toBody(kind, sourceId));

				expect.soft(response.json()).toEqual(DUPLICATE_BINDING);
				expect(response.statusCode).toBe(409);
				expect(await readBindings()).toEqual(STORED_BINDINGS);
			});
		});

		describe.each(profileCases.filter((bodyCase: IBodyCase<[string]>): boolean => bodyCase.pipes.includes(pipe)))("a profile whose one key column a relation joins, named by $name", (bodyCase: IBodyCase<[string]>) => {
			it("is created under a new key", async () => {
				const response: TResponse = await send("/profiles", bodyCase.toBody(OWNER_NEW));

				expect.soft(response.json()).toMatchObject({ label: "made", ownerId: OWNER_NEW });
				expect(response.statusCode).toBe(201);
				expect(await readProfiles()).toEqual([...STORED_PROFILES, { label: "made", ownerId: OWNER_NEW }]);
			});

			it("answers 409 to the key of a stored profile and changes no row", async () => {
				const response: TResponse = await send("/profiles", bodyCase.toBody(OWNER_STORED));

				expect.soft(response.json()).toEqual(DUPLICATE_PROFILE);
				expect(response.statusCode).toBe(409);
				expect(await readProfiles()).toEqual(STORED_PROFILES);
			});
		});
	});
});
