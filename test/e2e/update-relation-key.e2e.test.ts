import "reflect-metadata";

import type { ExecutionContext, INestApplication } from "@nestjs/common";
import type { TypeOrmModuleOptions } from "@nestjs/typeorm";
import type { StartedMySqlContainer } from "@testcontainers/mysql";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { StartedTestContainer } from "testcontainers";
import type { EntityManager, Relation, Repository } from "typeorm";

import type { IApiPolicyDocumentRecord, IApiPolicyStatement, TApiSubscriberFunctionAfterUpdateContext, TApiSubscriberFunctionBeforeUpdateContext } from "../../src/index";

import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { MySqlContainer } from "@testcontainers/mysql";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { GenericContainer, Wait } from "testcontainers";
import { ChildEntity, Column, DeleteDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn, TableInheritance } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
	ApiAuthorizationModule,
	ApiController,
	ApiControllerSecurable,
	ApiFunctionSubscriber,
	ApiFunctionSubscriberBase,
	ApiFunctionTransactionScope,
	ApiPropertyDescribe,
	ApiService,
	ApiServiceBase,
	ApiServiceObservable,
	ApiSubscriberModule,
	AuthorizationResolveDefaultPrincipal,
	EApiAuthenticationType,
	EApiAuthorizationMode,
	EApiAuthorizationPrincipalType,
	EApiControllerRelationReferenceShape,
	EApiControllerRequestTarget,
	EApiControllerRequestTransformerType,
	EApiPolicyEffect,
	EApiPolicySourceType,
	EApiPropertyDescribeType,
	EApiPropertyStringType,
	EApiRouteType,
} from "../../src/index";

type TDatabase = "mariadb" | "mysql" | "postgres" | "sqlite";
type TVerb = "PATCH" | "PUT";

const MARIADB_PASSWORD: string = "secret";
const MYSQL_PORT: number = 3306;

const OWNER_A: string = "a0000000-0000-4000-8000-000000000001";
const OWNER_B: string = "a0000000-0000-4000-8000-000000000002";
const OWNER_C: string = "a0000000-0000-4000-8000-000000000003";
const OWNER_BLOCKED: string = "a0000000-0000-4000-8000-000000000004";
const OWNER_MISSING: string = "a0000000-0000-4000-8000-0000000000ff";
const CATEGORY_A: string = "b0000000-0000-4000-8000-000000000001";
const CATEGORY_B: string = "b0000000-0000-4000-8000-000000000002";
const CATEGORY_BLOCKED: string = "b0000000-0000-4000-8000-000000000003";
const REVIEWER_A: string = "c0000000-0000-4000-8000-000000000001";
const REVIEWER_B: string = "c0000000-0000-4000-8000-000000000002";
const REVIEWER_GONE: string = "c0000000-0000-4000-8000-000000000003";
const PROFILE_A: string = "d0000000-0000-4000-8000-000000000001";
const PROFILE_B: string = "d0000000-0000-4000-8000-000000000002";
const ITEM: string = "e0000000-0000-4000-8000-000000000001";
const ITEM_DELETED: string = "e0000000-0000-4000-8000-000000000002";
const ITEM_BLOCKED: string = "e0000000-0000-4000-8000-000000000003";
const VEHICLE: string = "f0000000-0000-4000-8000-000000000001";
const NAMESPACE: string = "relkey:item";
const POLICY_ID: string = "relkey-policy";
const ITEMS: string = "update-relation-key/items";
const SCOPED_ITEMS: string = "update-relation-key/scoped-items";
const TRANSFORMED_ITEMS: string = "update-relation-key/transformed-items";
const VEHICLES: string = "update-relation-key/vehicles";

const describeId: PropertyDecorator = ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID });
const describeNullableId: PropertyDecorator = ApiPropertyDescribe({ description: "nullable id", isNullable: true, type: EApiPropertyDescribeType.UUID } as never);
const describeRelation: PropertyDecorator = ApiPropertyDescribe({ description: "relation", type: EApiPropertyDescribeType.RELATION });
const describeText: PropertyDecorator = ApiPropertyDescribe({ description: "text", exampleValue: "value", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING });

enum ERelKeyVehicleKind {
	BIKE = "BIKE",
	CAR = "CAR",
}

@Entity("relkey_owners")
class RelKeyOwnerEntity {
	@describeId
	@PrimaryColumn({ length: 36, type: "varchar" })
	public id!: string;

	@Column({ length: 64, type: "varchar" })
	@describeText
	public name!: string;
}

@Entity("relkey_categories")
class RelKeyCategoryEntity {
	@describeId
	@PrimaryColumn({ length: 36, type: "varchar" })
	public id!: string;

	@Column({ length: 64, type: "varchar" })
	@describeText
	public name!: string;
}

@Entity("relkey_reviewers")
class RelKeyReviewerEntity {
	@describeId
	@PrimaryColumn({ length: 36, type: "varchar" })
	public id!: string;

	@DeleteDateColumn({ nullable: true })
	public deletedAt?: Date | null;
}

@Entity("relkey_profiles")
class RelKeyProfileEntity {
	@describeId
	@PrimaryColumn({ length: 36, type: "varchar" })
	public id!: string;
}

@Entity("relkey_sites")
class RelKeySiteEntity {
	@describeId
	@Column({ length: 36, type: "varchar", unique: true })
	public id!: string;

	@PrimaryColumn({ length: 36, type: "varchar" })
	@describeText
	public regionCode!: string;

	@PrimaryColumn({ length: 36, type: "varchar" })
	@describeText
	public siteCode!: string;
}

@Entity("relkey_items")
class RelKeyItemEntity {
	@describeId
	@PrimaryColumn({ length: 36, type: "varchar" })
	public id!: string;

