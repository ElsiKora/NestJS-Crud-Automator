import "reflect-metadata";

import type { ExecutionContext } from "@nestjs/common";

import { Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Column, Entity, PrimaryColumn, Repository } from "typeorm";

import { ApiController, ApiControllerSecurable, ApiPropertyDescribe, ApiService, ApiServiceBase, AuthorizationResolveDefaultPrincipal, EApiAuthenticationType, EApiAuthorizationMode, EApiControllerGetListQueryPaginationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType, EFilterOrderDirection } from "../../../src/index";

export type TE2eIamAuditDatabase = "mariadb" | "mysql" | "postgres" | "sqlite";

export interface IE2eIamAuditItem {
	at?: Date | null;
	day?: null | string;
	flag?: boolean | null;
	id: string;
	label?: null | string;
	price?: null | number | string;
	ratio?: null | number;
	tenant?: null | string;
}

export interface IE2eIamAuditCounter {
	id: number;
	rank: number;
	tenant?: null | string;
}

export interface IE2eIamAuditRoute {
	authorization: { policyNamespace: string };
	controller: new () => unknown;
	entity: new () => unknown;
	url: string;
}

export interface IE2eIamAuditFixture {
	counter: new () => IE2eIamAuditCounter;
	counterService: new () => { repository: Repository<IE2eIamAuditCounter> };
	item: new () => IE2eIamAuditItem;
	itemService: new () => { repository: Repository<IE2eIamAuditItem> };
	routes: Record<Exclude<TE2eIamAuditRouteName, "counter">, IE2eIamAuditRoute> & { counter?: IE2eIamAuditRoute };
}

// Each typed placeholder has a list route of its own, whose resource path names it alone.
export const E2E_IAM_AUDIT_TYPED_FIELDS = ["price", "day", "at", "ratio", "flag"] as const;

export type TE2eIamAuditTypedField = (typeof E2E_IAM_AUDIT_TYPED_FIELDS)[number];

export type TE2eIamAuditRouteName = "counter" | "items" | "tenant" | TE2eIamAuditTypedField;

// The one principal; `attr` holds text no typed column holds.
export const E2E_IAM_AUDIT_USER: Record<string, unknown> = { attr: "abc", id: "user-1", tenant: "t1" };

export const E2E_IAM_AUDIT_PRINCIPAL: ReturnType<typeof AuthorizationResolveDefaultPrincipal> = AuthorizationResolveDefaultPrincipal(E2E_IAM_AUDIT_USER as never);

/**
 * Authenticates every request as the one test user.
 */
@Injectable()
export class E2eIamAuditGuard {
	public canActivate(context: ExecutionContext): boolean {
		context.switchToHttp().getRequest<{ user?: unknown }>().user = E2E_IAM_AUDIT_USER;

		return true;
	}
}

const authentication = { guard: E2eIamAuditGuard, type: EApiAuthenticationType.USER } as never;
const off = { generation: { isEnabled: false } };
const text = (description: string, maxLength: number): PropertyDecorator => ApiPropertyDescribe({ description, exampleValue: "a", format: EApiPropertyStringType.STRING, maxLength, minLength: 0, pattern: "/^[\\s\\S]*$/", type: EApiPropertyDescribeType.STRING });
const integer = (description: string): PropertyDecorator => ApiPropertyDescribe({ description, exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: 1000, minimum: -1000, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER });

/**
 * Tells the namespace of a route on a database.
 * @param {TE2eIamAuditRouteName} name - Route.
 * @param {TE2eIamAuditDatabase} database - Database under test.
 * @returns {string} The namespace, unique in the process.
 */
export function readE2eIamAuditNamespace(name: TE2eIamAuditRouteName, database: TE2eIamAuditDatabase): string {
	return `ia${name}${database}:item`;
}

/**
 * Declares the tables and routes of one database. The instant column holds a wall clock wherever the database has one:
 * `timestamp` on PostgreSQL and `datetime(3)` on MySQL and MariaDB.
 * @param {TE2eIamAuditDatabase} database - Database under test.
 * @returns {IE2eIamAuditFixture} Entities, services and routes of that database.
 */
