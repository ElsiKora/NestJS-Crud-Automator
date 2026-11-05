import type { IApiAuthorizationIamDialect, IApiAuthorizationPrincipal, IApiAuthorizationResourceDefinition, IApiPolicyStatement } from "@interface/class/api/authorization";
import type { DataSourceOptions, FindOptionsWhere } from "typeorm";

import { ApiAuthorizationIamQueryPlanner } from "@class/api/authorization/iam";
import { EApiAuthorizationIamDialect, EApiAuthorizationPrincipalType, EApiPolicyEffect } from "@enum/class/authorization";
import { Column, CreateDateColumn, DataSource, DeleteDateColumn, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";
import { beforeAll, describe, expect, it } from "vitest";

@Entity("pin_notes")
class PinNoteEntity {
	@CreateDateColumn()
	public at!: Date;

	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@Column({ type: "boolean" })
	public isFlagged!: boolean;

	@ManyToOne(() => PinItemEntity, (item: PinItemEntity) => item.notes)
	public item!: unknown;

	@Column({ type: "int" })
	public rank!: number;

	@Column({ name: "note_text", nullable: true, type: "varchar" })
	public text!: null | string;
}

@Entity("pin_soft_notes")
class PinSoftNoteEntity {
	@DeleteDateColumn({ name: "deleted_at" })
	public deletedAt!: Date | null;

	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@ManyToOne(() => PinItemEntity, (item: PinItemEntity) => item.softNotes)
	public item!: unknown;

	@Column({ nullable: true, type: "varchar" })
	public text!: null | string;
}

@Entity("pin_tags")
class PinTagEntity {
	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@Column({ nullable: true, type: "varchar" })
	public name!: null | string;
}

@Entity("pin_groups")
class PinGroupEntity {
	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@JoinTable({ name: "pin_group_items" })
	@ManyToMany(() => PinItemEntity, (item: PinItemEntity) => item.groups)
	public items!: Array<unknown>;

	@Column({ nullable: true, type: "varchar" })
	public name!: null | string;
}

@Entity("pin_items")
class PinItemEntity {
	@ManyToMany(() => PinGroupEntity, (group: PinGroupEntity) => group.items)
	public groups!: Array<PinGroupEntity>;

	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@OneToMany(() => PinNoteEntity, (note: PinNoteEntity) => note.item)
	public notes!: Array<PinNoteEntity>;

	@OneToMany(() => PinSoftNoteEntity, (note: PinSoftNoteEntity) => note.item)
	public softNotes!: Array<PinSoftNoteEntity>;

	@Column({ nullable: true, type: "varchar" })
	public status!: null | string;

	@JoinTable({ name: "pin_item_tags" })
	@ManyToMany(() => PinTagEntity)
	public tags!: Array<PinTagEntity>;
}

const ENTITIES: Array<new () => unknown> = [PinGroupEntity, PinItemEntity, PinNoteEntity, PinSoftNoteEntity, PinTagEntity];

const RESOURCE_DEFINITION: IApiAuthorizationResourceDefinition<PinItemEntity> = {
	entity: PinItemEntity,
	fields: [
		{ isFilterable: true, path: "resource.groupName", queryPath: "groups.name" },
		{ isFilterable: true, path: "resource.noteAt", queryPath: "notes.at" },
		{ isFilterable: true, path: "resource.noteFlagged", queryPath: "notes.isFlagged" },
		{ isFilterable: true, path: "resource.noteRank", queryPath: "notes.rank" },
		{ isFilterable: true, path: "resource.noteText", queryPath: "notes.text" },
		{ isFilterable: true, path: "resource.softNoteText", queryPath: "softNotes.text" },
		{ isFilterable: true, path: "resource.status", queryPath: "status" },
		{ isFilterable: true, path: "resource.tagName", queryPath: "tags.name" },
	],
	namespace: "pin:item",
	resourcePath: "pin:item/{id}",
	resourceType: "pin:item",
};

const PRINCIPAL: IApiAuthorizationPrincipal = { attributes: {}, claims: {}, id: "user-1", roles: [], type: EApiAuthorizationPrincipalType.USER };

// Every key shape the predicate builder lowers through a to-many relation, and one plain column for the keyset merge.
const CONDITIONS: ReadonlyArray<Record<string, Record<string, unknown>>> = [
	{ "ForAnyValue:StringEquals": { "resource.noteText": "a" } },
	{ "ForAnyValue:StringEquals": { "resource.noteText": ["a", "b"] } },
	{ "ForAllValues:StringEquals": { "resource.noteText": "a" } },
	{ "ForAnyValue:StringNotEquals": { "resource.noteText": "a" } },
	{ "ForAllValues:StringNotEquals": { "resource.noteText": ["a", "b"] } },
	{ "ForAnyValue:StringEqualsIfExists": { "resource.noteText": "a" } },
	{ "ForAllValues:StringEqualsIfExists": { "resource.noteText": "a" } },
	{ "ForAnyValue:StringEqualsIgnoreCase": { "resource.noteText": "a" } },
	{ "ForAnyValue:StringLike": { "resource.noteText": "a*" } },
	{ "ForAllValues:StringLike": { "resource.noteText": "a?b" } },
	{ "ForAnyValue:NumericEquals": { "resource.noteRank": 7 } },
	{ "ForAnyValue:NumericGreaterThan": { "resource.noteRank": 7 } },
	{ "ForAllValues:NumericLessThanEquals": { "resource.noteRank": 7 } },
	{ "ForAnyValue:DateGreaterThan": { "resource.noteAt": "2026-01-02T03:04:05.000Z" } },
	{ "ForAnyValue:Bool": { "resource.noteFlagged": "true" } },
	{ "ForAnyValue:StringEquals": { "resource.softNoteText": "a" } },
	{ "ForAllValues:StringEquals": { "resource.softNoteText": "a" } },
	{ "ForAnyValue:StringEquals": { "resource.tagName": "a" } },
	{ "ForAllValues:StringNotEquals": { "resource.tagName": "a" } },
	{ "ForAnyValue:StringEquals": { "resource.groupName": "a" } },
	{ "ForAnyValue:StringEquals": { "resource.noteText": "a", "resource.tagName": "b" } },
	{ StringEquals: { "resource.status": "open" }, "ForAnyValue:StringEquals": { "resource.softNoteText": "a" } },
];

const createDataSource = async (options: Record<string, unknown>): Promise<DataSource> => {
	const dataSource: DataSource = new DataSource({ ...options, entities: ENTITIES } as unknown as DataSourceOptions);

	await (dataSource as unknown as { buildMetadatas: () => Promise<void> }).buildMetadatas();

	return dataSource;
};

const createStatement = (effect: EApiPolicyEffect, condition: Record<string, Record<string, unknown>>): IApiPolicyStatement => ({ Action: ["pin:item:list"], Condition: condition, Effect: effect, Resource: ["*"] }) as unknown as IApiPolicyStatement;

const render = (dataSource: DataSource, where: unknown): unknown => {
	const [sql, parameters]: [string, Array<unknown>] = dataSource
		.getRepository(PinItemEntity)
		.createQueryBuilder()
		.setFindOptions({ where: where as FindOptionsWhere<PinItemEntity> })
		.getQueryAndParameters();

	return { parameters, sql };
};

describe("IAM to-many SQL stays byte-identical on every dialect", () => {
	const dialects: Array<{ dataSource?: DataSource; dialect: IApiAuthorizationIamDialect; name: string; options: Record<string, unknown> }> = [
		{ dialect: { driverType: "postgres", type: EApiAuthorizationIamDialect.POSTGRES }, name: "postgres", options: { database: "pin", type: "postgres" } },
		{ dialect: { binaryCollation: "utf8mb4_0900_bin", driverType: "mysql", type: EApiAuthorizationIamDialect.MYSQL, version: "8.4.2" }, name: "mysql", options: { connectorPackage: "mysql2", database: "pin", driver: { isStub: true }, type: "mysql" } },
		{ dialect: { binaryCollation: "utf8mb4_nopad_bin", driverType: "mysql", type: EApiAuthorizationIamDialect.MARIADB, version: "11.4.2-MariaDB" }, name: "mariadb", options: { connectorPackage: "mysql2", database: "pin", driver: { isStub: true }, type: "mysql" } },
		{ dialect: { driverType: "better-sqlite3", type: EApiAuthorizationIamDialect.SQLITE }, name: "sqlite", options: { database: ":memory:", type: "better-sqlite3" } },
	];

	beforeAll(async () => {
		for (const entry of dialects) {
			entry.dataSource = await createDataSource(entry.options);
		}
	});

	it.each(dialects.map((entry: (typeof dialects)[number]): string => entry.name))("pins the Allow and Deny scopes on %s", async (name: string) => {
		const entry: (typeof dialects)[number] | undefined = dialects.find((candidate: (typeof dialects)[number]): boolean => candidate.name === name);
		const dataSource: DataSource | undefined = entry?.dataSource;

		if (!entry || !dataSource) {
			throw new Error(`${name} has no DataSource`);
		}

		const dialect: IApiAuthorizationIamDialect = { ...entry.dialect, dataSource };
		const planner: ApiAuthorizationIamQueryPlanner = new ApiAuthorizationIamQueryPlanner();
		const rendered: Array<unknown> = CONDITIONS.map((condition: Record<string, Record<string, unknown>>): unknown => {
			const allow = planner.plan({ dialect, principal: PRINCIPAL, requestMetadata: {}, resourceDefinition: RESOURCE_DEFINITION, statements: [createStatement(EApiPolicyEffect.ALLOW, condition)] });
			const deny = planner.planExclusion({ dialect, exclusions: [{ statement: createStatement(EApiPolicyEffect.DENY, condition) }], principal: PRINCIPAL, requestMetadata: {}, resourceDefinition: RESOURCE_DEFINITION });

			return {
				allow: { isFullyCompilable: allow.isFullyCompilable, query: allow.scope ? render(dataSource, allow.scope.where) : undefined },
				condition,
				deny: { isFullyCompilable: deny.isFullyCompilable, query: deny.scope ? render(dataSource, deny.scope.where) : undefined },
			};
		});

		expect(rendered.length).toBe(CONDITIONS.length);
		await expect(JSON.stringify(rendered, undefined, "\t")).toMatchFileSnapshot(`./exists-sql-pin/${name}.snapshot.txt`);
	});
});