	// A database transformer on another column of the row: the write has to keep running it.
	@Column({ length: 64, transformer: { from: (value: string): string => value, to: (value: string | undefined): string | undefined => value?.toLowerCase() }, type: "varchar" })
	@describeText
	public label!: string;

	@Column({ length: 36, type: "varchar" })
	@describeId
	public ownerId!: string;

	@describeRelation
	@JoinColumn({ name: "ownerId" })
	@ManyToOne(() => RelKeyOwnerEntity, { eager: true, nullable: false })
	public owner!: Relation<RelKeyOwnerEntity>;

	@Column({ length: 36, nullable: true, type: "varchar" })
	@describeNullableId
	public categoryId?: null | string;

	@describeRelation
	@JoinColumn({ name: "categoryId" })
	@ManyToOne(() => RelKeyCategoryEntity, { nullable: true })
	public category?: null | Relation<RelKeyCategoryEntity>;

	@Column({ length: 36, nullable: true, type: "varchar" })
	@describeNullableId
	public reviewerId?: null | string;

	@describeRelation
	@JoinColumn({ name: "reviewerId" })
	@ManyToOne(() => RelKeyReviewerEntity, { eager: true, nullable: true })
	public reviewer?: null | Relation<RelKeyReviewerEntity>;

	@Column({ length: 36, nullable: true, type: "varchar" })
	@describeNullableId
	public profileId?: null | string;

	@describeRelation
	@JoinColumn({ name: "profileId" })
	@OneToOne(() => RelKeyProfileEntity, { eager: true, nullable: true })
	public profile?: null | Relation<RelKeyProfileEntity>;

	// Eager, its join column is not a property of the entity.
	@describeRelation
	@ManyToOne(() => RelKeyOwnerEntity, { eager: true, nullable: true })
	public sponsor?: null | Relation<RelKeyOwnerEntity>;

	// Not eager, its join column is not a property of the entity, and the constructor removes the class field, as a compile target without class fields leaves it out.
	@describeRelation
	@ManyToOne(() => RelKeyOwnerEntity, { nullable: true })
	public patron?: null | Relation<RelKeyOwnerEntity>;

	@Column({ length: 36, type: "varchar" })
	@describeText
	public regionCode!: string;

	@Column({ length: 36, type: "varchar" })
	@describeText
	public siteCode!: string;

	@describeRelation
	@JoinColumn([
		{ name: "regionCode", referencedColumnName: "regionCode" },
		{ name: "siteCode", referencedColumnName: "siteCode" },
	])
	@ManyToOne(() => RelKeySiteEntity, { eager: true, nullable: false })
	public site!: Relation<RelKeySiteEntity>;

	@DeleteDateColumn({ nullable: true })
	public deletedAt?: Date | null;

	public constructor() {
		Reflect.deleteProperty(this, "patron");
	}
}

@Entity("relkey_audits")
class RelKeyAuditEntity {
	@PrimaryColumn({ length: 64, type: "varchar" })
	public id!: string;
}

@Entity("relkey_vehicles")
@TableInheritance({ column: { length: 16, name: "kind", type: "varchar" } })
class RelKeyVehicleEntity {
	@describeId
	@PrimaryColumn({ length: 36, type: "varchar" })
	public id!: string;

	@Column({ enum: ERelKeyVehicleKind, type: "simple-enum" })
	@ApiPropertyDescribe({ description: "kind", enum: ERelKeyVehicleKind, enumName: "ERelKeyVehicleKind", type: EApiPropertyDescribeType.ENUM })
	public kind!: ERelKeyVehicleKind;

	@Column({ length: 36, type: "varchar" })
	@describeId
	public ownerId!: string;

	@describeRelation
	@JoinColumn({ name: "ownerId" })
	@ManyToOne(() => RelKeyOwnerEntity, { eager: true, nullable: false })
	public owner!: Relation<RelKeyOwnerEntity>;
}

@ChildEntity(ERelKeyVehicleKind.CAR)
class RelKeyCarEntity extends RelKeyVehicleEntity {
	@Column({ length: 36, nullable: true, type: "varchar" })
	@describeNullableId
	public dealerId?: null | string;

	@describeRelation
	@JoinColumn({ name: "dealerId" })
	@ManyToOne(() => RelKeyOwnerEntity, { eager: true, nullable: true })
	public dealer?: null | Relation<RelKeyOwnerEntity>;
}

@ChildEntity(ERelKeyVehicleKind.BIKE)
class RelKeyBikeEntity extends RelKeyVehicleEntity {
	@Column({ nullable: true, type: "int" })
	public gears?: null | number;
}

@Injectable()
@ApiServiceObservable()
@ApiService({ entity: RelKeyItemEntity })
class RelKeyItemService extends ApiServiceBase<RelKeyItemEntity> {
	@InjectRepository(RelKeyItemEntity)
	public readonly repository!: Repository<RelKeyItemEntity>;
}

/**
 * Service of the related row that request hydration reads.
 */
@Injectable()
@ApiService({ entity: RelKeyOwnerEntity })
class RelKeyOwnerService extends ApiServiceBase<RelKeyOwnerEntity> {
	@InjectRepository(RelKeyOwnerEntity)
	public readonly repository!: Repository<RelKeyOwnerEntity>;
}

@Injectable()
@ApiService({ entity: RelKeyVehicleEntity })
class RelKeyVehicleService extends ApiServiceBase<RelKeyVehicleEntity> {
	@InjectRepository(RelKeyVehicleEntity)
	public readonly repository!: Repository<RelKeyVehicleEntity>;
}

const subscriberState: { after: Array<{ owner: unknown; ownerId: unknown }>; before: Array<{ currentOwner: unknown; currentOwnerId: unknown }>; extra?: Record<string, unknown>; isAuditing: boolean } = { after: [], before: [], isAuditing: false };

/**
 * Records what function subscribers of an update receive, and lets a test change the write as a subscriber can.
 */
