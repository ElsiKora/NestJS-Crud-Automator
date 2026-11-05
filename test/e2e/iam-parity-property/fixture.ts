import "reflect-metadata";

import type { ExecutionContext } from "@nestjs/common";
import type { IE2eIamParityDefinition } from "./generator";
import type { IE2eIamParityItem, IE2eIamParityNote, IE2eIamParityOwner } from "./rows";

import { Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Column, DeleteDateColumn, Entity, ManyToOne, OneToMany, PrimaryColumn, Repository } from "typeorm";

import { ApiController, ApiControllerSecurable, ApiPropertyDescribe, ApiService, ApiServiceBase, EApiAuthenticationType, EApiAuthorizationMode, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../../src/index";

import { E2E_IAM_PARITY_DEFINITIONS, readE2eIamParityNamespace } from "./generator";
import { E2E_IAM_PARITY_USER } from "./rows";

export type TE2eIamParityDatabase = "mariadb" | "mysql" | "postgres" | "sqlite";

export interface IE2eIamParityRoute {
	authorization: unknown;
	controller: new () => unknown;
	definition: IE2eIamParityDefinition;
	url: string;
}

export interface IE2eIamParityFixture {
	item: new () => IE2eIamParityItem;
	note: new () => IE2eIamParityNote;
	owner: new () => IE2eIamParityOwner;
	routes: ReadonlyArray<IE2eIamParityRoute>;
	service: new () => { repository: Repository<IE2eIamParityItem> };
}

interface IE2eIamParityColumnTypes {
	// A column of the IP family on PostgreSQL, and text on the others, which have no such type.
	address: { length?: number; type: "inet" | "varchar" };
	// An instant on PostgreSQL and SQLite, and a wall clock on MySQL and MariaDB.
	occurredAt: { precision?: number; type: "datetime" | "timestamptz" };
	ratio: "double precision" | "double";
	// Single precision: `real` is a double on MySQL and MariaDB.
	single: "float" | "real";
}

const TEXT_COLUMN: { length: number; type: "varchar" } = { length: 64, type: "varchar" };
const MYSQL_COLUMN_TYPES: IE2eIamParityColumnTypes = { address: TEXT_COLUMN, occurredAt: { precision: 6, type: "datetime" }, ratio: "double", single: "float" };

const COLUMN_TYPES: Record<TE2eIamParityDatabase, IE2eIamParityColumnTypes> = {
	mariadb: MYSQL_COLUMN_TYPES,
	mysql: MYSQL_COLUMN_TYPES,
	postgres: { address: { type: "inet" }, occurredAt: { type: "timestamptz" }, ratio: "double precision", single: "real" },
	sqlite: { address: TEXT_COLUMN, occurredAt: { type: "datetime" }, ratio: "double", single: "real" },
};

// `resource.*` keys and the query paths they read, on the row and on its owner, whose row may be absent.
const FIELDS: ReadonlyArray<[string, string]> = [
	["address", "address"],
	["amount", "amount"],
	["arn", "arn"],
	["big", "big"],
	["coded", "coded"],
	["day", "day"],
	["id", "id"],
	["isActive", "isActive"],
	["kind", "kind"],
	["label", "label"],
	["note", "note"],
	["occurredAt", "occurredAt"],
	["operatorId", "operatorId"],
	["ownerActive", "owner.isActive"],
	["ownerArn", "owner.arn"],
	["ownerAt", "owner.occurredAt"],
	["ownerLabel", "owner.label"],
	["ownerRank", "owner.rank"],
	["rank", "rank"],
	["ratio", "ratio"],
	["single", "single"],
	// Columns of the related rows of a `OneToMany`; `noteCoded` has a transformer, which no subquery reads exactly.
	["noteActive", "notes.isActive"],
	["noteAt", "notes.occurredAt"],
	["noteCoded", "notes.coded"],
	["noteDay", "notes.day"],
	["noteScore", "notes.score"],
	["noteText", "notes.text"],
];

// A column whose stored text differs from what the entity holds.
const CODED_TRANSFORMER: { from: (value: null | string) => null | string; to: (value: null | string | undefined) => null | string | undefined } = {
	from: (value: null | string): null | string => (value === null ? null : value.replace(/^x-/, "")),
	to: (value: null | string | undefined): null | string | undefined => (typeof value === "string" ? `x-${value}` : value),
};

/**
 * Authenticates every request as the one test user.
 */
@Injectable()
export class E2eIamParityGuard {
	public canActivate(context: ExecutionContext): boolean {
		context.switchToHttp().getRequest<{ user?: unknown }>().user = E2E_IAM_PARITY_USER;

		return true;
	}
}

const authentication = { guard: E2eIamParityGuard, type: EApiAuthenticationType.USER } as never;

/**
 * Declares the tables and routes of one database: one entity, with an owner and soft-deletable related rows through a
 * `OneToMany`, and one list route per resource path over it. Only the path of `{id}` has a read route.
 * @param {TE2eIamParityDatabase} database - Database under test.
 * @returns {IE2eIamParityFixture} Entities, service and routes of that database.
 */
export function createE2eIamParityFixture(database: TE2eIamParityDatabase): IE2eIamParityFixture {
	const types: IE2eIamParityColumnTypes = COLUMN_TYPES[database];

	@Entity("e2e_iam_parity_owners")
	class E2eIamParityOwnerEntity implements IE2eIamParityOwner {
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

	@Entity("e2e_iam_parity_items")
	class E2eIamParityItemEntity implements IE2eIamParityItem {
		@Column({ nullable: true, ...types.address })
		public address?: null | string;

		@Column({ nullable: true, precision: 30, scale: 10, type: "decimal" })
		public amount?: null | number | string;

		@Column({ length: 128, nullable: true, type: "varchar" })
		public arn?: null | string;

		@Column({ nullable: true, type: "bigint" })
		public big?: null | number | string;

		@Column({ length: 64, nullable: true, transformer: CODED_TRANSFORMER, type: "varchar" })
		public coded?: null | string;

		@Column({ nullable: true, type: "date" })
		public day?: null | string;

		@ApiPropertyDescribe({ description: "id", exampleValue: "a", format: EApiPropertyStringType.STRING, maxLength: 36, minLength: 0, pattern: "/^[\\s\\S]*$/", type: EApiPropertyDescribeType.STRING })
		@PrimaryColumn({ length: 36, type: "varchar" })
		public id!: string;

		@Column({ nullable: true, type: "boolean" })
		public isActive?: boolean | null;

		// An enum column: PostgreSQL refuses a value it does not declare instead of comparing it.
		@Column({ enum: ["alpha", "beta"], nullable: true, type: "simple-enum" })
		public kind?: null | string;

		@Column({ length: 64, type: "varchar" })
		public label!: string;

		@Column({ length: 64, nullable: true, type: "varchar" })
		public note?: null | string;

		@OneToMany(() => E2eIamParityNoteEntity, (note: E2eIamParityNoteEntity) => note.item)
		public notes?: Array<E2eIamParityNoteEntity>;

		@Column({ nullable: true, ...types.occurredAt })
		public occurredAt?: Date | null;

		// PostgreSQL refuses text that is no UUID and reads other spellings as the lower-case one.
		@Column({ nullable: true, type: "uuid" })
		public operatorId?: null | string;

		@ManyToOne(() => E2eIamParityOwnerEntity, { nullable: true })
		public owner?: E2eIamParityOwnerEntity | null;

		@Column({ nullable: true, type: "int" })
		public rank?: null | number;

		@Column({ nullable: true, type: types.ratio })
		public ratio?: null | number;

		@Column({ nullable: true, type: types.single })
		public single?: null | number;
	}

	// A related row, which can be soft-deleted.
	@Entity("e2e_iam_parity_notes")
	class E2eIamParityNoteEntity implements IE2eIamParityNote {
		@Column({ length: 64, nullable: true, transformer: CODED_TRANSFORMER, type: "varchar" })
		public coded?: null | string;

		@Column({ nullable: true, type: "date" })
		public day?: null | string;

		@DeleteDateColumn({ nullable: true })
		public deletedAt?: Date | null;

		@PrimaryColumn({ length: 36, type: "varchar" })
		public id!: string;

		@Column({ nullable: true, type: "boolean" })
		public isActive?: boolean | null;

		@ManyToOne(() => E2eIamParityItemEntity, (item: E2eIamParityItemEntity) => item.notes)
		public item?: E2eIamParityItemEntity;

		@Column({ nullable: true, ...types.occurredAt })
		public occurredAt?: Date | null;

		@Column({ nullable: true, type: "int" })
		public score?: null | number;

		@Column({ length: 64, nullable: true, type: "varchar" })
		public text?: null | string;
	}

	@Injectable()
	@ApiService({ entity: E2eIamParityItemEntity })
	class E2eIamParityItemService extends ApiServiceBase<E2eIamParityItemEntity> {
		@InjectRepository(E2eIamParityItemEntity)
		public readonly repository!: Repository<E2eIamParityItemEntity>;
	}

	const routes: Array<IE2eIamParityRoute> = E2E_IAM_PARITY_DEFINITIONS.map((definition: IE2eIamParityDefinition): IE2eIamParityRoute => {
		// Validation reads every controller of a namespace in the process, so each database has its own.
		const namespace: string = readE2eIamParityNamespace(definition, database);

		const authorization: unknown = {
			defaultMode: EApiAuthorizationMode.IAM,
			policyNamespace: namespace,
			resourceDefinition: {
				entity: E2eIamParityItemEntity,
				fields: FIELDS.map(([path, queryPath]: [string, string]) => ({ isFilterable: true, path: `resource.${path}`, queryPath })),
				namespace,
				resourcePath: `${namespace}${definition.path}`,
				resourceType: namespace,
			},
		};

		class E2eIamParityController {
			@Inject(E2eIamParityItemService)
			public readonly service!: E2eIamParityItemService;
		}

		// The class name starts every generated DTO and OpenAPI component name, so each route has its own; the decorators read it, so it comes first.
		Object.defineProperty(E2eIamParityController, "name", { value: `E2eIamParity${definition.name[0]?.toUpperCase() ?? ""}${definition.name.slice(1)}Controller` });
		ApiControllerSecurable()(E2eIamParityController);
		ApiController<E2eIamParityItemEntity>({
			authorization: authorization as never,
			entity: E2eIamParityItemEntity,
			name: `E2eIamParity${definition.name}`,
			path: `iam-parity/${definition.name}`,
			routes: {
				[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
				[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
				[EApiRouteType.GET]: definition.hasRead ? { security: { authentication } } : { generation: { isEnabled: false } },
				[EApiRouteType.GET_LIST]: { security: { authentication } },
				[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
				[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
			} as never,
		})(E2eIamParityController);

		return { authorization, controller: E2eIamParityController, definition, url: `/iam-parity/${definition.name}` };
	});

	return { item: E2eIamParityItemEntity, note: E2eIamParityNoteEntity, owner: E2eIamParityOwnerEntity, routes, service: E2eIamParityItemService };
}
