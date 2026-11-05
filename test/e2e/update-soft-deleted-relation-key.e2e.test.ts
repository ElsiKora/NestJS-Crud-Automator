import "reflect-metadata";

import type { ExecutionContext, INestApplication } from "@nestjs/common";
import type { TypeOrmModuleOptions } from "@nestjs/typeorm";
import type { StartedMySqlContainer } from "@testcontainers/mysql";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { StartedTestContainer } from "testcontainers";
import type { EntityManager, Relation, Repository } from "typeorm";

import type { IApiPolicyDocumentRecord, IApiPolicyStatement, TApiFunctionUpdateProperties, TApiSubscriberFunctionAfterUpdateContext, TApiSubscriberFunctionBeforeUpdateContext } from "../../src/index";

import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { MySqlContainer } from "@testcontainers/mysql";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { GenericContainer, Wait } from "testcontainers";
import { ChildEntity, Column, DeleteDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryColumn, TableInheritance } from "typeorm";
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

const TARGET_A: string = "a0000000-0000-4000-8000-000000000001";
const TARGET_B: string = "a0000000-0000-4000-8000-000000000002";
const TARGET_GONE: string = "a0000000-0000-4000-8000-000000000003";
const PROFILE_GONE: string = "b0000000-0000-4000-8000-000000000003";
const PROFILE_B: string = "b0000000-0000-4000-8000-000000000002";
const GHOST: string = "c0000000-0000-4000-8000-000000000003";
const ITEM: string = "e0000000-0000-4000-8000-000000000001";
const ITEM_DELETED: string = "e0000000-0000-4000-8000-000000000002";
const ITEM_REQUIRED: string = "e0000000-0000-4000-8000-000000000003";
const PLACE: string = "e0000000-0000-4000-8000-000000000004";
const VEHICLE: string = "f0000000-0000-4000-8000-000000000001";
const NAMESPACE: string = "softkey:item";
const POLICY_ID: string = "softkey-policy";
const ITEMS: string = "update-soft-key/items";
const PLACES: string = "update-soft-key/places";
const SCOPED_ITEMS: string = "update-soft-key/scoped-items";
const VEHICLES: string = "update-soft-key/vehicles";
const GRAPH: string = "d0000000-0000-4000-8000-000000000001";

const describeId: PropertyDecorator = ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID });
const describeNullableId: PropertyDecorator = ApiPropertyDescribe({ description: "nullable id", isNullable: true, type: EApiPropertyDescribeType.UUID } as never);
const describeRelation: PropertyDecorator = ApiPropertyDescribe({ description: "relation", type: EApiPropertyDescribeType.RELATION });
const describeText: PropertyDecorator = ApiPropertyDescribe({ description: "text", exampleValue: "value", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING });
const describeNullableText: PropertyDecorator = ApiPropertyDescribe({ description: "nullable text", exampleValue: "value", format: EApiPropertyStringType.STRING, isNullable: true, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING } as never);

enum ESoftKeyVehicleKind {
	BIKE = "BIKE",
	CAR = "CAR",
}

@Entity("softkey_targets")
class SoftKeyTargetEntity {
	@describeId
	@PrimaryColumn({ length: 36, type: "varchar" })
	public id!: string;

	@Column({ length: 64, type: "varchar" })
	@describeText
	public name!: string;

	@DeleteDateColumn({ nullable: true })
	public deletedAt?: Date | null;
}

@Entity("softkey_profiles")
class SoftKeyProfileEntity {
	@describeId
	@PrimaryColumn({ length: 36, type: "varchar" })
	public id!: string;

	@DeleteDateColumn({ nullable: true })
	public deletedAt?: Date | null;
}

// A target without a soft delete, so the rows of the relation with no foreign key constraint can simply go missing.
@Entity("softkey_ghosts")
class SoftKeyGhostEntity {
	@describeId
	@PrimaryColumn({ length: 36, type: "varchar" })
	public id!: string;
}

@Entity("softkey_sites")
class SoftKeySiteEntity {
	@describeId
	@Column({ length: 36, type: "varchar", unique: true })
	public id!: string;

	@PrimaryColumn({ length: 36, type: "varchar" })
	@describeText
	public regionCode!: string;

	@PrimaryColumn({ length: 36, type: "varchar" })
	@describeText
	public siteCode!: string;

	@DeleteDateColumn({ nullable: true })
	public deletedAt?: Date | null;
}

@Entity("softkey_items")
class SoftKeyItemEntity {
	@describeId
	@PrimaryColumn({ length: 36, type: "varchar" })
	public id!: string;

	@Column({ length: 64, type: "varchar" })
	@describeText
	public label!: string;

	// Eager, nullable, with the key a property of the entity.
	@Column({ length: 36, nullable: true, type: "varchar" })
	@describeNullableId
	public reviewerId?: null | string;

	@describeRelation
	@JoinColumn({ name: "reviewerId" })
	@ManyToOne(() => SoftKeyTargetEntity, { eager: true, nullable: true })
	public reviewer?: null | Relation<SoftKeyTargetEntity>;

	// Eager and required.
	@Column({ length: 36, type: "varchar" })
	@describeId
	public ownerId!: string;

	@describeRelation
	@JoinColumn({ name: "ownerId" })
	@ManyToOne(() => SoftKeyTargetEntity, { eager: true, nullable: false })
	public owner!: Relation<SoftKeyTargetEntity>;

	// Eager, and no property of the entity holds its key.
	@describeRelation
	@ManyToOne(() => SoftKeyTargetEntity, { eager: true, nullable: true })
	public sponsor?: null | Relation<SoftKeyTargetEntity>;

	// Eager, and the read does not select its key.
	@Column({ length: 36, nullable: true, select: false, type: "varchar" })
	public hiddenId?: null | string;

	@JoinColumn({ name: "hiddenId" })
	@ManyToOne(() => SoftKeyTargetEntity, { eager: true, nullable: true })
	public hidden?: null | Relation<SoftKeyTargetEntity>;

	// Eager owning one-to-one.
	@Column({ length: 36, nullable: true, type: "varchar" })
	@describeNullableId
	public profileId?: null | string;

	@describeRelation
	@JoinColumn({ name: "profileId" })
	@OneToOne(() => SoftKeyProfileEntity, { eager: true, nullable: true })
	public profile?: null | Relation<SoftKeyProfileEntity>;

	// Eager, required, over several columns.
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
	@ManyToOne(() => SoftKeySiteEntity, { eager: true, nullable: false })
	public site!: Relation<SoftKeySiteEntity>;