@ApiFunctionSubscriber({ entity: RelKeyItemEntity })
class RelKeyItemSubscriber extends ApiFunctionSubscriberBase<RelKeyItemEntity> {
	public async onAfterUpdate(context: TApiSubscriberFunctionAfterUpdateContext<RelKeyItemEntity>): Promise<RelKeyItemEntity> {
		subscriberState.after.push({ owner: context.result?.owner, ownerId: context.result?.ownerId });

		if (subscriberState.isAuditing) {
			await context.DATA.repository.manager.getRepository(RelKeyAuditEntity).save({ id: `audit-${String(subscriberState.after.length)}` });
		}

		return context.result as RelKeyItemEntity;
	}

	public onBeforeUpdate(context: TApiSubscriberFunctionBeforeUpdateContext<RelKeyItemEntity>): Promise<never> {
		subscriberState.before.push({ currentOwner: context.DATA.currentEntity?.owner, currentOwnerId: context.DATA.currentEntity?.ownerId });

		return Promise.resolve((subscriberState.extra ? { ...context.result, ...subscriberState.extra } : context.result) as never);
	}
}

const USER: Record<string, unknown> = { id: "user-1" };

/**
 * Authenticates every request as the one test user.
 */
@Injectable()
class RelKeyGuard {
	public canActivate(context: ExecutionContext): boolean {
		context.switchToHttp().getRequest<{ user?: unknown }>().user = USER;

		return true;
	}
}

const DISABLED = { generation: { isEnabled: false } } as const;
const authentication = { guard: RelKeyGuard, type: EApiAuthenticationType.USER } as never;

@ApiController<RelKeyItemEntity>({
	entity: RelKeyItemEntity,
	name: "RelKeyItems",
	path: ITEMS,
	routes: { [EApiRouteType.CREATE]: DISABLED, [EApiRouteType.DELETE]: DISABLED, [EApiRouteType.GET_LIST]: DISABLED },
} as never)
class RelKeyItemController {
	public constructor(@Inject(RelKeyItemService) public readonly service: RelKeyItemService) {}
}

const CATEGORY_RESPONSE = { response: { load: { include: { category: true } }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.OBJECT } } } as const;

@ApiController<RelKeyItemEntity>({
	entity: RelKeyItemEntity,
	name: "RelKeyIncludedItems",
	path: "update-relation-key/included-items",
	routes: { [EApiRouteType.CREATE]: DISABLED, [EApiRouteType.DELETE]: DISABLED, [EApiRouteType.GET]: { relations: CATEGORY_RESPONSE }, [EApiRouteType.GET_LIST]: DISABLED, [EApiRouteType.PARTIAL_UPDATE]: { relations: CATEGORY_RESPONSE }, [EApiRouteType.UPDATE]: { relations: CATEGORY_RESPONSE } },
} as never)
class RelKeyIncludedItemController {
	public constructor(@Inject(RelKeyItemService) public readonly service: RelKeyItemService) {}
}

@ApiController<RelKeyItemEntity>({
	entity: RelKeyItemEntity,
	name: "RelKeyHydratedItems",
	path: "update-relation-key/hydrated-items",
	routes: { [EApiRouteType.CREATE]: DISABLED, [EApiRouteType.DELETE]: DISABLED, [EApiRouteType.GET_LIST]: DISABLED, [EApiRouteType.PARTIAL_UPDATE]: { relations: { request: { load: { include: { owner: true } }, reference: { shape: EApiControllerRelationReferenceShape.SCALAR } } } } },
} as never)
class RelKeyHydratedItemController {
	public constructor(
		@Inject(RelKeyItemService) public readonly service: RelKeyItemService,
		@Inject(RelKeyOwnerService) public readonly ownerService: RelKeyOwnerService,
	) {}
}

@ApiController<RelKeyItemEntity>({
	entity: RelKeyItemEntity,
	name: "RelKeyTransformedItems",
	path: TRANSFORMED_ITEMS,
	routes: {
		[EApiRouteType.CREATE]: DISABLED,
		[EApiRouteType.DELETE]: DISABLED,
		[EApiRouteType.GET_LIST]: DISABLED,
		[EApiRouteType.PARTIAL_UPDATE]: { request: { [EApiControllerRequestTarget.BODY]: { transformers: [{ key: "ownerId", shouldSetValueEvenIfMissing: true, type: EApiControllerRequestTransformerType.STATIC, value: OWNER_C }] } } },
	},
} as never)
class RelKeyTransformedItemController {
	public constructor(@Inject(RelKeyItemService) public readonly service: RelKeyItemService) {}
}

@ApiController<RelKeyVehicleEntity>({
	entity: RelKeyVehicleEntity,
	name: "RelKeyVehicles",
	path: VEHICLES,
	routes: { [EApiRouteType.CREATE]: DISABLED, [EApiRouteType.DELETE]: DISABLED, [EApiRouteType.GET_LIST]: DISABLED },
} as never)
class RelKeyVehicleController {
	public constructor(@Inject(RelKeyVehicleService) public readonly service: RelKeyVehicleService) {}
}

const scopedField = (name: string, queryPath: string = name): object => ({ isFilterable: true, path: `resource.${name}`, queryPath });
const SECURED = { security: { authentication } } as const;

