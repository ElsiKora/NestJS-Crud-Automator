import "reflect-metadata";

import type { ExecutionContext } from "@nestjs/common";
import type { ColumnOptions, PrimaryColumnOptions } from "typeorm";

import { HttpStatus, Inject, Injectable, RequestMethod } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Column, Entity, PrimaryColumn, Repository } from "typeorm";

import {
	ApiController,
	ApiControllerSecurable,
	ApiPropertyDescribe,
	ApiPropertyString,
	ApiRouteCustom,
	ApiService,
	ApiServiceBase,
	AuthorizationResolveDefaultPrincipal,
	EApiAction,
	EApiAuthenticationType,
	EApiAuthorizationMode,
	EApiControllerGetListQueryPaginationMode,
	EApiControllerGetListQueryUnlistedFields,
	EApiControllerRequestTarget,
	EApiDtoType,
	EApiPropertyDescribeType,
	EApiPropertyNumberType,
	EApiPropertyStringType,
	EApiRouteType,
	EFilterOperation,
	EFilterOrderDirection,
} from "../../../src/index";

export type TE2eIamPathDatabase = "mariadb" | "mysql" | "postgres" | "sqlite";

export enum EE2eIamPathKind {
	PUBLIC = "public",
	SECRET = "secret",
}

export interface IE2eIamPathRow {
	big: string;
	id: string;
	kind: EE2eIamPathKind;
	label: string;
	rank: number;
}

export interface IE2eIamPathKindRow {
	kind: EE2eIamPathKind;
	note: string;
}

export interface IE2eIamPathCount {
	id: number;
}

export interface IE2eIamPathBig {
	id: string;
}

export interface IE2eIamPathTenantItem {
	id: number;
	tenantCode: string;
}

type TE2eIamPathClass = new () => unknown;

export interface IE2eIamPathApp {
	controllers: Array<TE2eIamPathClass>;
	entities: Array<TE2eIamPathClass>;
	providers: Array<TE2eIamPathClass>;
}

export interface IE2eIamPathRefusal {
	app: IE2eIamPathApp;
	message: RegExp;
	name: string;
}

export interface IE2eIamPathFixture {
	app: IE2eIamPathApp;
	bigService: TE2eIamPathClass;
	countService: TE2eIamPathClass;
	kindService: TE2eIamPathClass;
	namespaces: { bigs: string; counts: string; kinds: string; rows: string; tenants: string };
	plainCountApp: IE2eIamPathApp;
	refusals: Array<IE2eIamPathRefusal>;
	rowService: TE2eIamPathClass;
	tenantService: TE2eIamPathClass;
}

// The one user; every request authenticates as this user.
export const E2E_IAM_PATH_USER: Record<string, unknown> = { id: "user-1" };

export const E2E_IAM_PATH_PRINCIPAL: ReturnType<typeof AuthorizationResolveDefaultPrincipal> = AuthorizationResolveDefaultPrincipal(E2E_IAM_PATH_USER as never);

// Every LIKE family operator a generated list takes on a text field; each reads its client text as literal text.
export const E2E_IAM_PATH_LIKE_OPERATIONS: ReadonlyArray<EFilterOperation> = [EFilterOperation.CONT, EFilterOperation.CONTL, EFilterOperation.ENDS, EFilterOperation.ENDSL, EFilterOperation.EQL, EFilterOperation.INL, EFilterOperation.NEL, EFilterOperation.NOTINL, EFilterOperation.STARTS, EFilterOperation.STARTSL];

/**
 * Authenticates every request as the one test user.
 */
@Injectable()
export class E2eIamPathGuard {
	public canActivate(context: ExecutionContext): boolean {
		context.switchToHttp().getRequest<{ user?: unknown }>().user = E2E_IAM_PATH_USER;

		return true;
	}
}

const authentication = { guard: E2eIamPathGuard, type: EApiAuthenticationType.USER } as never;
const route = { security: { authentication } };
const off = { generation: { isEnabled: false } };
const text = (description: string, maxLength: number = 64): PropertyDecorator => ApiPropertyDescribe({ description, exampleValue: "a", format: EApiPropertyStringType.STRING, maxLength, minLength: 0, pattern: "/^[\\s\\S]*$/", type: EApiPropertyDescribeType.STRING });
const integer = (description: string): PropertyDecorator => ApiPropertyDescribe({ description, exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: 1_000_000, minimum: -1_000_000, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER });
const kindDescribe = (description: string): PropertyDecorator => ApiPropertyDescribe({ description, enum: EE2eIamPathKind, enumName: "EE2eIamPathKind", type: EApiPropertyDescribeType.ENUM });