export function createE2eIamAuditFixture(database: TE2eIamAuditDatabase): IE2eIamAuditFixture {
	const instant: { precision?: number; type: "datetime" | "timestamp" } = database === "postgres" ? { precision: 3, type: "timestamp" } : database === "sqlite" ? { type: "datetime" } : { precision: 3, type: "datetime" };
	const double: "double precision" | "double" = database === "postgres" ? "double precision" : "double";

	@Entity("e2e_iam_audit_items")
	class E2eIamAuditItemEntity implements IE2eIamAuditItem {
		@Column({ nullable: true, ...instant })
		public at?: Date | null;

		@Column({ nullable: true, type: "date" })
		public day?: null | string;

		@Column({ nullable: true, type: "boolean" })
		public flag?: boolean | null;

		@PrimaryColumn({ length: 16, type: "varchar" })
		@text("id", 16)
		public id!: string;

		@Column({ length: 64, nullable: true, type: "varchar" })
		@text("label", 64)
		public label?: null | string;

		@Column({ nullable: true, precision: 10, scale: 2, type: "decimal" })
		public price?: null | number | string;

		@Column({ nullable: true, type: double })
		public ratio?: null | number;

		@Column({ length: 16, nullable: true, type: "varchar" })
		@text("tenant", 16)
		public tenant?: null | string;
	}

	@Entity("e2e_iam_audit_counters")
	class E2eIamAuditCounterEntity implements IE2eIamAuditCounter {
		@PrimaryColumn({ type: "int" })
		@integer("id")
		public id!: number;

		@Column({ default: 0, type: "int" })
		@integer("rank")
		public rank!: number;

		@Column({ length: 16, nullable: true, type: "varchar" })
		@text("tenant", 16)
		public tenant?: null | string;
	}

	@Injectable()
	@ApiService({ entity: E2eIamAuditItemEntity })
	class E2eIamAuditItemService extends ApiServiceBase<E2eIamAuditItemEntity> {
		@InjectRepository(E2eIamAuditItemEntity)
		public readonly repository!: Repository<E2eIamAuditItemEntity>;
	}

	@Injectable()
	@ApiService({ entity: E2eIamAuditCounterEntity })
	class E2eIamAuditCounterService extends ApiServiceBase<E2eIamAuditCounterEntity> {
		@InjectRepository(E2eIamAuditCounterEntity)
		public readonly repository!: Repository<E2eIamAuditCounterEntity>;
	}

	const itemFields: ReadonlyArray<string> = ["id", "label", "tenant", "price", "day", "at", "ratio", "flag"];

	const createRoute = (name: TE2eIamAuditRouteName, placeholder: string, hasRead: boolean): IE2eIamAuditRoute => {
		const namespace: string = readE2eIamAuditNamespace(name, database);
		const isCounter: boolean = name === "counter";
		const entity: new () => unknown = isCounter ? E2eIamAuditCounterEntity : E2eIamAuditItemEntity;
		const fields: ReadonlyArray<string> = isCounter ? ["id", "rank", "tenant"] : itemFields;
		const authorization = {
			defaultMode: EApiAuthorizationMode.IAM,
			policyNamespace: namespace,
			resourceDefinition: { entity, fields: fields.map((field: string) => ({ isFilterable: true, path: `resource.${field}`, queryPath: field })), namespace, resourcePath: `${namespace}/{${placeholder}}`, resourceType: namespace },
		};

		class E2eIamAuditController {
			@Inject(isCounter ? E2eIamAuditCounterService : E2eIamAuditItemService)
			public readonly service!: E2eIamAuditItemService;
		}

		// The class name starts every generated DTO and OpenAPI component name, so each route has its own; the decorators read it, so it comes first.
		Object.defineProperty(E2eIamAuditController, "name", { value: `E2eIamAudit${name[0]?.toUpperCase() ?? ""}${name.slice(1)}Controller` });
		ApiControllerSecurable()(E2eIamAuditController);
		ApiController<E2eIamAuditItemEntity>({
			authorization: authorization as never,
			entity: entity as never,
			name: `E2eIamAudit${name}`,
			path: `iam-audit/${name}`,
			routes: {
				[EApiRouteType.CREATE]: off,
				[EApiRouteType.DELETE]: off,
				[EApiRouteType.GET]: hasRead ? { security: { authentication } } : off,
				[EApiRouteType.GET_LIST]: isCounter
					? {
							request: { [EApiControllerRequestTarget.QUERY]: { order: { defaultOrder: [{ direction: EFilterOrderDirection.ASC, field: "rank" }], fields: { rank: { isEnabled: true } }, tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }], unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT }, pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR } } },
							security: { authentication },
						}
					: { security: { authentication } },
				[EApiRouteType.PARTIAL_UPDATE]: off,
				[EApiRouteType.UPDATE]: off,
			} as never,
		})(E2eIamAuditController);

		return { authorization, controller: E2eIamAuditController, entity, url: `/iam-audit/${name}` };
	};

	const routes: Record<string, IE2eIamAuditRoute> = { items: createRoute("items", "id", true), tenant: createRoute("tenant", "tenant", false) };

	// A cursor list runs on PostgreSQL only.
	if (database === "postgres") {
		routes.counter = createRoute("counter", "id", false);
	}

	for (const field of E2E_IAM_AUDIT_TYPED_FIELDS) {
		routes[field] = createRoute(field, field, false);
	}

	return { counter: E2eIamAuditCounterEntity, counterService: E2eIamAuditCounterService, item: E2eIamAuditItemEntity, itemService: E2eIamAuditItemService, routes: routes as IE2eIamAuditFixture["routes"] };
}
