import "reflect-metadata";

import type { ExecutionContext } from "@nestjs/common";

import { Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Column, Entity, PrimaryColumn, Repository } from "typeorm";

import { ApiController, ApiControllerSecurable, ApiPropertyDescribe, ApiService, ApiServiceBase, EApiAuthenticationType, EApiAuthorizationMode, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../../src/index";

export type TE2eIamTargetDatabase = "mariadb" | "mysql" | "postgres" | "sqlite";

export interface IE2eIamTargetFixture {
	controllers: Array<new () => unknown>;
	entities: Array<new () => unknown>;
	namespaces: { char: string; fold: string; item: string; tenant: string; tenantBody: string };
	services: { char: new () => IE2eIamTargetService; fold: new () => IE2eIamTargetService; item: new () => IE2eIamTargetService; tenant: new () => IE2eIamTargetService };
}

export interface IE2eIamTargetRow {
	id: string;
	status?: null | string;
	tenant?: null | string;
}

export interface IE2eIamTargetService {
	repository: Repository<IE2eIamTargetRow>;
}

// The one principal of the suite.
export const E2E_IAM_TARGET_USER: Record<string, unknown> = { id: "user-1" };

/**
 * Authenticates every request as the one test user.
 */
@Injectable()
export class E2eIamTargetGuard {
	public canActivate(context: ExecutionContext): boolean {
		context.switchToHttp().getRequest<{ user?: unknown }>().user = E2E_IAM_TARGET_USER;

		return true;
	}
}

const describeText = (description: string, maxLength: number): PropertyDecorator => ApiPropertyDescribe({ description, exampleValue: "a", format: EApiPropertyStringType.STRING, maxLength, minLength: 0, pattern: "/^.*$/", type: EApiPropertyDescribeType.STRING });
const authentication = { guard: E2eIamTargetGuard, type: EApiAuthenticationType.USER } as never;
const served = { security: { authentication } };
const off = { generation: { isEnabled: false } };

const authorizationOf = (entity: unknown, namespace: string, resourcePath: string): never =>
	({
		defaultMode: EApiAuthorizationMode.IAM,
		policyNamespace: namespace,
		resourceDefinition: { entity, fields: ["id", "status", "tenant"].map((field: string) => ({ isFilterable: true, path: `resource.${field}`, queryPath: field })), namespace, resourcePath, resourceType: namespace },
	}) as never;

/**
 * Builds the entities and controllers of one database: the key columns differ by database, so a case-insensitive or a
 * padded key exists where the database has one.
 * @param {TE2eIamTargetDatabase} database - Database the suite runs on.
 * @returns {IE2eIamTargetFixture} Entities, controllers and services of the database.
 */
export function E2eIamTargetBuild(database: TE2eIamTargetDatabase): IE2eIamTargetFixture {
	const suffix: string = database.charAt(0).toUpperCase() + database.slice(1);
	const prefix: string = `tg${database.slice(0, 2)}`;
	const namespaces: IE2eIamTargetFixture["namespaces"] = { char: `${prefix}c:item`, fold: `${prefix}f:item`, item: `${prefix}i:item`, tenant: `${prefix}t:item`, tenantBody: `${prefix}b:item` };

	// A key under the default collation: case- and accent-insensitive on MySQL and MariaDB, binary on PostgreSQL and SQLite.
	@Entity("e2e_iam_target_items")
	class ItemEntity {
		@PrimaryColumn({ length: 64, type: "varchar" })
		@describeText("id", 64)
		public id!: string;

		@Column({ length: 64, nullable: true, type: "varchar" })
		@describeText("status", 64)
		public status?: null | string;

		@Column({ length: 64, nullable: true, type: "varchar" })
		@describeText("tenant", 64)
		public tenant?: null | string;
	}

	// A key that folds letter case on every database: NOCASE on SQLite, citext on PostgreSQL, the default collation elsewhere.
	@Entity("e2e_iam_target_folds")
	class FoldEntity {
		@PrimaryColumn(database === "postgres" ? { type: "citext" } : { length: 64, type: "varchar", ...(database === "sqlite" ? { collation: "NOCASE" } : {}) })
		@describeText("id", 64)
		public id!: string;

		@Column({ length: 64, nullable: true, type: "varchar" })
		@describeText("status", 64)
		public status?: null | string;

		@Column({ length: 64, nullable: true, type: "varchar" })
		@describeText("tenant", 64)
		public tenant?: null | string;
	}

	// A padded key: char(10) pads and compares without trailing spaces on PostgreSQL, MySQL and MariaDB.
	@Entity("e2e_iam_target_chars")
	class CharEntity {
		@PrimaryColumn({ length: 10, type: database === "sqlite" ? "character" : "char" })
		@describeText("id", 10)
		public id!: string;

		@Column({ length: 64, nullable: true, type: "varchar" })
		@describeText("status", 64)
		public status?: null | string;

		@Column({ length: 64, nullable: true, type: "varchar" })
		@describeText("tenant", 64)
		public tenant?: null | string;
	}

	// Rows of a tenant, read under the tenant of the path.
	@Entity("e2e_iam_target_tenants")
	class TenantEntity {
		@PrimaryColumn({ length: 64, type: "varchar" })
		@describeText("id", 64)
		public id!: string;

		@Column({ length: 64, nullable: true, type: "varchar" })
		@describeText("status", 64)
		public status?: null | string;

		@Column({ length: 64, type: "varchar" })
		@describeText("tenant", 64)
		public tenant!: string;
	}

	@Injectable()
	@ApiService({ entity: ItemEntity })
	class ItemService extends ApiServiceBase<ItemEntity> {
		@InjectRepository(ItemEntity)
		public readonly repository!: Repository<ItemEntity>;
	}

	@Injectable()
	@ApiService({ entity: FoldEntity })
	class FoldService extends ApiServiceBase<FoldEntity> {
		@InjectRepository(FoldEntity)
		public readonly repository!: Repository<FoldEntity>;
	}

	@Injectable()
	@ApiService({ entity: CharEntity })
	class CharService extends ApiServiceBase<CharEntity> {
		@InjectRepository(CharEntity)
		public readonly repository!: Repository<CharEntity>;
	}

	@Injectable()
	@ApiService({ entity: TenantEntity })
	class TenantService extends ApiServiceBase<TenantEntity> {
		@InjectRepository(TenantEntity)
		public readonly repository!: Repository<TenantEntity>;
	}

	const everyRoute = { [EApiRouteType.CREATE]: served, [EApiRouteType.DELETE]: served, [EApiRouteType.GET]: served, [EApiRouteType.GET_LIST]: served, [EApiRouteType.PARTIAL_UPDATE]: served, [EApiRouteType.UPDATE]: off } as never;

	@ApiControllerSecurable()
	@ApiController<ItemEntity>({ authorization: authorizationOf(ItemEntity, namespaces.item, `${namespaces.item}/{id}`), entity: ItemEntity, name: `E2eIamTargetItems${suffix}`, path: "iam-target/items", routes: everyRoute })
	class ItemController {
		@Inject(ItemService)
		public readonly service!: ItemService;
	}

	@ApiControllerSecurable()
	@ApiController<FoldEntity>({ authorization: authorizationOf(FoldEntity, namespaces.fold, `${namespaces.fold}/{id}`), entity: FoldEntity, name: `E2eIamTargetFolds${suffix}`, path: "iam-target/folds", routes: everyRoute })
	class FoldController {
		@Inject(FoldService)
		public readonly service!: FoldService;
	}

	@ApiControllerSecurable()
	@ApiController<CharEntity>({ authorization: authorizationOf(CharEntity, namespaces.char, `${namespaces.char}/{id}`), entity: CharEntity, name: `E2eIamTargetChars${suffix}`, path: "iam-target/chars", routes: everyRoute })
	class CharController {
		@Inject(CharService)
		public readonly service!: CharService;
	}

	@ApiControllerSecurable()
	@ApiController<TenantEntity>({ authorization: authorizationOf(TenantEntity, namespaces.tenant, `${namespaces.tenant}/{tenant}/i/{id}`), entity: TenantEntity, name: `E2eIamTargetTenants${suffix}`, path: "iam-target/tenants/:tenant/items", pathScope: { parameters: [{ field: "tenant", parameter: "tenant" }] }, routes: everyRoute } as never)
	class TenantController {
		@Inject(TenantService)
		public readonly service!: TenantService;
	}

	// The tenant comes from the body: a create names both placeholders of the resource path in what it stores.
	@ApiControllerSecurable()
	@ApiController<TenantEntity>({
		authorization: authorizationOf(TenantEntity, namespaces.tenantBody, `${namespaces.tenantBody}/{tenant}/i/{id}`),
		entity: TenantEntity,
		name: `E2eIamTargetTenantBodies${suffix}`,
		path: "iam-target/tenant-bodies",
		routes: { [EApiRouteType.CREATE]: served, [EApiRouteType.DELETE]: off, [EApiRouteType.GET]: off, [EApiRouteType.GET_LIST]: served, [EApiRouteType.PARTIAL_UPDATE]: off, [EApiRouteType.UPDATE]: off } as never,
	})
	class TenantBodyController {
		@Inject(TenantService)
		public readonly service!: TenantService;
	}

	return {
		controllers: [ItemController, FoldController, CharController, TenantController, TenantBodyController],
		entities: [ItemEntity, FoldEntity, CharEntity, TenantEntity],
		namespaces,
		services: { char: CharService as never, fold: FoldService as never, item: ItemService as never, tenant: TenantService as never },
	};
}