// The pattern lets any decimal text of up to 20 characters through, so only the range check stops a value past 64 bits.
const bigText = (description: string): PropertyDecorator => ApiPropertyDescribe({ description, exampleValue: "1", format: EApiPropertyStringType.BIGINT_STRING, maxLength: 20, minLength: 1, pattern: "/^-?[0-9]+$/", type: EApiPropertyDescribeType.STRING });

const field = (path: string, queryPath: string = path): { isFilterable: boolean; path: string; queryPath: string } => ({ isFilterable: true, path: `resource.${path}`, queryPath });

const authorizationOf = (entity: unknown, namespace: string, resourcePath: string, fields: Array<unknown>): unknown => ({ defaultMode: EApiAuthorizationMode.IAM, policyNamespace: namespace, resourceDefinition: { entity, fields, namespace, resourcePath, resourceType: namespace } });

const routesOf = (enabled: Partial<Record<EApiRouteType, unknown>>): unknown => ({
	[EApiRouteType.CREATE]: enabled[EApiRouteType.CREATE] ?? off,
	[EApiRouteType.DELETE]: enabled[EApiRouteType.DELETE] ?? off,
	[EApiRouteType.GET]: enabled[EApiRouteType.GET] ?? off,
	[EApiRouteType.GET_LIST]: enabled[EApiRouteType.GET_LIST] ?? off,
	[EApiRouteType.PARTIAL_UPDATE]: enabled[EApiRouteType.PARTIAL_UPDATE] ?? off,
	[EApiRouteType.UPDATE]: enabled[EApiRouteType.UPDATE] ?? off,
});

/**
 * Tells the namespace of a route on a database.
 * @param {string} name - Route.
 * @param {TE2eIamPathDatabase} database - Database under test.
 * @returns {string} The namespace, unique in the process.
 */
export function readE2eIamPathNamespace(name: string, database: TE2eIamPathDatabase): string {
	return `ip${name}${database}:item`;
}

/**
 * Declares a generated controller over a service, named before its decorators read the name.
 * @param {string} name - Controller name, which starts every generated DTO name.
 * @param {TE2eIamPathClass} service - Service the controller injects.
 * @param {Record<string, unknown>} properties - Controller properties.
 * @param {boolean} isSecurable - Whether the controller is secured by authorization.
 * @returns {TE2eIamPathClass} The controller.
 */
function declareController(name: string, service: TE2eIamPathClass, properties: Record<string, unknown>, isSecurable: boolean = true): TE2eIamPathClass {
	class E2eIamPathController {
		@Inject(service)
		public readonly service!: unknown;
	}

	Object.defineProperty(E2eIamPathController, "name", { value: `${name}Controller` });

	if (isSecurable) {
		ApiControllerSecurable()(E2eIamPathController);
	}

	ApiController({ name, ...properties } as never)(E2eIamPathController as never);

	return E2eIamPathController;
}

/**
 * Declares a service over an entity.
 * @param {TE2eIamPathClass} entity - Entity.
 * @returns {TE2eIamPathClass} The service.
 */
function declareService(entity: TE2eIamPathClass): TE2eIamPathClass {
	class E2eIamPathService extends ApiServiceBase<never> {
		@InjectRepository(entity)
		public readonly repository!: Repository<never>;
	}

	// ApiService returns the class that defines the generated functions, as a class decorator would.
	const service: TE2eIamPathClass = ApiService({ entity } as never)(E2eIamPathService) as TE2eIamPathClass;
	Injectable()(service);

	return service;
}

/**
 * Declares an entity with an integer key and one text-described value column, which a path scope binds to a path parameter.
 * @param {string} table - Table name.
 * @param {ColumnOptions} column - Options of the value column.
 * @returns {TE2eIamPathClass} The entity.
 */
function declareScopedEntity(table: string, column: ColumnOptions): TE2eIamPathClass {
	class E2eIamPathScopedEntity {
		public id!: number;

		public value!: unknown;
	}

	PrimaryColumn({ type: "int" })(E2eIamPathScopedEntity.prototype, "id");
	integer("id")(E2eIamPathScopedEntity.prototype, "id");
	Column(column)(E2eIamPathScopedEntity.prototype, "value");
	text("value")(E2eIamPathScopedEntity.prototype, "value");
	Entity(table)(E2eIamPathScopedEntity);

	return E2eIamPathScopedEntity;
}