	// Eager, nullable, over several columns.
	@Column({ length: 36, nullable: true, type: "varchar" })
	@describeNullableText
	public zoneRegion?: null | string;

	@Column({ length: 36, nullable: true, type: "varchar" })
	@describeNullableText
	public zoneCode?: null | string;

	@describeRelation
	@JoinColumn([
		{ name: "zoneRegion", referencedColumnName: "regionCode" },
		{ name: "zoneCode", referencedColumnName: "siteCode" },
	])
	@ManyToOne(() => SoftKeySiteEntity, { eager: true, nullable: true })
	public zone?: null | Relation<SoftKeySiteEntity>;

	// Eager over a key no constraint holds to a row, so the related row can be missing without a soft delete.
	@Column({ length: 36, nullable: true, type: "varchar" })
	@describeNullableId
	public ghostId?: null | string;

	@describeRelation
	@JoinColumn({ name: "ghostId" })
	@ManyToOne(() => SoftKeyGhostEntity, { createForeignKeyConstraints: false, eager: true, nullable: true })
	public ghost?: null | Relation<SoftKeyGhostEntity>;

	@DeleteDateColumn({ nullable: true })
	public deletedAt?: Date | null;
}

// The relation is part of the primary key of the row.
@Entity("softkey_memberships")
class SoftKeyMembershipEntity {
	@describeId
	@PrimaryColumn({ length: 36, type: "varchar" })
	public id!: string;

	@PrimaryColumn({ length: 36, type: "varchar" })
	@describeId
	public targetId!: string;

	@describeRelation
	@JoinColumn({ name: "targetId" })
	@ManyToOne(() => SoftKeyTargetEntity, { eager: true, nullable: false })
	public target!: Relation<SoftKeyTargetEntity>;

	@Column({ length: 64, type: "varchar" })
	@describeText
	public label!: string;
}

class SoftKeyPlaceLink {
	@Column({ length: 36, name: "linkTargetId", nullable: true, type: "varchar" })
	@describeNullableId
	public targetId?: null | string;

	@describeRelation
	@JoinColumn({ name: "linkTargetId" })
	@ManyToOne(() => SoftKeyTargetEntity, { eager: true, nullable: true })
	public target?: null | Relation<SoftKeyTargetEntity>;

	@Column({ length: 64, name: "linkNote", nullable: true, type: "varchar" })
	@describeNullableText
	public note?: null | string;
}

@Entity("softkey_places")
class SoftKeyPlaceEntity {
	@describeId
	@PrimaryColumn({ length: 36, type: "varchar" })
	public id!: string;

	@Column({ length: 64, type: "varchar" })
	@describeText
	public label!: string;

	// A relation inside an embedded column.
	@Column(() => SoftKeyPlaceLink, { prefix: false })
	public link?: SoftKeyPlaceLink;

	// A lazy relation.
	@Column({ length: 36, nullable: true, type: "varchar" })
	@describeNullableId
	public lazyTargetId?: null | string;

	@JoinColumn({ name: "lazyTargetId" })
	@ManyToOne(() => SoftKeyTargetEntity, { lazy: true, nullable: true })
	public lazyTarget?: Promise<null | SoftKeyTargetEntity>;
}

@Entity("softkey_vehicles")
@TableInheritance({ column: { length: 16, name: "kind", type: "varchar" } })
class SoftKeyVehicleEntity {
	@describeId
	@PrimaryColumn({ length: 36, type: "varchar" })
	public id!: string;

	@Column({ enum: ESoftKeyVehicleKind, type: "simple-enum" })
	@ApiPropertyDescribe({ description: "kind", enum: ESoftKeyVehicleKind, enumName: "ESoftKeyVehicleKind", type: EApiPropertyDescribeType.ENUM })
	public kind!: ESoftKeyVehicleKind;

	@Column({ length: 64, type: "varchar" })
	@describeText
	public label!: string;

	@Column({ length: 36, type: "varchar" })
	@describeId
	public ownerId!: string;

	@describeRelation
	@JoinColumn({ name: "ownerId" })
	@ManyToOne(() => SoftKeyTargetEntity, { eager: true, nullable: false })
	public owner!: Relation<SoftKeyTargetEntity>;
}

@ChildEntity(ESoftKeyVehicleKind.CAR)
class SoftKeyCarEntity extends SoftKeyVehicleEntity {
	@Column({ length: 36, nullable: true, type: "varchar" })
	@describeNullableId
	public dealerId?: null | string;

	@describeRelation
	@JoinColumn({ name: "dealerId" })
	@ManyToOne(() => SoftKeyTargetEntity, { eager: true, nullable: true })
	public dealer?: null | Relation<SoftKeyTargetEntity>;
}

@ChildEntity(ESoftKeyVehicleKind.BIKE)
class SoftKeyBikeEntity extends SoftKeyVehicleEntity {
	@Column({ nullable: true, type: "int" })
	public gears?: null | number;
}

// The same soft delete seen from the other relation kinds: a link table, the far side, and one level down a cascade.
@Entity("softkey_graph_tags")
class SoftKeyGraphTagEntity {
	@PrimaryColumn({ length: 36, type: "varchar" })
	public id!: string;

	@DeleteDateColumn({ nullable: true })
	public deletedAt?: Date | null;
}

@Entity("softkey_graph_groups")
class SoftKeyGraphGroupEntity {
	@PrimaryColumn({ length: 36, type: "varchar" })
	public id!: string;

	@Column({ length: 36, nullable: true, type: "varchar" })
	public targetId?: null | string;

	@JoinColumn({ name: "targetId" })
	@ManyToOne(() => SoftKeyTargetEntity, { eager: true, nullable: true })
	public target?: null | Relation<SoftKeyTargetEntity>;
}

@Entity("softkey_graph_parents")
class SoftKeyGraphParentEntity {
	@PrimaryColumn({ length: 36, type: "varchar" })
	public id!: string;

	@Column({ length: 64, type: "varchar" })
	public label!: string;

	@JoinTable({ name: "softkey_graph_parent_tags" })
	@ManyToMany(() => SoftKeyGraphTagEntity, { eager: true })
	public tags?: Array<SoftKeyGraphTagEntity>;

	@OneToMany(() => SoftKeyGraphChildEntity, (child: SoftKeyGraphChildEntity) => child.parent, { eager: true })
	public children?: Array<Relation<SoftKeyGraphChildEntity>>;

	@OneToOne(() => SoftKeyGraphSideEntity, (side: SoftKeyGraphSideEntity) => side.parent, { eager: true })
	public side?: null | Relation<SoftKeyGraphSideEntity>;