@ApiControllerSecurable()
@ApiController<RelKeyItemEntity>({
	authorization: {
		defaultMode: EApiAuthorizationMode.IAM,
		policyNamespace: NAMESPACE,
		resourceDefinition: { entity: RelKeyItemEntity, fields: [scopedField("id"), scopedField("ownerName", "owner.name"), scopedField("categoryName", "category.name"), scopedField("siteRegion", "site.regionCode")], namespace: NAMESPACE, resourcePath: "relkey:item/{id}", resourceType: NAMESPACE },
	},
	entity: RelKeyItemEntity,
	name: "RelKeyScopedItems",
	path: SCOPED_ITEMS,
	routes: { [EApiRouteType.CREATE]: DISABLED, [EApiRouteType.DELETE]: DISABLED, [EApiRouteType.GET]: SECURED, [EApiRouteType.GET_LIST]: DISABLED, [EApiRouteType.PARTIAL_UPDATE]: SECURED, [EApiRouteType.UPDATE]: SECURED },
} as never)
class RelKeyScopedItemController {
	public constructor(@Inject(RelKeyItemService) public readonly service: RelKeyItemService) {}
}

const denyWhen = (key: string, value: string): IApiPolicyStatement => ({ Action: [`${NAMESPACE}:read`, `${NAMESPACE}:update`], Condition: { StringEquals: { [`resource.${key}`]: value } }, Effect: EApiPolicyEffect.DENY, Resource: ["relkey:item/*"] });
const ALLOW_ALL: IApiPolicyStatement = { Action: [`${NAMESPACE}:*`], Effect: EApiPolicyEffect.ALLOW, Resource: ["relkey:item/*"] };
const SCOPE_STATEMENTS: ReadonlyArray<IApiPolicyStatement> = [ALLOW_ALL, denyWhen("ownerName", "Blocked"), denyWhen("categoryName", "Blocked"), denyWhen("siteRegion", "blocked")];

const startMariaDb = async (): Promise<StartedTestContainer> =>
	await new GenericContainer("mariadb:11")
		.withEnvironment({ MARIADB_DATABASE: "relkey", MARIADB_ROOT_PASSWORD: MARIADB_PASSWORD })
		.withExposedPorts(MYSQL_PORT)
		// The image first runs a temporary server on port 0 to initialize the database.
		.withWaitStrategy(Wait.forLogMessage(/port: 3306\s/u))
		.withStartupTimeout(240_000)
		.start();

const FULL_BODY: Record<string, unknown> = { categoryId: CATEGORY_A, label: "seeded", ownerId: OWNER_A, profileId: PROFILE_A, regionCode: "r1", reviewerId: REVIEWER_A, siteCode: "s1" };

// The own keys a relation of the body decides, so a PUT names them through the relation alone.
const OWN_KEYS: Record<string, ReadonlyArray<string>> = { category: ["categoryId"], owner: ["ownerId"], profile: ["profileId"], reviewer: ["reviewerId"], site: ["regionCode", "siteCode"] };

const buildFullBody = (body: Record<string, unknown>): Record<string, unknown> => {
	const replaced: ReadonlyArray<string> = Object.keys(body).flatMap((key: string): ReadonlyArray<string> => OWN_KEYS[key] ?? []);

	return { ...Object.fromEntries(Object.entries(FULL_BODY).filter(([key]: [string, unknown]): boolean => !replaced.includes(key))), ...body };
};

interface IStoredRow {
	categoryId?: null | string;
	label?: string;
	ownerId?: string;
	patronId?: null | string;
	profileId?: null | string;
	regionCode?: string;
	reviewerId?: null | string;
	siteCode?: string;
	sponsorId?: null | string;
}

interface IWriteCase {
	body: Record<string, unknown>;
	name: string;
	stored: IStoredRow;
}

const SEEDED: IStoredRow = { categoryId: CATEGORY_A, label: "seeded", ownerId: OWNER_A, patronId: OWNER_A, profileId: PROFILE_A, regionCode: "r1", reviewerId: REVIEWER_A, siteCode: "s1", sponsorId: OWNER_A };

const WRITE_CASES: ReadonlyArray<IWriteCase> = [
	{ body: { ownerId: OWNER_B }, name: "the key of an eager required relation", stored: { ownerId: OWNER_B } },
	{ body: { owner: OWNER_B }, name: "an eager required relation", stored: { ownerId: OWNER_B } },
	{ body: { owner: OWNER_B, ownerId: OWNER_B }, name: "an eager required relation and its key", stored: { ownerId: OWNER_B } },
	{ body: { owner: { id: OWNER_B } }, name: "an eager required relation as an object", stored: { ownerId: OWNER_B } },
	{ body: { reviewerId: REVIEWER_B }, name: "the key of an eager nullable relation", stored: { reviewerId: REVIEWER_B } },
	{ body: { reviewer: REVIEWER_B }, name: "an eager nullable relation", stored: { reviewerId: REVIEWER_B } },
	{ body: { reviewerId: null }, name: "a null key of an eager nullable relation", stored: { reviewerId: null } },
	{ body: { reviewer: null }, name: "a null eager nullable relation", stored: { reviewerId: null } },
	{ body: { categoryId: CATEGORY_B }, name: "the key of a nullable relation that is not eager", stored: { categoryId: CATEGORY_B } },
	{ body: { category: CATEGORY_B }, name: "a nullable relation that is not eager", stored: { categoryId: CATEGORY_B } },
	{ body: { categoryId: null }, name: "a null key of a relation that is not eager", stored: { categoryId: null } },
	{ body: { category: null }, name: "a null relation that is not eager", stored: { categoryId: null } },
	{ body: { profileId: PROFILE_B }, name: "the key of an eager one-to-one relation", stored: { profileId: PROFILE_B } },
	{ body: { profile: PROFILE_B }, name: "an eager one-to-one relation", stored: { profileId: PROFILE_B } },
	{ body: { profileId: null }, name: "a null key of an eager one-to-one relation", stored: { profileId: null } },
	{ body: { sponsor: OWNER_B }, name: "an eager relation without a key property", stored: { sponsorId: OWNER_B } },
	{ body: { sponsor: null }, name: "a null eager relation without a key property", stored: { sponsorId: null } },
	{ body: { patron: OWNER_B }, name: "a relation without a key property that is not eager", stored: { patronId: OWNER_B } },
	{ body: { regionCode: "r2", siteCode: "s2" }, name: "both keys of an eager composite relation", stored: { regionCode: "r2", siteCode: "s2" } },
	{ body: { siteCode: "s3" }, name: "one key of an eager composite relation", stored: { siteCode: "s3" } },
	{ body: { site: { regionCode: "r2", siteCode: "s2" } }, name: "an eager composite relation", stored: { regionCode: "r2", siteCode: "s2" } },
	{ body: { regionCode: "r2", site: { regionCode: "r2", siteCode: "s2" }, siteCode: "s2" }, name: "an eager composite relation and its keys", stored: { regionCode: "r2", siteCode: "s2" } },
	{ body: { categoryId: CATEGORY_B, label: "Changed", ownerId: OWNER_B, regionCode: "r2", reviewerId: REVIEWER_B, siteCode: "s2" }, name: "several relations and a column", stored: { categoryId: CATEGORY_B, label: "changed", ownerId: OWNER_B, regionCode: "r2", reviewerId: REVIEWER_B, siteCode: "s2" } },
];