/**
 * Declares the tables and routes of one database.
 * @param {TE2eIamPathDatabase} database - Database under test.
 * @returns {IE2eIamPathFixture} The app that starts, the apps that must not, and their services.
 */
export function createE2eIamPathFixture(database: TE2eIamPathDatabase): IE2eIamPathFixture {
	const isSqlite: boolean = database === "sqlite";
	const enumColumn: PrimaryColumnOptions = { enum: EE2eIamPathKind, type: isSqlite ? "simple-enum" : "enum" };
	// SQLite has no uuid type; a text column described as a UUID takes one spelling there too.
	const uuidColumn: PrimaryColumnOptions = isSqlite ? { length: 36, type: "varchar" } : { type: "uuid" };
	const namespaces: IE2eIamPathFixture["namespaces"] = { bigs: readE2eIamPathNamespace("bigs", database), counts: readE2eIamPathNamespace("counts", database), kinds: readE2eIamPathNamespace("kinds", database), rows: readE2eIamPathNamespace("rows", database), tenants: readE2eIamPathNamespace("tenants", database) };

	@Entity("e2e_iam_path_rows")
	class E2eIamPathRowEntity implements IE2eIamPathRow {
		@Column({ type: "bigint" })
		@bigText("big")
		public big!: string;

		@PrimaryColumn(uuidColumn)
		@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
		public id!: string;

		@Column(enumColumn)
		@kindDescribe("kind")
		public kind!: EE2eIamPathKind;

		@Column({ length: 16, type: "varchar" })
		@text("label", 16)
		public label!: string;

		@Column({ type: "int" })
		@integer("rank")
		public rank!: number;
	}

	@Entity("e2e_iam_path_kinds")
	class E2eIamPathKindEntity implements IE2eIamPathKindRow {
		@PrimaryColumn(enumColumn)
		@kindDescribe("kind")
		public kind!: EE2eIamPathKind;

		@Column({ length: 16, type: "varchar" })
		@text("note", 16)
		public note!: string;
	}

	@Entity("e2e_iam_path_counts")
	class E2eIamPathCountEntity implements IE2eIamPathCount {
		@PrimaryColumn({ type: "int" })
		@integer("id")
		public id!: number;
	}

	@Entity("e2e_iam_path_bigs")
	class E2eIamPathBigEntity implements IE2eIamPathBig {
		@PrimaryColumn({ type: "bigint" })
		@bigText("id")
		public id!: string;
	}

	@Entity("e2e_iam_path_tenant_items")
	class E2eIamPathTenantItemEntity implements IE2eIamPathTenantItem {
		@PrimaryColumn({ type: "int" })
		@integer("id")
		public id!: number;

		@Column({ length: 16, type: "varchar" })
		@text("tenantCode", 16)
		public tenantCode!: string;
	}

	const rowService: TE2eIamPathClass = declareService(E2eIamPathRowEntity);
	const kindService: TE2eIamPathClass = declareService(E2eIamPathKindEntity);
	const countService: TE2eIamPathClass = declareService(E2eIamPathCountEntity);
	const bigService: TE2eIamPathClass = declareService(E2eIamPathBigEntity);
	const tenantService: TE2eIamPathClass = declareService(E2eIamPathTenantItemEntity);

	const rowAuthorization: unknown = authorizationOf(E2eIamPathRowEntity, namespaces.rows, `${namespaces.rows}/{id}`, [field("id"), field("kind"), field("label")]);
	const rowFilter: unknown = { fields: { big: { allowedOperations: [EFilterOperation.EQ], isEnabled: true }, label: { allowedOperations: E2E_IAM_PATH_LIKE_OPERATIONS, isEnabled: true } }, unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT };

	const controllers: Array<TE2eIamPathClass> = [
		declareController("E2eIamPathRows", rowService, { authorization: rowAuthorization, entity: E2eIamPathRowEntity, path: "iam-path/rows", routes: routesOf({ [EApiRouteType.CREATE]: route, [EApiRouteType.GET]: route, [EApiRouteType.GET_LIST]: { request: { [EApiControllerRequestTarget.QUERY]: { filter: rowFilter } }, security: { authentication } } }) }),
		declareController("E2eIamPathKinds", kindService, { authorization: authorizationOf(E2eIamPathKindEntity, namespaces.kinds, `${namespaces.kinds}/{kind}`, [field("kind")]), entity: E2eIamPathKindEntity, path: "iam-path/kinds", routes: routesOf({ [EApiRouteType.GET]: route }) }),
		declareController("E2eIamPathCounts", countService, { authorization: authorizationOf(E2eIamPathCountEntity, namespaces.counts, `${namespaces.counts}/{id}`, [field("id")]), entity: E2eIamPathCountEntity, path: "iam-path/counts", routes: routesOf({ [EApiRouteType.GET]: route }) }),
		declareController("E2eIamPathBigs", bigService, { authorization: authorizationOf(E2eIamPathBigEntity, namespaces.bigs, `${namespaces.bigs}/{id}`, [field("id")]), entity: E2eIamPathBigEntity, path: "iam-path/bigs", routes: routesOf({ [EApiRouteType.GET]: route }) }),
		// The placeholder has no field mapping and names no column; the path scope binds the parameter of that name to tenantCode.
		declareController("E2eIamPathTenants", tenantService, { authorization: authorizationOf(E2eIamPathTenantItemEntity, namespaces.tenants, `${namespaces.tenants}/{tenant}/{id}`, [field("id")]), entity: E2eIamPathTenantItemEntity, path: "iam-path/tenants/:tenant/items", pathScope: { parameters: [{ field: "tenantCode", parameter: "tenant" }] }, routes: routesOf({ [EApiRouteType.GET]: route, [EApiRouteType.GET_LIST]: route }) }),
	];

	// A cursor list runs on PostgreSQL only.
	if (database === "postgres") {
		controllers.push(
			declareController("E2eIamPathCursorRows", rowService, {
				authorization: authorizationOf(E2eIamPathRowEntity, readE2eIamPathNamespace("cursor", database), `${readE2eIamPathNamespace("cursor", database)}/{id}`, [field("id"), field("kind"), field("label")]),
				entity: E2eIamPathRowEntity,
				path: "iam-path/cursor-rows",
				routes: routesOf({
					[EApiRouteType.GET_LIST]: { request: { [EApiControllerRequestTarget.QUERY]: { filter: rowFilter, order: { defaultOrder: [{ direction: EFilterOrderDirection.ASC, field: "rank" }], fields: { rank: { isEnabled: true } }, tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }], unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT }, pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR } } }, security: { authentication } },
				}),
			}),
		);
	}

	const app: IE2eIamPathApp = { controllers, entities: [E2eIamPathRowEntity, E2eIamPathKindEntity, E2eIamPathCountEntity, E2eIamPathBigEntity, E2eIamPathTenantItemEntity], providers: [rowService, kindService, countService, bigService, tenantService] };
	const plainCountApp: IE2eIamPathApp = { controllers: [declareController("E2eIamPathPlainCounts", countService, { entity: E2eIamPathCountEntity, path: "iam-path/plain-counts", routes: routesOf({ [EApiRouteType.GET]: {} }) }, false)], entities: [E2eIamPathCountEntity], providers: [countService] };

	const refusals: Array<IE2eIamPathRefusal> = [];

	// A row route whose key column is described as text.
	const refuseKey = (name: string, column: PrimaryColumnOptions, typeName: string): void => {
		class E2eIamPathKeyEntity {
			public id!: unknown;
		}

		PrimaryColumn(column)(E2eIamPathKeyEntity.prototype, "id");
		text("id")(E2eIamPathKeyEntity.prototype, "id");
		Entity(`e2e_iam_path_refused_${name}`)(E2eIamPathKeyEntity);
		const service: TE2eIamPathClass = declareService(E2eIamPathKeyEntity);
		const namespace: string = readE2eIamPathNamespace(`refused${name}`, database);
		const controller: TE2eIamPathClass = declareController(`E2eIamPathRefused${name}`, service, { authorization: authorizationOf(E2eIamPathKeyEntity, namespace, `${namespace}/{id}`, [field("id")]), entity: E2eIamPathKeyEntity, path: `iam-path/refused-${name}`, routes: routesOf({ [EApiRouteType.GET]: route }) });

		refusals.push({ app: { controllers: [controller], entities: [E2eIamPathKeyEntity], providers: [service] }, message: new RegExp(`holds the path parameter "id" in the ${typeName} column "id"`, "u"), name: `a ${typeName} key described as text` });
	};

	// A path scope that binds a path parameter to a column described as text.
	const refuseScope = (name: string, column: ColumnOptions, typeName: string): void => {
		const entity: TE2eIamPathClass = declareScopedEntity(`e2e_iam_path_scoped_${name}`, column);
		const service: TE2eIamPathClass = declareService(entity);
		const namespace: string = readE2eIamPathNamespace(`scoped${name}`, database);
		const controller: TE2eIamPathClass = declareController(`E2eIamPathScoped${name}`, service, { authorization: authorizationOf(entity, namespace, `${namespace}/{value}/{id}`, [field("id")]), entity, path: `iam-path/scoped-${name}/:value/items`, pathScope: { parameters: [{ field: "value", parameter: "value" }] }, routes: routesOf({ [EApiRouteType.GET]: route }) });

		refusals.push({ app: { controllers: [controller], entities: [entity], providers: [service] }, message: new RegExp(`holds the path parameter "value" in the ${typeName} column "value"`, "u"), name: `a path scope over a ${typeName} column described as text` });
	};

	refuseKey("Enum", enumColumn, isSqlite ? "simple-enum" : "enum");
	refuseScope("Bool", { type: "boolean" }, "boolean");
	refuseScope("Day", { type: "date" }, "date");
	refuseScope("Time", { type: "time" }, "time");

	if (!isSqlite) {
		refuseKey("Uuid", { type: "uuid" }, "uuid");
	}

	if (database === "postgres") {
		refuseScope("Inet", { type: "inet" }, "inet");
		refuseScope("Mac", { type: "macaddr" }, "macaddr");
	}

	if (database === "mysql" || database === "mariadb") {
		refuseScope("Set", { enum: EE2eIamPathKind, type: "set" }, "set");
		refuseScope("Year", { type: "year" }, "year");
	}

	// A custom route that describes an enum placeholder with ApiPropertyString.
	class E2eIamPathCustomKindParameters {
		@ApiPropertyString({ description: "kind", entity: () => E2eIamPathKindEntity, exampleValue: "secret", format: EApiPropertyStringType.STRING, isRequired: true, maxLength: 16, minLength: 1, pattern: "/^.+$/" } as never)
		public kind!: string;
	}

	const customNamespace: string = readE2eIamPathNamespace("custom", database);

	class E2eIamPathCustomKindController {
		@Inject(kindService)
		public readonly service!: unknown;

		public read(): unknown {
			return { isReached: true };
		}
	}

	Object.defineProperty(E2eIamPathCustomKindController, "name", { value: "E2eIamPathCustomKindController" });
	// A method decorator may return a new descriptor, which the class then holds, as decorator syntax does.
	const readDescriptor: PropertyDescriptor = Object.getOwnPropertyDescriptor(E2eIamPathCustomKindController.prototype, "read")!;
	Object.defineProperty(
		E2eIamPathCustomKindController.prototype,
		"read",
		(ApiRouteCustom({ dto: { [EApiDtoType.PARAMETERS]: E2eIamPathCustomKindParameters }, resource: { action: EApiAction.FETCH, entity: E2eIamPathKindEntity }, response: { serialization: { isEnabled: false }, status: HttpStatus.OK, type: undefined }, route: { method: RequestMethod.GET, path: ":kind", type: EApiRouteType.GET }, security: { authentication } } as never)(E2eIamPathCustomKindController.prototype, "read", readDescriptor) as PropertyDescriptor | undefined) ??
			readDescriptor,
	);
	ApiControllerSecurable()(E2eIamPathCustomKindController);
	ApiController({ authorization: authorizationOf(E2eIamPathKindEntity, customNamespace, `${customNamespace}/{kind}`, [field("kind")]), entity: E2eIamPathKindEntity, name: "E2eIamPathCustomKind", path: "iam-path/custom-kinds", routes: routesOf({}) } as never)(E2eIamPathCustomKindController as never);
	refusals.push({ app: { controllers: [E2eIamPathCustomKindController], entities: [E2eIamPathKindEntity], providers: [kindService] }, message: new RegExp(`holds the path parameter "kind" in the ${isSqlite ? "simple-enum" : "enum"} column "kind" and describes it as string`, "u"), name: "a custom route that describes an enum placeholder with ApiPropertyString" });

	return { app, bigService, countService, kindService, namespaces, plainCountApp, refusals, rowService, tenantService };
}