	@Column({ length: 36, nullable: true, type: "varchar" })
	public groupId?: null | string;

	// Cascaded, and the group holds an eager relation of its own that can read as null.
	@JoinColumn({ name: "groupId" })
	@ManyToOne(() => SoftKeyGraphGroupEntity, { cascade: true, eager: true, nullable: true })
	public group?: null | Relation<SoftKeyGraphGroupEntity>;
}

@Entity("softkey_graph_children")
class SoftKeyGraphChildEntity {
	@PrimaryColumn({ length: 36, type: "varchar" })
	public id!: string;

	@Column({ length: 36, nullable: true, type: "varchar" })
	public parentId?: null | string;

	@JoinColumn({ name: "parentId" })
	@ManyToOne(() => SoftKeyGraphParentEntity, (parent: SoftKeyGraphParentEntity) => parent.children, { nullable: true })
	public parent?: null | Relation<SoftKeyGraphParentEntity>;

	@DeleteDateColumn({ nullable: true })
	public deletedAt?: Date | null;
}

@Entity("softkey_graph_sides")
class SoftKeyGraphSideEntity {
	@PrimaryColumn({ length: 36, type: "varchar" })
	public id!: string;

	@Column({ length: 36, nullable: true, type: "varchar" })
	public parentId?: null | string;

	@JoinColumn({ name: "parentId" })
	@OneToOne(() => SoftKeyGraphParentEntity, (parent: SoftKeyGraphParentEntity) => parent.side, { nullable: true })
	public parent?: null | Relation<SoftKeyGraphParentEntity>;

	@DeleteDateColumn({ nullable: true })
	public deletedAt?: Date | null;
}

@Injectable()
@ApiServiceObservable()
@ApiService({ entity: SoftKeyItemEntity })
class SoftKeyItemService extends ApiServiceBase<SoftKeyItemEntity> {
	@InjectRepository(SoftKeyItemEntity)
	public readonly repository!: Repository<SoftKeyItemEntity>;
}

@Injectable()
@ApiService({ entity: SoftKeyVehicleEntity })
class SoftKeyVehicleService extends ApiServiceBase<SoftKeyVehicleEntity> {
	@InjectRepository(SoftKeyVehicleEntity)
	public readonly repository!: Repository<SoftKeyVehicleEntity>;
}

@Injectable()
@ApiService({ entity: SoftKeyMembershipEntity })
class SoftKeyMembershipService extends ApiServiceBase<SoftKeyMembershipEntity> {
	@InjectRepository(SoftKeyMembershipEntity)
	public readonly repository!: Repository<SoftKeyMembershipEntity>;
}

@Injectable()
@ApiServiceObservable()
@ApiService({ entity: SoftKeyPlaceEntity })
class SoftKeyPlaceService extends ApiServiceBase<SoftKeyPlaceEntity> {
	@InjectRepository(SoftKeyPlaceEntity)
	public readonly repository!: Repository<SoftKeyPlaceEntity>;
}

@Injectable()
@ApiService({ entity: SoftKeyGraphParentEntity })
class SoftKeyGraphParentService extends ApiServiceBase<SoftKeyGraphParentEntity> {
	@InjectRepository(SoftKeyGraphParentEntity)
	public readonly repository!: Repository<SoftKeyGraphParentEntity>;
}

const subscriberState: { after: Array<{ reviewer: unknown; reviewerId: unknown }> } = { after: [] };

/**
 * Records what a function subscriber of an update receives.
 */
@ApiFunctionSubscriber({ entity: SoftKeyItemEntity })
class SoftKeyItemSubscriber extends ApiFunctionSubscriberBase<SoftKeyItemEntity> {
	public onAfterUpdate(context: TApiSubscriberFunctionAfterUpdateContext<SoftKeyItemEntity>): Promise<SoftKeyItemEntity> {
		subscriberState.after.push({ reviewer: context.result?.reviewer, reviewerId: context.result?.reviewerId });

		return Promise.resolve(context.result as SoftKeyItemEntity);
	}
}

const placeSubscriberState: { current: Array<Readonly<SoftKeyPlaceEntity>> } = { current: [] };

/**
 * Keeps the row a function subscriber receives before an update, to read it after the save.
 */
@ApiFunctionSubscriber({ entity: SoftKeyPlaceEntity })
class SoftKeyPlaceSubscriber extends ApiFunctionSubscriberBase<SoftKeyPlaceEntity> {
	public onBeforeUpdate(context: TApiSubscriberFunctionBeforeUpdateContext<SoftKeyPlaceEntity>): Promise<TApiFunctionUpdateProperties<SoftKeyPlaceEntity>> {
		placeSubscriberState.current.push(context.DATA.currentEntity as Readonly<SoftKeyPlaceEntity>);

		return Promise.resolve(context.result as TApiFunctionUpdateProperties<SoftKeyPlaceEntity>);
	}
}

const USER: Record<string, unknown> = { id: "user-1" };

/**
 * Authenticates every request as the one test user.
 */
@Injectable()
class SoftKeyGuard {
	public canActivate(context: ExecutionContext): boolean {
		context.switchToHttp().getRequest<{ user?: unknown }>().user = USER;

		return true;
	}
}

const DISABLED = { generation: { isEnabled: false } } as const;
const SECURED = { security: { authentication: { guard: SoftKeyGuard, type: EApiAuthenticationType.USER } } } as never;

@ApiController<SoftKeyItemEntity>({
	entity: SoftKeyItemEntity,
	name: "SoftKeyItems",
	path: ITEMS,
	routes: { [EApiRouteType.CREATE]: DISABLED, [EApiRouteType.DELETE]: DISABLED, [EApiRouteType.GET_LIST]: DISABLED },
} as never)
class SoftKeyItemController {
	public constructor(@Inject(SoftKeyItemService) public readonly service: SoftKeyItemService) {}
}

@ApiController<SoftKeyVehicleEntity>({
	entity: SoftKeyVehicleEntity,
	name: "SoftKeyVehicles",
	path: VEHICLES,
	routes: { [EApiRouteType.CREATE]: DISABLED, [EApiRouteType.DELETE]: DISABLED, [EApiRouteType.GET_LIST]: DISABLED },
} as never)
class SoftKeyVehicleController {
	public constructor(@Inject(SoftKeyVehicleService) public readonly service: SoftKeyVehicleService) {}
}

