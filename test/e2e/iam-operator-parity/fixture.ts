import "reflect-metadata";

import type { ExecutionContext } from "@nestjs/common";

import { Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Column, Entity, ManyToOne, PrimaryColumn, Repository } from "typeorm";

import { ApiController, ApiControllerSecurable, ApiPropertyDescribe, ApiService, ApiServiceBase, EApiAuthenticationType, EApiAuthorizationMode, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../../src/index";

export type TE2eIamOperatorDatabase = "mariadb" | "mysql" | "postgres" | "sqlite";

export interface IE2eIamOperatorColumnTypes {
	// A column of the IP family on PostgreSQL, and text on the others, which have no such type.
	address: { length?: number; type: "inet" | "varchar" };
	// A column of the IP family on PostgreSQL, and text on the others.
	network: { length?: number; type: "cidr" | "varchar" };
	// An instant on PostgreSQL and SQLite, and a wall clock on MySQL and MariaDB.
	occurredAt: { precision?: number; type: "datetime" | "timestamptz" };
	ratio: "double precision" | "double";
	// Whole seconds on MySQL and MariaDB, which round a bare datetime when they store it.
	secondAt: "datetime" | "timestamptz";
	// A wall clock, except on SQLite, where TypeORM writes UTC text.
	wallAt: { precision?: number; type: "datetime" | "timestamp" };
}

export interface IE2eIamOperatorOwner {
	address?: null | string;
	arn?: null | string;
	id: string;
	isActive?: boolean | null;
	label?: null | string;
	occurredAt?: Date | null;
	rank?: null | number;
}

export interface IE2eIamOperatorItem {
	address?: null | string;
	amount?: null | string;
	arn?: null | string;
	big?: null | string;
	day?: null | string;
	id: string;
	isActive?: boolean | null;
	label?: null | string;
	network?: null | string;
	occurredAt?: Date | null;
	owner?: IE2eIamOperatorOwner | null;
	rank?: null | number;
	ratio?: null | number;
	secondAt?: Date | null;
	wallAt?: Date | null;
}

export interface IE2eIamOperatorFixture {
	authorization: unknown;
	controller: new () => unknown;
	item: new () => IE2eIamOperatorItem;
	namespace: string;
	owner: new () => IE2eIamOperatorOwner;
	service: new () => { repository: Repository<IE2eIamOperatorItem> };
}

const TEXT_COLUMN: { length: number; type: "varchar" } = { length: 64, type: "varchar" };

const MYSQL_COLUMN_TYPES: IE2eIamOperatorColumnTypes = { address: TEXT_COLUMN, network: TEXT_COLUMN, occurredAt: { precision: 6, type: "datetime" }, ratio: "double", secondAt: "datetime", wallAt: { precision: 3, type: "timestamp" } };

const COLUMN_TYPES: Record<TE2eIamOperatorDatabase, IE2eIamOperatorColumnTypes> = {
	mariadb: MYSQL_COLUMN_TYPES,
	mysql: MYSQL_COLUMN_TYPES,
	postgres: { address: { type: "inet" }, network: { type: "cidr" }, occurredAt: { type: "timestamptz" }, ratio: "double precision", secondAt: "timestamptz", wallAt: { precision: 3, type: "timestamp" } },
	sqlite: { address: TEXT_COLUMN, network: TEXT_COLUMN, occurredAt: { type: "datetime" }, ratio: "double", secondAt: "datetime", wallAt: { type: "datetime" } },
};

// The one principal: its attributes feed the variables of a case.
export const E2E_IAM_OPERATOR_USER: Record<string, unknown> = { arnService: "s3", id: "user-1", isEnabled: true, name: "ann", network: "10.0.0.0/8", rank: 1, rowId: "a", since: "2024-01-01T00:00:00Z" };

// Fields of the item table, and fields of its owner, whose rows may be absent.
const FIELDS: ReadonlyArray<[string, string]> = [
	["address", "address"],
	["amount", "amount"],
	["arn", "arn"],
	["big", "big"],
	["day", "day"],
	["id", "id"],
	["isActive", "isActive"],
	["label", "label"],
	["network", "network"],
	["occurredAt", "occurredAt"],
	["ownerActive", "owner.isActive"],
	["ownerAddress", "owner.address"],
	["ownerArn", "owner.arn"],
	["ownerAt", "owner.occurredAt"],
	["ownerLabel", "owner.label"],
	["ownerRank", "owner.rank"],
	["rank", "rank"],
	["ratio", "ratio"],
	["secondAt", "secondAt"],
	["wallAt", "wallAt"],
];

/**
 * Authenticates every request as the one test user.
 */
@Injectable()
class E2eIamOperatorGuard {
	public canActivate(context: ExecutionContext): boolean {
		context.switchToHttp().getRequest<{ user?: unknown }>().user = E2E_IAM_OPERATOR_USER;

		return true;
	}
}

export { E2eIamOperatorGuard };

/**
 * Declares the tables and the list route of one database: PostgreSQL, MySQL and SQLite name their date, double and
 * network columns differently, and TypeORM refuses a type the driver does not know.
 * @param {TE2eIamOperatorDatabase} database - Database under test.
 * @returns {IE2eIamOperatorFixture} Entities, service, controller and authorization of that database.
 */
export function createE2eIamOperatorFixture(database: TE2eIamOperatorDatabase): IE2eIamOperatorFixture {
	const types: IE2eIamOperatorColumnTypes = COLUMN_TYPES[database];
	// Validation reads every controller of a namespace in the process, so each database has its own.
	const namespace: string = `opr${database}:item`;

	@Entity("e2e_iam_operator_owners")
	class E2eIamOperatorOwnerEntity implements IE2eIamOperatorOwner {
		@Column({ nullable: true, ...types.address })
		public address?: null | string;

		@Column({ length: 128, nullable: true, type: "varchar" })
		public arn?: null | string;

		@PrimaryColumn({ length: 36, type: "varchar" })
		public id!: string;

		@Column({ nullable: true, type: "boolean" })
		public isActive?: boolean | null;

		@Column({ length: 64, nullable: true, type: "varchar" })
		public label?: null | string;

		@Column({ nullable: true, ...types.occurredAt })
		public occurredAt?: Date | null;

		@Column({ nullable: true, type: "int" })
		public rank?: null | number;
	}

	@Entity("e2e_iam_operator_items")
	class E2eIamOperatorItemEntity implements IE2eIamOperatorItem {
		@Column({ nullable: true, ...types.address })
		public address?: null | string;

		@Column({ nullable: true, precision: 30, scale: 10, type: "decimal" })
		public amount?: null | string;

		@Column({ length: 128, nullable: true, type: "varchar" })
		public arn?: null | string;

		@Column({ nullable: true, type: "bigint" })
		public big?: null | string;

		@Column({ nullable: true, type: "date" })
		public day?: null | string;

		@ApiPropertyDescribe({ description: "id", exampleValue: "a", format: EApiPropertyStringType.STRING, maxLength: 36, minLength: 0, pattern: "/^.*$/", type: EApiPropertyDescribeType.STRING })
		@PrimaryColumn({ length: 36, type: "varchar" })
		public id!: string;

		@Column({ nullable: true, type: "boolean" })
		public isActive?: boolean | null;

		// Names that differ in letter case, in accents, and in the metacharacters of a LIKE, a GLOB or a regular expression.
		@Column({ length: 64, nullable: true, type: "varchar" })
		public label?: null | string;

		@Column({ nullable: true, ...types.network })
		public network?: null | string;

		@Column({ nullable: true, ...types.occurredAt })
		public occurredAt?: Date | null;

		@ManyToOne(() => E2eIamOperatorOwnerEntity, { nullable: true })
		public owner?: E2eIamOperatorOwnerEntity | null;

		@Column({ nullable: true, type: "int" })
		public rank?: null | number;

		@Column({ nullable: true, type: types.ratio })
		public ratio?: null | number;

		@Column({ nullable: true, type: types.secondAt })
		public secondAt?: Date | null;

		@Column({ nullable: true, ...types.wallAt })
		public wallAt?: Date | null;
	}

	const authorization: unknown = {
		defaultMode: EApiAuthorizationMode.IAM,
		policyNamespace: namespace,
		resourceDefinition: {
			entity: E2eIamOperatorItemEntity,
			fields: FIELDS.map(([path, queryPath]: [string, string]) => ({ isFilterable: true, path: `resource.${path}`, queryPath })),
			namespace,
			resourcePath: `${namespace}/{id}`,
			resourceType: namespace,
		},
	};

	@Injectable()
	@ApiService({ entity: E2eIamOperatorItemEntity })
	class E2eIamOperatorItemService extends ApiServiceBase<E2eIamOperatorItemEntity> {
		@InjectRepository(E2eIamOperatorItemEntity)
		public readonly repository!: Repository<E2eIamOperatorItemEntity>;
	}

	@ApiControllerSecurable()
	@ApiController<E2eIamOperatorItemEntity>({
		authorization: authorization as never,
		entity: E2eIamOperatorItemEntity,
		name: "E2eIamOperatorItems",
		path: "iam-operator/items",
		routes: {
			[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
			[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
			[EApiRouteType.GET]: { generation: { isEnabled: false } },
			[EApiRouteType.GET_LIST]: { security: { authentication: { guard: E2eIamOperatorGuard, type: EApiAuthenticationType.USER } } },
			[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
			[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
		} as never,
	})
	class E2eIamOperatorItemController {
		@Inject(E2eIamOperatorItemService)
		public readonly service!: E2eIamOperatorItemService;
	}

	return { authorization, controller: E2eIamOperatorItemController, item: E2eIamOperatorItemEntity, namespace, owner: E2eIamOperatorOwnerEntity, service: E2eIamOperatorItemService };
}