const CONFLICT_CASES: ReadonlyArray<{ body: Record<string, unknown>; name: string; propertyName: string }> = [
	{ body: { owner: OWNER_C, ownerId: OWNER_B }, name: "a relation and its key", propertyName: "owner" },
	{ body: { reviewer: REVIEWER_B, reviewerId: REVIEWER_A }, name: "a relation and its key that keeps the stored value", propertyName: "reviewer" },
	{ body: { category: CATEGORY_B, categoryId: CATEGORY_A }, name: "a relation that is not eager and its key", propertyName: "category" },
	{ body: { site: { regionCode: "r2", siteCode: "s2" }, siteCode: "s1" }, name: "a composite relation and one of its keys", propertyName: "site" },
];

describe.each<{ database: TDatabase; databaseName: string }>([
	{ database: "sqlite", databaseName: "SQLite" },
	{ database: "postgres", databaseName: "PostgreSQL 17" },
	{ database: "mysql", databaseName: "MySQL 8.4" },
	{ database: "mariadb", databaseName: "MariaDB 11" },
])("Changing a relation through PUT and PATCH on $databaseName (E2E)", ({ database }: { database: TDatabase; databaseName: string }) => {
	let app: INestApplication | undefined;
	let fastify: { inject: (options: { headers?: Record<string, string>; method: string; payload?: object; url: string }) => Promise<{ json: () => Record<string, unknown>; statusCode: number }> };
	let manager: EntityManager;
	let itemService: RelKeyItemService;
	let vehicleService: RelKeyVehicleService;
	let mariaDbContainer: StartedTestContainer | undefined;
	let mysqlContainer: StartedMySqlContainer | undefined;
	let postgresContainer: StartedPostgreSqlContainer | undefined;
	let statements: ReadonlyArray<IApiPolicyStatement> = SCOPE_STATEMENTS;

	const connection = (entities: Array<new () => unknown>): TypeOrmModuleOptions => {
		if (mariaDbContainer) {
			return { database: "relkey", dropSchema: true, entities, host: mariaDbContainer.getHost(), password: MARIADB_PASSWORD, port: mariaDbContainer.getMappedPort(MYSQL_PORT), synchronize: true, type: "mysql", username: "root" };
		}

		if (mysqlContainer) {
			return { database: mysqlContainer.getDatabase(), dropSchema: true, entities, host: mysqlContainer.getHost(), password: mysqlContainer.getUserPassword(), port: mysqlContainer.getPort(), synchronize: true, type: "mysql", username: mysqlContainer.getUsername() };
		}

		if (postgresContainer) {
			return { dropSchema: true, entities, synchronize: true, type: "postgres", url: postgresContainer.getConnectionUri() };
		}

		return { database: ":memory:", dropSchema: true, entities, synchronize: true, type: "better-sqlite3" };
	};

	// Reads the join columns as the database holds them, including those no property of the entity declares.
	const readStored = async (id: string = ITEM): Promise<IStoredRow> => {
		const columns: Array<string> = ["categoryId", "label", "ownerId", "patronId", "profileId", "regionCode", "reviewerId", "siteCode", "sponsorId"];
		const quote = (name: string): string => manager.connection.driver.escape(name);
		const row: Record<string, unknown> = (await manager
			.createQueryBuilder()
			.select(columns.map((column: string): string => `${quote("row")}.${quote(column)} AS ${quote(column)}`))
			.from(RelKeyItemEntity, "row")
			.withDeleted()
			.where(`${quote("row")}.${quote("id")} = :id`, { id })
			.getRawOne()) as Record<string, unknown>;

		return row as IStoredRow;
	};

	const send = async (verb: TVerb, path: string, payload: object, id: string = ITEM): Promise<{ json: () => Record<string, unknown>; statusCode: number }> => await fastify.inject({ method: verb, payload, url: `/${path}/${id}` });

	const expectUnchanged = async (): Promise<void> => {
		expect(await readStored()).toEqual(SEEDED);
	};

	beforeAll(async () => {
		if (database === "postgres") {
			postgresContainer = await new PostgreSqlContainer("postgres:17-alpine").start();
		}

		if (database === "mysql") {
			mysqlContainer = await new MySqlContainer("mysql:8.4").start();
		}

		if (database === "mariadb") {
			mariaDbContainer = await startMariaDb();
		}

		const entities: Array<new () => unknown> = [RelKeyOwnerEntity, RelKeyCategoryEntity, RelKeyReviewerEntity, RelKeyProfileEntity, RelKeySiteEntity, RelKeyItemEntity, RelKeyAuditEntity, RelKeyVehicleEntity, RelKeyCarEntity, RelKeyBikeEntity];
		const moduleReference = await Test.createTestingModule({
			controllers: [RelKeyItemController, RelKeyIncludedItemController, RelKeyHydratedItemController, RelKeyTransformedItemController, RelKeyVehicleController, RelKeyScopedItemController],
			imports: [
				TypeOrmModule.forRoot(connection(entities)),
				TypeOrmModule.forFeature(entities),
				ApiAuthorizationModule.forRoot({
					iam: {
						attachmentSources: [{ getAttachments: async () => await Promise.resolve({ attachments: [{ policyId: POLICY_ID, principalId: "user-1", principalType: EApiAuthorizationPrincipalType.USER }], boundaries: [] }) }],
						documentSources: [{ getDocumentsByIds: async (ids: ReadonlyArray<string>): Promise<ReadonlyArray<IApiPolicyDocumentRecord>> => await Promise.resolve(ids.includes(POLICY_ID) ? [{ document: { Statement: statements as Array<IApiPolicyStatement>, Version: "2012-10-17" }, id: POLICY_ID, namespace: NAMESPACE, sourceType: EApiPolicySourceType.DATABASE, version: "1" }] : []) }],
					},
					principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) },
				} as never),
				ApiSubscriberModule,
			],
			providers: [RelKeyGuard, RelKeyItemService, RelKeyItemSubscriber, RelKeyOwnerService, RelKeyVehicleService],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		fastify = app.getHttpAdapter().getInstance();
		itemService = app.get(RelKeyItemService);
		vehicleService = app.get(RelKeyVehicleService);
		({ manager } = itemService.repository);
	}, 300_000);

	afterAll(async () => {
		await app?.close();
		await postgresContainer?.stop();
		await mysqlContainer?.stop();
		await mariaDbContainer?.stop();
	});

	beforeEach(async () => {
		subscriberState.after.length = 0;
		subscriberState.before.length = 0;
		subscriberState.extra = undefined;
		subscriberState.isAuditing = false;
		statements = SCOPE_STATEMENTS;

		for (const entity of [RelKeyAuditEntity, RelKeyCarEntity, RelKeyVehicleEntity, RelKeyItemEntity, RelKeyOwnerEntity, RelKeyCategoryEntity, RelKeyReviewerEntity, RelKeyProfileEntity, RelKeySiteEntity]) {
			await manager.createQueryBuilder().delete().from(entity).execute();
		}

		await manager.save(RelKeyOwnerEntity, [
			{ id: OWNER_A, name: "Acme" },
			{ id: OWNER_B, name: "Bravo" },
			{ id: OWNER_C, name: "Cargo" },
			{ id: OWNER_BLOCKED, name: "Blocked" },
		]);
		await manager.save(RelKeyCategoryEntity, [
			{ id: CATEGORY_A, name: "First" },
			{ id: CATEGORY_B, name: "Second" },
			{ id: CATEGORY_BLOCKED, name: "Blocked" },
		]);
		await manager.save(RelKeyReviewerEntity, [{ id: REVIEWER_A }, { id: REVIEWER_B }, { deletedAt: new Date("2026-01-01T00:00:00.000Z"), id: REVIEWER_GONE }]);
		await manager.save(RelKeyProfileEntity, [{ id: PROFILE_A }, { id: PROFILE_B }]);
		await manager.save(RelKeySiteEntity, [
			{ id: "1", regionCode: "r1", siteCode: "s1" },
			{ id: "2", regionCode: "r2", siteCode: "s2" },
			{ id: "3", regionCode: "r1", siteCode: "s3" },
			{ id: "4", regionCode: "blocked", siteCode: "s1" },
		]);
		const base: Partial<RelKeyItemEntity> = { categoryId: CATEGORY_A, label: "seeded", ownerId: OWNER_A, patron: { id: OWNER_A } as RelKeyOwnerEntity, profileId: PROFILE_A, regionCode: "r1", reviewerId: REVIEWER_A, siteCode: "s1", sponsor: { id: OWNER_A } as RelKeyOwnerEntity };
		await manager.save(RelKeyItemEntity, [
			{ ...base, id: ITEM },
			{ ...base, deletedAt: new Date("2026-01-01T00:00:00.000Z"), id: ITEM_DELETED, profileId: null },
			{ ...base, id: ITEM_BLOCKED, ownerId: OWNER_BLOCKED, profileId: null },
		]);
		await manager.save(RelKeyCarEntity, { dealerId: OWNER_A, id: VEHICLE, kind: ERelKeyVehicleKind.CAR, ownerId: OWNER_A });
	});

	describe("writing the new value", () => {
		it.each(WRITE_CASES)("PATCH stores $name and answers with it", async ({ body, stored }: IWriteCase) => {
			const response = await send("PATCH", ITEMS, body);

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
			expect(await readStored()).toEqual({ ...SEEDED, ...stored });
			expect((await fastify.inject({ method: "GET", url: `/${ITEMS}/${ITEM}` })).json()).toEqual(response.json());
			expect(subscriberState.after).toHaveLength(1);
		});

		it.each(WRITE_CASES)("PUT stores $name and answers with it", async ({ body, stored }: IWriteCase) => {
			const response = await send("PUT", ITEMS, buildFullBody(body));

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
			expect(await readStored()).toEqual({ ...SEEDED, ...stored });
			expect((await fastify.inject({ method: "GET", url: `/${ITEMS}/${ITEM}` })).json()).toEqual(response.json());
		});

		it.each([
			["the key", { ownerId: OWNER_B }],
			["the relation", { owner: OWNER_B }],
		])("answers with the moved eager relation for %s", async (_name: string, body: object) => {
			const response = await send("PATCH", ITEMS, body);

			expect(response.json()).toMatchObject({ owner: { id: OWNER_B }, ownerId: OWNER_B, reviewer: { id: REVIEWER_A }, reviewerId: REVIEWER_A });
		});

		it("answers with the relation a route includes", async () => {
			const response = await send("PATCH", "update-relation-key/included-items", { categoryId: CATEGORY_B, ownerId: OWNER_B });

			expect(response.json()).toMatchObject({ category: { id: CATEGORY_B }, owner: { id: OWNER_B } });
		});

		it("stores a relation that request hydration loaded", async () => {
			const response = await send("PATCH", "update-relation-key/hydrated-items", { owner: OWNER_B });

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
			expect(await readStored()).toEqual({ ...SEEDED, ownerId: OWNER_B });
		});

		it("stores the key a request transformer sets", async () => {
			const response = await send("PATCH", TRANSFORMED_ITEMS, { label: "Lowered" });

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
			expect(response.json()).toMatchObject({ label: "lowered", owner: { id: OWNER_C } });
			expect(await readStored()).toEqual({ ...SEEDED, label: "lowered", ownerId: OWNER_C });
		});

		it("stores the key of a table inheritance row", async () => {
			const response = await send("PATCH", VEHICLES, { ownerId: OWNER_B }, VEHICLE);

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
			expect(response.json()).toMatchObject({ owner: { id: OWNER_B }, ownerId: OWNER_B });
			expect(await manager.findOneOrFail(RelKeyCarEntity, { loadEagerRelations: false, where: { id: VEHICLE } })).toMatchObject({ dealerId: OWNER_A, ownerId: OWNER_B });
		});

		it("stores the key of an eager relation only a table inheritance child declares", async () => {
			const result: RelKeyVehicleEntity = await vehicleService.update({ id: VEHICLE }, { dealerId: OWNER_C } as never);

			expect(result).toMatchObject({ dealer: { id: OWNER_C }, dealerId: OWNER_C, owner: { id: OWNER_A } });
			expect(await manager.findOneOrFail(RelKeyCarEntity, { loadEagerRelations: false, where: { id: VEHICLE } })).toMatchObject({ dealerId: OWNER_C, ownerId: OWNER_A });
		});

		it("moves a relation whose loaded target is soft deleted", async () => {
			await manager.update(RelKeyItemEntity, { id: ITEM }, { reviewerId: REVIEWER_GONE });
			const response = await send("PATCH", ITEMS, { reviewerId: REVIEWER_B });

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
			expect(await readStored()).toEqual({ ...SEEDED, reviewerId: REVIEWER_B });
		});

		it("keeps the loaded relation of a key the body repeats", async () => {
			const response = await send("PATCH", ITEMS, { label: "Same", ownerId: OWNER_A });

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
			expect(await readStored()).toEqual({ ...SEEDED, label: "same" });
			expect(subscriberState.after[0]).toMatchObject({ owner: { id: OWNER_A, name: "Acme" }, ownerId: OWNER_A });
		});

		it("keeps the loaded relations when no key moves", async () => {
			const response = await send("PATCH", ITEMS, { label: "Other" });

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
			expect(await readStored()).toEqual({ ...SEEDED, label: "other" });
			expect(subscriberState.after[0]).toMatchObject({ owner: { id: OWNER_A, name: "Acme" }, ownerId: OWNER_A });
		});
	});

	describe("refusing a body it cannot store", () => {
		it.each(CONFLICT_CASES)("PATCH answers 400 for $name with different targets and writes nothing", async ({ body, propertyName }: { body: Record<string, unknown>; propertyName: string }) => {
			const response = await send("PATCH", ITEMS, body);

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.BAD_REQUEST);
			expect(response.json()).toMatchObject({ details: { propertyName, reason: expect.stringContaining("same value") as string } });
			await expectUnchanged();
			expect(subscriberState.before).toHaveLength(0);
		});

		it.each(CONFLICT_CASES)("PUT answers 400 for $name with different targets and writes nothing", async ({ body }: { body: Record<string, unknown> }) => {
			const response = await send("PUT", ITEMS, buildFullBody(body));

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.BAD_REQUEST);
			await expectUnchanged();
		});

		it.each([
			["the key", { ownerId: OWNER_MISSING }],
			["the relation", { owner: OWNER_MISSING }],
		])("answers 400 for %s of a row that does not exist and writes nothing", async (_name: string, body: object) => {
			const response = await send("PATCH", ITEMS, body);

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.BAD_REQUEST);
			expect(response.json()).toMatchObject({ details: { type: "FOREIGN_KEY_VIOLATION" } });
			await expectUnchanged();
		});

		it.each([
			["key", { ownerId: null }],
			["relation", { owner: null }],
		])("answers 400 for a null %s of a required relation and writes nothing", async (_name: string, body: object) => {
			const response = await send("PATCH", ITEMS, body);

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.BAD_REQUEST);
			await expectUnchanged();
		});
	});

	describe("the IAM decision", () => {
		it.each<[string, TVerb, Record<string, unknown>]>([
			["the key", "PATCH", { ownerId: OWNER_BLOCKED }],
			["the relation", "PATCH", { owner: OWNER_BLOCKED }],
			["both", "PATCH", { owner: OWNER_BLOCKED, ownerId: OWNER_BLOCKED }],
			["the key on PUT", "PUT", buildFullBody({ ownerId: OWNER_BLOCKED })],
			["the key of a relation that is not eager", "PATCH", { categoryId: CATEGORY_BLOCKED }],
			["a relation that is not eager", "PATCH", { category: CATEGORY_BLOCKED }],
			["a composite key", "PATCH", { regionCode: "blocked" }],
			["a composite relation", "PATCH", { site: { regionCode: "blocked", siteCode: "s1" } }],
		])("answers 403 and writes nothing when %s moves the row into a Deny", async (_name: string, verb: TVerb, body: Record<string, unknown>) => {
			subscriberState.isAuditing = true;
			const response = await send(verb, SCOPED_ITEMS, body);

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.FORBIDDEN);
			await expectUnchanged();
			expect(await manager.count(RelKeyAuditEntity)).toBe(0);
		});

		it.each<[string, TVerb, Record<string, unknown>, IStoredRow]>([
			["the key", "PATCH", { ownerId: OWNER_B }, { ownerId: OWNER_B }],
			["the relation", "PATCH", { owner: OWNER_B }, { ownerId: OWNER_B }],
			["the key on PUT", "PUT", buildFullBody({ ownerId: OWNER_B }), { ownerId: OWNER_B }],
			["a relation that is not eager", "PATCH", { category: CATEGORY_B }, { categoryId: CATEGORY_B }],
		])("answers 200 when %s moves the row inside the scope", async (_name: string, verb: TVerb, body: Record<string, unknown>, stored: IStoredRow) => {
			subscriberState.isAuditing = true;
			const response = await send(verb, SCOPED_ITEMS, body);

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
			expect(await readStored()).toEqual({ ...SEEDED, ...stored });
			expect(await manager.count(RelKeyAuditEntity)).toBe(1);
		});

		it("still answers 404 for a row the Deny already hides, and writes nothing", async () => {
			const response = await send("PATCH", SCOPED_ITEMS, { ownerId: OWNER_B }, ITEM_BLOCKED);

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.NOT_FOUND);
			expect((await readStored(ITEM_BLOCKED)).ownerId).toBe(OWNER_BLOCKED);
		});

		it("lets a row leave a Deny only through a statement that allows the old row", async () => {
			statements = [ALLOW_ALL];
			const response = await send("PATCH", SCOPED_ITEMS, { ownerId: OWNER_B }, ITEM_BLOCKED);

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
			expect((await readStored(ITEM_BLOCKED)).ownerId).toBe(OWNER_B);
		});
	});

	describe("the rest of the update", () => {
		it("gives function subscribers the old row before and the stored key after", async () => {
			await send("PATCH", ITEMS, { ownerId: OWNER_B });

			expect(subscriberState.before).toEqual([{ currentOwner: expect.objectContaining({ id: OWNER_A, name: "Acme" }) as object, currentOwnerId: OWNER_A }]);
			expect(subscriberState.after).toEqual([{ owner: { id: OWNER_B }, ownerId: OWNER_B }]);
		});

		it("stores the key an onBeforeUpdate subscriber sets", async () => {
			subscriberState.extra = { ownerId: OWNER_C };
			const response = await send("PATCH", ITEMS, { label: "Sub" });

			expect(response.json()).toMatchObject({ label: "sub", owner: { id: OWNER_C } });
			expect(await readStored()).toEqual({ ...SEEDED, label: "sub", ownerId: OWNER_C });
		});

		it("stores the relation an onBeforeUpdate subscriber sets", async () => {
			subscriberState.extra = { owner: { id: OWNER_C } };
			const response = await send("PATCH", ITEMS, { label: "Sub" });

			expect(response.json()).toMatchObject({ label: "sub", owner: { id: OWNER_C } });
			expect(await readStored()).toEqual({ ...SEEDED, label: "sub", ownerId: OWNER_C });
		});

		it("changes a key through a direct service call and returns it", async () => {
			const result: RelKeyItemEntity = await itemService.update({ id: ITEM }, { ownerId: OWNER_B } as never);

			expect(result).toMatchObject({ owner: { id: OWNER_B }, ownerId: OWNER_B });
			expect(await readStored()).toEqual({ ...SEEDED, ownerId: OWNER_B });
		});

		it("clears the loaded relation of a key a direct service call clears", async () => {
			const result: RelKeyItemEntity = await itemService.update({ id: ITEM }, { reviewerId: null } as never);

			expect(result).toMatchObject({ reviewer: null, reviewerId: null });
			expect(await readStored()).toEqual({ ...SEEDED, reviewerId: null });
		});

		it("rolls a moved key back with its ApiFunctionTransactionScope", async () => {
			await expect(
				ApiFunctionTransactionScope.runWithDataSource(manager.connection, { name: "relkey" }, async (): Promise<void> => {
					await itemService.update({ id: ITEM }, { ownerId: OWNER_B } as never);

					throw new Error("roll back");
				}),
			).rejects.toThrow("roll back");
			await expectUnchanged();
		});

		it("commits a moved key with its ApiFunctionTransactionScope", async () => {
			await ApiFunctionTransactionScope.runWithDataSource(manager.connection, { name: "relkey" }, async (): Promise<void> => {
				await itemService.update({ id: ITEM }, { ownerId: OWNER_B } as never);
			});
			expect(await readStored()).toEqual({ ...SEEDED, ownerId: OWNER_B });
		});

		it("still answers 404 for a soft deleted row and writes nothing", async () => {
			const response = await send("PATCH", ITEMS, { ownerId: OWNER_B }, ITEM_DELETED);

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.NOT_FOUND);
			expect((await readStored(ITEM_DELETED)).ownerId).toBe(OWNER_A);
		});

		it("leaves a soft deleted row alone when another row moves", async () => {
			await send("PATCH", ITEMS, { ownerId: OWNER_B });
			const row: null | RelKeyItemEntity = await manager.findOne(RelKeyItemEntity, { loadEagerRelations: false, where: { id: ITEM_DELETED }, withDeleted: true });

			expect(row?.deletedAt).toBeInstanceOf(Date);
			expect(row?.ownerId).toBe(OWNER_A);
		});

		it("stores a key of a soft deleted target, which the eager load leaves out", async () => {
			const response = await send("PATCH", ITEMS, { reviewerId: REVIEWER_GONE });

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
			expect(response.json()).toMatchObject({ reviewer: null, reviewerId: REVIEWER_GONE });
			expect(await readStored()).toEqual({ ...SEEDED, reviewerId: REVIEWER_GONE });
		});
	});
});