@ApiController<SoftKeyPlaceEntity>({
	entity: SoftKeyPlaceEntity,
	name: "SoftKeyPlaces",
	path: PLACES,
	routes: { [EApiRouteType.CREATE]: DISABLED, [EApiRouteType.DELETE]: DISABLED, [EApiRouteType.GET_LIST]: DISABLED },
} as never)
class SoftKeyPlaceController {
	public constructor(@Inject(SoftKeyPlaceService) public readonly service: SoftKeyPlaceService) {}
}

const scopedField = (name: string, queryPath: string = name): object => ({ isFilterable: true, path: `resource.${name}`, queryPath });

@ApiControllerSecurable()
@ApiController<SoftKeyItemEntity>({
	authorization: {
		defaultMode: EApiAuthorizationMode.IAM,
		policyNamespace: NAMESPACE,
		resourceDefinition: { entity: SoftKeyItemEntity, fields: [scopedField("id"), scopedField("label")], namespace: NAMESPACE, resourcePath: "softkey:item/{id}", resourceType: NAMESPACE },
	},
	entity: SoftKeyItemEntity,
	name: "SoftKeyScopedItems",
	path: SCOPED_ITEMS,
	routes: { [EApiRouteType.CREATE]: DISABLED, [EApiRouteType.DELETE]: DISABLED, [EApiRouteType.GET]: SECURED, [EApiRouteType.GET_LIST]: DISABLED, [EApiRouteType.PARTIAL_UPDATE]: SECURED, [EApiRouteType.UPDATE]: SECURED },
} as never)
class SoftKeyScopedItemController {
	public constructor(@Inject(SoftKeyItemService) public readonly service: SoftKeyItemService) {}
}

const SCOPE_STATEMENTS: ReadonlyArray<IApiPolicyStatement> = [
	{ Action: [`${NAMESPACE}:*`], Effect: EApiPolicyEffect.ALLOW, Resource: ["softkey:item/*"] },
	{ Action: [`${NAMESPACE}:read`, `${NAMESPACE}:update`], Condition: { StringEquals: { "resource.label": "denied" } }, Effect: EApiPolicyEffect.DENY, Resource: ["softkey:item/*"] },
];

const startMariaDb = async (): Promise<StartedTestContainer> =>
	await new GenericContainer("mariadb:11")
		.withEnvironment({ MARIADB_DATABASE: "softkey", MARIADB_ROOT_PASSWORD: MARIADB_PASSWORD })
		.withExposedPorts(MYSQL_PORT)
		// The image first runs a temporary server on port 0 to initialize the database.
		.withWaitStrategy(Wait.forLogMessage(/port: 3306\s/u))
		.withStartupTimeout(240_000)
		.start();

interface IStoredRow {
	ghostId?: null | string;
	hiddenId?: null | string;
	label?: string;
	ownerId?: string;
	profileId?: null | string;
	regionCode?: string;
	reviewerId?: null | string;
	siteCode?: string;
	sponsorId?: null | string;
	zoneCode?: null | string;
	zoneRegion?: null | string;
}

// Every nullable relation of the row points at a target that reads as missing: soft deleted, or gone without a constraint.
const STORED: IStoredRow = { ghostId: GHOST, hiddenId: TARGET_GONE, label: "seeded", ownerId: TARGET_A, profileId: PROFILE_GONE, regionCode: "r1", reviewerId: TARGET_GONE, siteCode: "s1", sponsorId: TARGET_GONE, zoneCode: "gone", zoneRegion: "gone" };

// The required relations of this one point at soft deleted targets as well.
const STORED_REQUIRED: IStoredRow = { ...STORED, ownerId: TARGET_GONE, profileId: null, regionCode: "gone", siteCode: "gone" };

// The keys a PUT has to name, which equal the stored ones, and nothing else.
const PUT_REQUIRED: Record<string, unknown> = { label: "put", ownerId: TARGET_A, regionCode: "r1", siteCode: "s1" };
const PUT_REQUIRED_GONE: Record<string, unknown> = { label: "put", ownerId: TARGET_GONE, regionCode: "gone", siteCode: "gone" };

interface INamedCase {
	body: Record<string, unknown>;
	name: string;
	stored: IStoredRow;
}

const NAMED_CASES: ReadonlyArray<INamedCase> = [
	{ body: { reviewerId: TARGET_B }, name: "the key away from a soft deleted target", stored: { reviewerId: TARGET_B } },
	{ body: { reviewer: TARGET_B }, name: "the relation away from a soft deleted target", stored: { reviewerId: TARGET_B } },
	{ body: { reviewerId: null }, name: "a null key of a nullable relation", stored: { reviewerId: null } },
	{ body: { reviewer: null }, name: "a null nullable relation", stored: { reviewerId: null } },
	{ body: { reviewerId: TARGET_GONE }, name: "the key that is already stored", stored: {} },
	{ body: { reviewer: TARGET_GONE }, name: "the relation that is already stored", stored: {} },
	{ body: { sponsor: TARGET_B }, name: "a relation without a key property away from a soft deleted target", stored: { sponsorId: TARGET_B } },
	{ body: { sponsor: null }, name: "a null relation without a key property", stored: { sponsorId: null } },
	{ body: { profileId: PROFILE_B }, name: "the key of a one-to-one relation away from a soft deleted target", stored: { profileId: PROFILE_B } },
	{ body: { profile: null }, name: "a null one-to-one relation", stored: { profileId: null } },
	{ body: { zoneCode: "s1", zoneRegion: "r1" }, name: "both keys of a nullable composite relation", stored: { zoneCode: "s1", zoneRegion: "r1" } },
	{ body: { zoneCode: null, zoneRegion: null }, name: "null keys of a nullable composite relation", stored: { zoneCode: null, zoneRegion: null } },
	{ body: { zone: null }, name: "a null nullable composite relation", stored: { zoneCode: null, zoneRegion: null } },
	{ body: { ghostId: null }, name: "a null key of a relation whose row is gone", stored: { ghostId: null } },
];

const REQUIRED_NAMED_CASES: ReadonlyArray<INamedCase> = [
	{ body: { ownerId: TARGET_B }, name: "the key of a required relation away from a soft deleted target", stored: { ownerId: TARGET_B } },
	{ body: { owner: TARGET_B }, name: "a required relation away from a soft deleted target", stored: { ownerId: TARGET_B } },
	{ body: { ownerId: TARGET_GONE }, name: "the key of a required relation that is already stored", stored: {} },
	{ body: { regionCode: "r1", siteCode: "s1" }, name: "both keys of a required composite relation", stored: { regionCode: "r1", siteCode: "s1" } },
	{ body: { site: { regionCode: "r1", siteCode: "s1" } }, name: "a required composite relation", stored: { regionCode: "r1", siteCode: "s1" } },
];

