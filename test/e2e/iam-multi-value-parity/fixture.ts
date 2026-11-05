import "reflect-metadata";

import type { ExecutionContext } from "@nestjs/common";

import { Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Column, DeleteDateColumn, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryColumn, Repository } from "typeorm";

import { ApiController, ApiControllerSecurable, ApiPropertyDescribe, ApiService, ApiServiceBase, EApiAuthenticationType, EApiAuthorizationMode, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../../src/index";

export type TE2eIamMultiDatabase = "mariadb" | "mysql" | "postgres" | "sqlite";

export interface IE2eIamMultiColumnTypes {
	// A column of the IP family on PostgreSQL, and text on the others, which have no such type.
	address: { length?: number; type: "inet" | "varchar" };
	// An instant on PostgreSQL and SQLite, and a wall clock in whole seconds on MySQL and MariaDB.
	occurredAt: "datetime" | "timestamptz";
}

export interface IE2eIamMultiRow {
	id: string;
}

export interface IE2eIamMultiFixture {
	authorization: unknown;
	controller: new () => unknown;
	entities: {
		group: new () => unknown;
		item: new () => IE2eIamMultiRow;
		note: new () => unknown;
		softNote: new () => unknown;
		tag: new () => unknown;
	};
	namespace: string;
	service: new () => { repository: Repository<IE2eIamMultiRow> };
}

const TEXT_COLUMN: { length: number; type: "varchar" } = { length: 64, type: "varchar" };

const COLUMN_TYPES: Record<TE2eIamMultiDatabase, IE2eIamMultiColumnTypes> = {
	mariadb: { address: TEXT_COLUMN, occurredAt: "datetime" },
	mysql: { address: TEXT_COLUMN, occurredAt: "datetime" },
	postgres: { address: { type: "inet" }, occurredAt: "timestamptz" },
	sqlite: { address: TEXT_COLUMN, occurredAt: "datetime" },
};

// The one user: its attributes feed the variables and the context keys of a case.
export const E2E_IAM_MULTI_USER: Record<string, unknown> = { color: "red", id: "user-1", malformed: ["admin", { nested: true }], roles: ["admin", "dev"], teams: ["core", "ops"] };

// Fields of the item table, and fields of its to-many relations.
const FIELDS: ReadonlyArray<[string, string]> = [
	["address", "address"],
	["groupName", "groups.name"],
	["id", "id"],
	["isActive", "isActive"],
	["label", "label"],
	["noteActive", "notes.isActive"],
	["noteAddress", "notes.address"],
	["noteAt", "notes.occurredAt"],
	["noteScore", "notes.score"],
	["noteText", "notes.text"],
	["occurredAt", "occurredAt"],
	["rank", "rank"],
	["softText", "softNotes.text"],
	["tagName", "tags.name"],
];

/**
 * Authenticates every request as the one test user.
 */
@Injectable()
class E2eIamMultiGuard {
	public canActivate(context: ExecutionContext): boolean {
		context.switchToHttp().getRequest<{ user?: unknown }>().user = E2E_IAM_MULTI_USER;

		return true;
	}
}

export { E2eIamMultiGuard };

/**
 * Declares the tables and the routes of one database. An item has related rows through a `OneToMany`, the owner side of
 * a `ManyToMany`, the inverse side of another, and a `OneToMany` onto a soft-deletable entity.
 * @param {TE2eIamMultiDatabase} database - Database under test.
 * @returns {IE2eIamMultiFixture} Entities, service, controller and authorization of that database.
 */
export function createE2eIamMultiFixture(database: TE2eIamMultiDatabase): IE2eIamMultiFixture {
	const types: IE2eIamMultiColumnTypes = COLUMN_TYPES[database];
	// Validation reads every controller of a namespace in the process, so each database has its own.
	const namespace: string = `mlt${database}:item`;

	@Entity("e2e_iam_multi_items")
	class E2eIamMultiItemEntity implements IE2eIamMultiRow {
		@Column({ nullable: true, ...types.address })
		public address?: null | string;

		@ManyToMany(() => E2eIamMultiGroupEntity, (group: E2eIamMultiGroupEntity) => group.items)
		public groups?: Array<E2eIamMultiGroupEntity>;

		@ApiPropertyDescribe({ description: "id", exampleValue: "a", format: EApiPropertyStringType.STRING, maxLength: 36, minLength: 0, pattern: "/^.*$/", type: EApiPropertyDescribeType.STRING })
		@PrimaryColumn({ length: 36, type: "varchar" })
		public id!: string;

		@Column({ nullable: true, type: "boolean" })
		public isActive?: boolean | null;

		@Column({ length: 64, nullable: true, type: "varchar" })
		public label?: null | string;

		@OneToMany(() => E2eIamMultiNoteEntity, (note: E2eIamMultiNoteEntity) => note.item)
		public notes?: Array<E2eIamMultiNoteEntity>;

		@Column({ nullable: true, type: types.occurredAt })
		public occurredAt?: Date | null;

		@Column({ nullable: true, type: "int" })
		public rank?: null | number;

		@OneToMany(() => E2eIamMultiSoftNoteEntity, (note: E2eIamMultiSoftNoteEntity) => note.item)
		public softNotes?: Array<E2eIamMultiSoftNoteEntity>;

		@JoinTable({ name: "e2e_iam_multi_item_tags" })
		@ManyToMany(() => E2eIamMultiTagEntity)
		public tags?: Array<E2eIamMultiTagEntity>;
	}

	@Entity("e2e_iam_multi_notes")
	class E2eIamMultiNoteEntity {
		@Column({ nullable: true, ...types.address })
		public address?: null | string;

		@PrimaryColumn({ length: 36, type: "varchar" })
		public id!: string;

		@Column({ nullable: true, type: "boolean" })
		public isActive?: boolean | null;

		@ManyToOne(() => E2eIamMultiItemEntity, (item: E2eIamMultiItemEntity) => item.notes)
		public item?: E2eIamMultiItemEntity;

		@Column({ nullable: true, type: types.occurredAt })
		public occurredAt?: Date | null;

		@Column({ nullable: true, type: "int" })
		public score?: null | number;

		@Column({ length: 64, nullable: true, type: "varchar" })
		public text?: null | string;
	}

	@Entity("e2e_iam_multi_soft_notes")
	class E2eIamMultiSoftNoteEntity {
		@DeleteDateColumn({ nullable: true })
		public deletedAt?: Date | null;

		@PrimaryColumn({ length: 36, type: "varchar" })
		public id!: string;

		@ManyToOne(() => E2eIamMultiItemEntity, (item: E2eIamMultiItemEntity) => item.softNotes)
		public item?: E2eIamMultiItemEntity;

		@Column({ length: 64, nullable: true, type: "varchar" })
		public text?: null | string;
	}

	@Entity("e2e_iam_multi_tags")
	class E2eIamMultiTagEntity {
		@PrimaryColumn({ length: 36, type: "varchar" })
		public id!: string;

		@Column({ length: 64, nullable: true, type: "varchar" })
		public name?: null | string;
	}

	@Entity("e2e_iam_multi_groups")
	class E2eIamMultiGroupEntity {
		@PrimaryColumn({ length: 36, type: "varchar" })
		public id!: string;

		@JoinTable({ name: "e2e_iam_multi_group_items" })
		@ManyToMany(() => E2eIamMultiItemEntity, (item: E2eIamMultiItemEntity) => item.groups)
		public items?: Array<E2eIamMultiItemEntity>;

		@Column({ length: 64, nullable: true, type: "varchar" })
		public name?: null | string;
	}

	const authorization: unknown = {
		defaultMode: EApiAuthorizationMode.IAM,
		policyNamespace: namespace,
		resourceDefinition: {
			entity: E2eIamMultiItemEntity,
			fields: FIELDS.map(([path, queryPath]: [string, string]) => ({ isFilterable: true, path: `resource.${path}`, queryPath })),
			namespace,
			resourcePath: `${namespace}/{id}`,
			resourceType: namespace,
		},
	};

	@Injectable()
	@ApiService({ entity: E2eIamMultiItemEntity })
	class E2eIamMultiItemService extends ApiServiceBase<E2eIamMultiItemEntity> {
		@InjectRepository(E2eIamMultiItemEntity)
		public readonly repository!: Repository<E2eIamMultiItemEntity>;
	}

	const authentication: { guard: typeof E2eIamMultiGuard; type: EApiAuthenticationType } = { guard: E2eIamMultiGuard, type: EApiAuthenticationType.USER };

	@ApiControllerSecurable()
	@ApiController<E2eIamMultiItemEntity>({
		authorization: authorization as never,
		entity: E2eIamMultiItemEntity,
		name: "E2eIamMultiItems",
		path: "iam-multi/items",
		routes: {
			[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
			[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
			[EApiRouteType.GET]: { security: { authentication } },
			[EApiRouteType.GET_LIST]: { security: { authentication } },
			[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
			[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
		} as never,
	})
	class E2eIamMultiItemController {
		@Inject(E2eIamMultiItemService)
		public readonly service!: E2eIamMultiItemService;
	}

	return {
		authorization,
		controller: E2eIamMultiItemController,
		entities: { group: E2eIamMultiGroupEntity, item: E2eIamMultiItemEntity, note: E2eIamMultiNoteEntity, softNote: E2eIamMultiSoftNoteEntity, tag: E2eIamMultiTagEntity },
		namespace,
		service: E2eIamMultiItemService as never,
	};
}