describe.each<{ database: TDatabase; databaseName: string }>([
	{ database: "sqlite", databaseName: "SQLite" },
	{ database: "postgres", databaseName: "PostgreSQL 17" },
	{ database: "mysql", databaseName: "MySQL 8.4" },
	{ database: "mariadb", databaseName: "MariaDB 11" },
])("Updating a row whose eager relation target reads as missing on $databaseName (E2E)", ({ database }: { database: TDatabase; databaseName: string }) => {
	let app: INestApplication | undefined;
	let fastify: { inject: (options: { method: string; payload?: object; url: string }) => Promise<{ body: string; json: () => Record<string, unknown>; statusCode: number }> };
	let manager: EntityManager;
	let itemService: SoftKeyItemService;
	let vehicleService: SoftKeyVehicleService;
	let membershipService: SoftKeyMembershipService;
	let placeService: SoftKeyPlaceService;
	let graphService: SoftKeyGraphParentService;
	let mariaDbContainer: StartedTestContainer | undefined;
	let mysqlContainer: StartedMySqlContainer | undefined;
	let postgresContainer: StartedPostgreSqlContainer | undefined;

	const connection = (entities: Array<new () => unknown>): TypeOrmModuleOptions => {
		if (mariaDbContainer) {
			return { database: "softkey", dropSchema: true, entities, host: mariaDbContainer.getHost(), password: MARIADB_PASSWORD, port: mariaDbContainer.getMappedPort(MYSQL_PORT), synchronize: true, type: "mysql", username: "root" };
		}

		if (mysqlContainer) {
			return { database: mysqlContainer.getDatabase(), dropSchema: true, entities, host: mysqlContainer.getHost(), password: mysqlContainer.getUserPassword(), port: mysqlContainer.getPort(), synchronize: true, type: "mysql", username: mysqlContainer.getUsername() };
		}

		if (postgresContainer) {
			return { dropSchema: true, entities, synchronize: true, type: "postgres", url: postgresContainer.getConnectionUri() };
		}

		return { database: ":memory:", dropSchema: true, entities, synchronize: true, type: "better-sqlite3" };
	};

	const quote = (name: string): string => manager.connection.driver.escape(name);

	// Reads columns as the database holds them, also those the entity hides or does not declare.
	const readColumns = async (table: string, columns: ReadonlyArray<string>, id: string): Promise<Record<string, unknown>> => {
		const [row]: Array<Record<string, unknown>> = (await manager.query(`SELECT ${columns.map((column: string): string => quote(column)).join(", ")} FROM ${quote(table)} WHERE ${quote("id")} = '${id}'`)) as Array<Record<string, unknown>>;

		return row as Record<string, unknown>;
	};

	const readPlace = async (): Promise<Record<string, unknown>> => await readColumns("softkey_places", ["label", "lazyTargetId", "linkNote", "linkTargetId"], PLACE);

	const readStored = async (id: string = ITEM): Promise<IStoredRow> => await readColumns("softkey_items", ["ghostId", "hiddenId", "label", "ownerId", "profileId", "regionCode", "reviewerId", "siteCode", "sponsorId", "zoneCode", "zoneRegion"], id);

	const send = async (verb: TVerb, path: string, payload: object, id: string = ITEM): Promise<{ body: string; json: () => Record<string, unknown>; statusCode: number }> => await fastify.inject({ method: verb, payload, url: `/${path}/${id}` });

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

		const entities: Array<new () => unknown> = [SoftKeyTargetEntity, SoftKeyProfileEntity, SoftKeyGhostEntity, SoftKeySiteEntity, SoftKeyItemEntity, SoftKeyMembershipEntity, SoftKeyPlaceEntity, SoftKeyVehicleEntity, SoftKeyCarEntity, SoftKeyBikeEntity, SoftKeyGraphTagEntity, SoftKeyGraphGroupEntity, SoftKeyGraphParentEntity, SoftKeyGraphChildEntity, SoftKeyGraphSideEntity];
		const moduleReference = await Test.createTestingModule({
			controllers: [SoftKeyItemController, SoftKeyPlaceController, SoftKeyVehicleController, SoftKeyScopedItemController],
			imports: [
				TypeOrmModule.forRoot(connection(entities)),
				TypeOrmModule.forFeature(entities),
				ApiAuthorizationModule.forRoot({
					iam: {
						attachmentSources: [{ getAttachments: async () => await Promise.resolve({ attachments: [{ policyId: POLICY_ID, principalId: "user-1", principalType: EApiAuthorizationPrincipalType.USER }], boundaries: [] }) }],
						documentSources: [{ getDocumentsByIds: async (ids: ReadonlyArray<string>): Promise<ReadonlyArray<IApiPolicyDocumentRecord>> => await Promise.resolve(ids.includes(POLICY_ID) ? [{ document: { Statement: SCOPE_STATEMENTS as Array<IApiPolicyStatement>, Version: "2012-10-17" }, id: POLICY_ID, namespace: NAMESPACE, sourceType: EApiPolicySourceType.DATABASE, version: "1" }] : []) }],
					},
					principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) },
				} as never),
				ApiSubscriberModule,
			],
			providers: [SoftKeyGuard, SoftKeyItemService, SoftKeyItemSubscriber, SoftKeyMembershipService, SoftKeyPlaceService, SoftKeyPlaceSubscriber, SoftKeyGraphParentService, SoftKeyVehicleService],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		fastify = app.getHttpAdapter().getInstance();
		itemService = app.get(SoftKeyItemService);
		vehicleService = app.get(SoftKeyVehicleService);
		membershipService = app.get(SoftKeyMembershipService);
		placeService = app.get(SoftKeyPlaceService);
		graphService = app.get(SoftKeyGraphParentService);
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
		placeSubscriberState.current.length = 0;

		for (const table of ["softkey_graph_parent_tags", "softkey_graph_children", "softkey_graph_sides", "softkey_graph_parents", "softkey_graph_groups", "softkey_graph_tags", "softkey_memberships", "softkey_places", "softkey_vehicles", "softkey_items", "softkey_targets", "softkey_profiles", "softkey_ghosts", "softkey_sites"]) {
			await manager.query(`DELETE FROM ${quote(table)}`);
		}

		await manager.save(SoftKeyTargetEntity, [
			{ id: TARGET_A, name: "Live" },
			{ id: TARGET_B, name: "Other" },
			{ id: TARGET_GONE, name: "Gone" },
		]);
		await manager.save(SoftKeyProfileEntity, [{ id: PROFILE_B }, { id: PROFILE_GONE }]);
		await manager.save(SoftKeySiteEntity, [
			{ id: "1", regionCode: "r1", siteCode: "s1" },
			{ id: "2", regionCode: "gone", siteCode: "gone" },
		]);
		const row: Partial<SoftKeyItemEntity> = { ghostId: GHOST, hiddenId: TARGET_GONE, label: "seeded", ownerId: TARGET_A, regionCode: "r1", reviewerId: TARGET_GONE, siteCode: "s1", sponsor: { id: TARGET_GONE } as SoftKeyTargetEntity, zoneCode: "gone", zoneRegion: "gone" };
		await manager.save(SoftKeyItemEntity, [
			{ ...row, id: ITEM, profileId: PROFILE_GONE },
			{ ...row, deletedAt: new Date("2026-01-01T00:00:00.000Z"), id: ITEM_DELETED },
			{ ...row, id: ITEM_REQUIRED, ownerId: TARGET_GONE, regionCode: "gone", siteCode: "gone" },
		]);
		await manager.save(SoftKeyMembershipEntity, { id: ITEM, label: "seeded", targetId: TARGET_GONE });
		await manager.save(SoftKeyPlaceEntity, { id: PLACE, label: "seeded", lazyTargetId: TARGET_GONE, link: { note: "note", targetId: TARGET_GONE } });
		await manager.save(SoftKeyCarEntity, { dealerId: TARGET_GONE, id: VEHICLE, kind: ESoftKeyVehicleKind.CAR, label: "seeded", ownerId: TARGET_GONE });
		await manager.softDelete(SoftKeyTargetEntity, { id: TARGET_GONE });
		await manager.softDelete(SoftKeyProfileEntity, { id: PROFILE_GONE });
		await manager.softDelete(SoftKeySiteEntity, { id: "2" });
	});

	describe("an update that names neither the relation nor its key", () => {
		it("PATCH keeps every stored key", async () => {
			const response = await send("PATCH", ITEMS, { label: "changed" });

			expect(response.statusCode, response.body).toBe(HttpStatus.OK);
			expect(await readStored()).toEqual({ ...STORED, label: "changed" });
		});

		it("PATCH without a change keeps every stored key", async () => {
			const response = await send("PATCH", ITEMS, {});

			expect(response.statusCode, response.body).toBe(HttpStatus.OK);
			expect(await readStored()).toEqual(STORED);
		});

		it("PUT keeps every stored key it leaves out", async () => {
			const response = await send("PUT", ITEMS, PUT_REQUIRED);

			expect(response.statusCode, response.body).toBe(HttpStatus.OK);
			expect(await readStored()).toEqual({ ...STORED, label: "put" });
		});

		it("PATCH keeps the keys of a required relation and a required composite relation", async () => {
			const response = await send("PATCH", ITEMS, { label: "changed" }, ITEM_REQUIRED);

			expect(response.statusCode, response.body).toBe(HttpStatus.OK);
			expect(await readStored(ITEM_REQUIRED)).toEqual({ ...STORED_REQUIRED, label: "changed" });
		});

		it("PUT keeps the keys of a required relation and a required composite relation", async () => {
			const response = await send("PUT", ITEMS, PUT_REQUIRED_GONE, ITEM_REQUIRED);

			expect(response.statusCode, response.body).toBe(HttpStatus.OK);
			expect(await readStored(ITEM_REQUIRED)).toEqual({ ...STORED_REQUIRED, label: "put" });
		});

		it("answers with the relation null and the stored key, as GET does", async () => {
			const response = await send("PATCH", ITEMS, { label: "changed" });

			expect(response.json()).toMatchObject({ owner: { id: TARGET_A }, ownerId: TARGET_A, profile: null, profileId: PROFILE_GONE, reviewer: null, reviewerId: TARGET_GONE, site: { id: "1" }, sponsor: null, zone: null });
			expect((await fastify.inject({ method: "GET", url: `/${ITEMS}/${ITEM}` })).json()).toEqual(response.json());
		});

		it("shows the relation as it did before the write", async () => {
			const before: Record<string, unknown> = (await fastify.inject({ method: "GET", url: `/${ITEMS}/${ITEM}` })).json();
			const response = await send("PATCH", ITEMS, { label: "changed" });
			const pickRelations = (body: Record<string, unknown>): Record<string, unknown> => Object.fromEntries(["ghost", "owner", "profile", "reviewer", "site", "sponsor", "zone"].map((key: string): [string, unknown] => [key, body[key]]));

			expect(pickRelations(response.json())).toEqual(pickRelations(before));
			expect(pickRelations(before)).toEqual({ ghost: null, owner: { id: TARGET_A }, profile: null, reviewer: null, site: { id: "1" }, sponsor: null, zone: null });
		});

		it("answers with a required relation null and its stored key, as GET does", async () => {
			const response = await send("PATCH", ITEMS, { label: "changed" }, ITEM_REQUIRED);

			expect(response.json()).toMatchObject({ owner: null, ownerId: TARGET_GONE, regionCode: "gone", site: null, siteCode: "gone" });
			expect((await fastify.inject({ method: "GET", url: `/${ITEMS}/${ITEM_REQUIRED}` })).json()).toEqual(response.json());
		});

		it("keeps the keys under an IAM scope", async () => {
			const response = await send("PATCH", SCOPED_ITEMS, { label: "changed" });

			expect(response.statusCode, response.body).toBe(HttpStatus.OK);
			expect(await readStored()).toEqual({ ...STORED, label: "changed" });
		});

		it("keeps the keys and rolls the label back when a scope refuses the row", async () => {
			const response = await send("PATCH", SCOPED_ITEMS, { label: "denied" });

			expect(response.statusCode, response.body).toBe(HttpStatus.FORBIDDEN);
			expect(await readStored()).toEqual(STORED);
		});

		it("keeps the keys of a table inheritance row, on the root and on the child", async () => {
			const response = await send("PATCH", VEHICLES, { label: "changed" }, VEHICLE);

			expect(response.statusCode, response.body).toBe(HttpStatus.OK);
			expect(await readColumns("softkey_vehicles", ["dealerId", "label", "ownerId"], VEHICLE)).toEqual({ dealerId: TARGET_GONE, label: "changed", ownerId: TARGET_GONE });

			await vehicleService.update({ id: VEHICLE }, { label: "service" });
			expect(await readColumns("softkey_vehicles", ["dealerId", "label", "ownerId"], VEHICLE)).toEqual({ dealerId: TARGET_GONE, label: "service", ownerId: TARGET_GONE });
		});

		it("keeps a stored NULL as NULL", async () => {
			await manager.query(`UPDATE ${quote("softkey_items")} SET ${["ghostId", "hiddenId", "profileId", "reviewerId", "sponsorId", "zoneCode", "zoneRegion"].map((column: string): string => `${quote(column)} = NULL`).join(", ")} WHERE ${quote("id")} = '${ITEM}'`);
			const response = await send("PATCH", ITEMS, { label: "changed" });

			expect(response.statusCode, response.body).toBe(HttpStatus.OK);
			expect(await readStored()).toEqual({ ...STORED, ghostId: null, hiddenId: null, label: "changed", profileId: null, reviewerId: null, sponsorId: null, zoneCode: null, zoneRegion: null });
		});

		it("keeps the key of a live relation next to one that reads as missing", async () => {
			await manager.query(`UPDATE ${quote("softkey_items")} SET ${quote("reviewerId")} = '${TARGET_A}' WHERE ${quote("id")} = '${ITEM}'`);
			const response = await send("PATCH", ITEMS, { label: "changed" });

			expect(response.json()).toMatchObject({ reviewer: { id: TARGET_A }, sponsor: null });
			expect(await readStored()).toEqual({ ...STORED, label: "changed", reviewerId: TARGET_A });
		});

		it("gives a function subscriber and a direct caller the relation as null with the stored key", async () => {
			const result: SoftKeyItemEntity = await itemService.update({ id: ITEM }, { label: "changed" });

			expect(result).toMatchObject({ hidden: null, profile: null, reviewer: null, reviewerId: TARGET_GONE, sponsor: null, zone: null });
			expect(subscriberState.after).toEqual([{ reviewer: null, reviewerId: TARGET_GONE }]);
			expect(await readStored()).toEqual({ ...STORED, label: "changed" });
		});

		it("rolls back with its ApiFunctionTransactionScope and keeps the keys when it commits", async () => {
			await expect(
				ApiFunctionTransactionScope.runWithDataSource(manager.connection, { name: "softkey" }, async (): Promise<void> => {
					await itemService.update({ id: ITEM }, { label: "changed" });

					throw new Error("roll back");
				}),
			).rejects.toThrow("roll back");
			expect(await readStored()).toEqual(STORED);

			await ApiFunctionTransactionScope.runWithDataSource(manager.connection, { name: "softkey" }, async (): Promise<void> => {
				await itemService.update({ id: ITEM }, { label: "changed" });
			});
			expect(await readStored()).toEqual({ ...STORED, label: "changed" });
		});

		it("keeps a key inside the primary key of the row", async () => {
			const result: SoftKeyMembershipEntity = await membershipService.update({ id: ITEM, targetId: TARGET_GONE }, { label: "changed" });

			expect(result).toMatchObject({ target: null, targetId: TARGET_GONE });
			expect(await readColumns("softkey_memberships", ["label", "targetId"], ITEM)).toEqual({ label: "changed", targetId: TARGET_GONE });
		});

		it("still answers 404 for a soft deleted row and writes nothing", async () => {
			const response = await send("PATCH", ITEMS, { label: "changed" }, ITEM_DELETED);

			expect(response.statusCode, response.body).toBe(HttpStatus.NOT_FOUND);
			expect(await readStored(ITEM_DELETED)).toEqual({ ...STORED, profileId: null });
		});
	});

	describe("an update that names the relation or its key", () => {
		it.each(NAMED_CASES)("PATCH stores $name", async ({ body, stored }: INamedCase) => {
			const response = await send("PATCH", ITEMS, body);

			expect(response.statusCode, response.body).toBe(HttpStatus.OK);
			expect(await readStored()).toEqual({ ...STORED, ...stored });
			expect((await fastify.inject({ method: "GET", url: `/${ITEMS}/${ITEM}` })).json()).toEqual(response.json());
		});

		it.each(NAMED_CASES)("PUT stores $name", async ({ body, stored }: INamedCase) => {
			const response = await send("PUT", ITEMS, { ...PUT_REQUIRED, ...body });

			expect(response.statusCode, response.body).toBe(HttpStatus.OK);
			expect(await readStored()).toEqual({ ...STORED, label: "put", ...stored });
		});

		it.each(REQUIRED_NAMED_CASES)("PATCH stores $name", async ({ body, stored }: INamedCase) => {
			const response = await send("PATCH", ITEMS, body, ITEM_REQUIRED);

			expect(response.statusCode, response.body).toBe(HttpStatus.OK);
			expect(await readStored(ITEM_REQUIRED)).toEqual({ ...STORED_REQUIRED, ...stored });
			expect((await fastify.inject({ method: "GET", url: `/${ITEMS}/${ITEM_REQUIRED}` })).json()).toEqual(response.json());
		});

		it.each(REQUIRED_NAMED_CASES)("PUT stores $name", async ({ body, stored }: INamedCase) => {
			const relationKeys: Record<string, ReadonlyArray<string>> = { owner: ["ownerId"], site: ["regionCode", "siteCode"] };
			const replaced: ReadonlyArray<string> = Object.keys(body).flatMap((key: string): ReadonlyArray<string> => relationKeys[key] ?? []);
			const required: Record<string, unknown> = Object.fromEntries(Object.entries(PUT_REQUIRED_GONE).filter(([key]: [string, unknown]): boolean => !replaced.includes(key)));
			const response = await send("PUT", ITEMS, { ...required, ...body }, ITEM_REQUIRED);

			expect(response.statusCode, response.body).toBe(HttpStatus.OK);
			expect(await readStored(ITEM_REQUIRED)).toEqual({ ...STORED_REQUIRED, label: "put", ...stored });
		});

		it("answers with the new related row after a move away from a soft deleted target", async () => {
			const response = await send("PATCH", ITEMS, { reviewerId: TARGET_A });

			expect(response.json()).toMatchObject({ reviewer: { id: TARGET_A }, reviewerId: TARGET_A, sponsor: null });
		});

		it("answers 400 for null on a required relation and writes nothing", async () => {
			for (const body of [{ owner: null }, { ownerId: null }, { site: null }]) {
				const response = await send("PATCH", ITEMS, body, ITEM_REQUIRED);

				expect(response.statusCode, response.body).toBe(HttpStatus.BAD_REQUEST);
			}

			expect(await readStored(ITEM_REQUIRED)).toEqual(STORED_REQUIRED);
		});

		it("gives a direct caller a reference after a move and the relation as null next to a key it repeats", async () => {
			const moved: SoftKeyItemEntity = await itemService.update({ id: ITEM }, { reviewerId: TARGET_B } as never);

			expect(moved).toMatchObject({ reviewer: { id: TARGET_B }, reviewerId: TARGET_B });
			expect(await readStored()).toEqual({ ...STORED, reviewerId: TARGET_B });

			const repeated: SoftKeyItemEntity = await itemService.update({ id: ITEM }, { profileId: PROFILE_GONE } as never);

			expect(repeated).toMatchObject({ profile: null, profileId: PROFILE_GONE });
			expect(await readStored()).toEqual({ ...STORED, reviewerId: TARGET_B });
		});

		it("clears a relation a direct caller clears and stores a key the read does not select", async () => {
			await itemService.update({ id: ITEM }, { reviewer: null } as never);
			expect(await readStored()).toEqual({ ...STORED, reviewerId: null });

			await itemService.update({ id: ITEM }, { hidden: { id: TARGET_B } } as never);
			expect(await readStored()).toEqual({ ...STORED, hiddenId: TARGET_B, reviewerId: null });

			await itemService.update({ id: ITEM }, { hidden: null } as never);
			expect(await readStored()).toEqual({ ...STORED, hiddenId: null, reviewerId: null });
		});
	});

	describe("a relation inside an embedded column, and a lazy relation", () => {
		const SEEDED_PLACE: Record<string, unknown> = { label: "seeded", lazyTargetId: TARGET_GONE, linkNote: "note", linkTargetId: TARGET_GONE };

		it("PATCH keeps the embedded and the lazy key", async () => {
			const response = await send("PATCH", PLACES, { label: "changed" }, PLACE);

			expect(response.statusCode, response.body).toBe(HttpStatus.OK);
			expect(await readPlace()).toEqual({ ...SEEDED_PLACE, label: "changed" });
		});

		it("PUT keeps the embedded and the lazy key", async () => {
			const response = await send("PUT", PLACES, { label: "put" }, PLACE);

			expect(response.statusCode, response.body).toBe(HttpStatus.OK);
			expect(await readPlace()).toEqual({ ...SEEDED_PLACE, label: "put" });
		});

		it("gives a direct caller and the row of a subscriber the embedded relation as null", async () => {
			const result: SoftKeyPlaceEntity = await placeService.update({ id: PLACE }, { label: "changed" });

			expect(result.link).toMatchObject({ note: "note", target: null, targetId: TARGET_GONE });
			expect(result.link).toBeInstanceOf(SoftKeyPlaceLink);
			expect(placeSubscriberState.current[0]?.link).toMatchObject({ note: "note", target: null, targetId: TARGET_GONE });
			expect(await readPlace()).toEqual({ ...SEEDED_PLACE, label: "changed" });
		});

		it("stores an embedded key and a lazy key a direct caller names", async () => {
			await placeService.update({ id: PLACE }, { lazyTargetId: TARGET_B } as never);
			expect(await readPlace()).toEqual({ ...SEEDED_PLACE, lazyTargetId: TARGET_B });

			await placeService.update({ id: PLACE }, { link: { note: "note", targetId: TARGET_B } } as never);
			expect(await readPlace()).toEqual({ ...SEEDED_PLACE, lazyTargetId: TARGET_B, linkTargetId: TARGET_B });

			await placeService.update({ id: PLACE }, { link: { note: "note", target: null } } as never);
			expect(await readPlace()).toEqual({ ...SEEDED_PLACE, lazyTargetId: TARGET_B, linkTargetId: null });
		});
	});

	describe("relations of other kinds", () => {
		const seedGraph = async (): Promise<void> => {
			await manager.save(SoftKeyGraphTagEntity, [{ id: "tag-live" }, { id: "tag-gone" }]);
			await manager.save(SoftKeyGraphGroupEntity, { id: "group", targetId: TARGET_GONE });
			await manager.save(SoftKeyGraphParentEntity, { group: { id: "group" } as SoftKeyGraphGroupEntity, id: GRAPH, label: "seeded", tags: [{ id: "tag-live" }, { id: "tag-gone" }] as Array<SoftKeyGraphTagEntity> });
			await manager.save(SoftKeyGraphChildEntity, [
				{ id: "child-live", parentId: GRAPH },
				{ id: "child-gone", parentId: GRAPH },
			]);
			await manager.save(SoftKeyGraphSideEntity, { id: "side-gone", parentId: GRAPH });
			await manager.softDelete(SoftKeyGraphTagEntity, { id: "tag-gone" });
			await manager.softDelete(SoftKeyGraphChildEntity, { id: "child-gone" });
			await manager.softDelete(SoftKeyGraphSideEntity, { id: "side-gone" });
		};

		const readLinks = async (): Promise<Array<string>> => ((await manager.query(`SELECT ${quote("softkeyGraphTagsId")} AS ${quote("tagId")} FROM ${quote("softkey_graph_parent_tags")}`)) as Array<{ tagId: string }>).map((row: { tagId: string }): string => row.tagId).sort();

		it("keeps the link to a soft deleted row of an eager many-to-many relation, the far side and a cascaded key", async () => {
			await seedGraph();
			expect(await readLinks()).toEqual(["tag-gone", "tag-live"]);
			const result: SoftKeyGraphParentEntity = await graphService.update({ id: GRAPH }, { label: "changed" });

			expect(result.tags?.map((tag: SoftKeyGraphTagEntity): string => tag.id)).toEqual(["tag-live"]);
			expect(result.group).toMatchObject({ id: "group", target: null, targetId: TARGET_GONE });
			expect(await readLinks()).toEqual(["tag-gone", "tag-live"]);
			expect(await readColumns("softkey_graph_groups", ["targetId"], "group")).toEqual({ targetId: TARGET_GONE });
			expect(await readColumns("softkey_graph_parents", ["groupId", "label"], GRAPH)).toEqual({ groupId: "group", label: "changed" });
			expect(await readColumns("softkey_graph_children", ["parentId"], "child-gone")).toEqual({ parentId: GRAPH });
			expect(await readColumns("softkey_graph_sides", ["parentId"], "side-gone")).toEqual({ parentId: GRAPH });
		});

		it("still replaces the links of a many-to-many relation the update names", async () => {
			await seedGraph();
			await graphService.update({ id: GRAPH }, { tags: [{ id: "tag-live" }] } as never);

			expect(await readLinks()).toEqual(["tag-live"]);
		});
	});
});
