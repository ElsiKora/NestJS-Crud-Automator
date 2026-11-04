import type { IApiAuthorizationIamColumn } from "@interface/class/api/authorization";

import { EApiAuthorizationIamColumnFamily } from "@enum/class/authorization";
import { AuthorizationIamReadQueryField } from "@utility/authorization/iam-query-field.utility";
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn, VersionColumn } from "typeorm";
import { describe, expect, it } from "vitest";

@Entity("iam_query_field_owners")
class IamQueryFieldOwnerEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@Column({ type: "decimal" })
	public balance!: string;
}

@Entity("iam_query_field_items")
class IamQueryFieldItemEntity {
	@Column({ collation: "und-x-icu", type: "varchar" })
	public collated!: string;

	@CreateDateColumn()
	public createdAt!: Date;

	@Column({ type: "jsonb" })
	public document!: Record<string, unknown>;

	@Column({ type: "enum", enum: ["a", "b"] })
	public grade!: string;

	@PrimaryGeneratedColumn()
	public id!: number;

	@Column({ type: "boolean" })
	public isActive!: boolean;

	@Column({ nullable: true, type: "text" })
	public note!: null | string;

	@ManyToOne(() => IamQueryFieldOwnerEntity, { nullable: true })
	public owner!: IamQueryFieldOwnerEntity | null;

	@Column()
	public plainNumber!: number;

	@Column()
	public plainText!: string;

	@Column({ array: true, type: "varchar" })
	public tags!: Array<string>;

	@Column({ type: "simple-array" })
	public tokens!: Array<string>;

	@Column({ transformer: { from: (value: string): string => value, to: (value: string): string => value }, type: "varchar" })
	public transformed!: string;

	@VersionColumn()
	public version!: number;

	@Column({ type: "timestamptz" })
	public visitedAt!: Date;
}

@Entity("iam_query_field_codes")
class IamQueryFieldCodeEntity {
	@PrimaryColumn({ type: "char", length: 4 })
	public code!: string;
}

const readColumn = (entity: object, queryPath: string): IApiAuthorizationIamColumn | undefined => AuthorizationIamReadQueryField(entity, queryPath).column;

describe("AuthorizationIamReadQueryField column metadata", () => {
	it.each([
		["plainText", EApiAuthorizationIamColumnFamily.TEXT, undefined],
		["note", EApiAuthorizationIamColumnFamily.TEXT, "text"],
		["plainNumber", EApiAuthorizationIamColumnFamily.NUMERIC, undefined],
		["id", EApiAuthorizationIamColumnFamily.NUMERIC, undefined],
		["createdAt", EApiAuthorizationIamColumnFamily.DATE, undefined],
		["version", EApiAuthorizationIamColumnFamily.NUMERIC, undefined],
		["visitedAt", EApiAuthorizationIamColumnFamily.DATE, "timestamptz"],
		["document", EApiAuthorizationIamColumnFamily.JSON, "jsonb"],
		["grade", EApiAuthorizationIamColumnFamily.ENUM, "enum"],
		["isActive", EApiAuthorizationIamColumnFamily.BOOLEAN, "boolean"],
		["tags", EApiAuthorizationIamColumnFamily.ARRAY, "varchar"],
		["tokens", EApiAuthorizationIamColumnFamily.ARRAY, "simple-array"],
		["owner.id", EApiAuthorizationIamColumnFamily.UUID, "uuid"],
		["owner.balance", EApiAuthorizationIamColumnFamily.NUMERIC, "decimal"],
	])("reads the %s column as %s", (queryPath: string, family: EApiAuthorizationIamColumnFamily, type: string | undefined) => {
		const column: IApiAuthorizationIamColumn | undefined = readColumn(IamQueryFieldItemEntity, queryPath);

		expect(column?.family).toBe(family);
		expect(column?.type).toBe(type);
	});

	it("reads nullability, primary columns, lists, JSON, collations and transformers", () => {
		expect(readColumn(IamQueryFieldItemEntity, "note")).toMatchObject({ isNullable: true, isPrimary: false });
		expect(readColumn(IamQueryFieldItemEntity, "plainText")).toMatchObject({ hasTransformer: false, isArray: false, isJson: false, isNullable: false });
		expect(readColumn(IamQueryFieldItemEntity, "id")).toMatchObject({ isNullable: false, isPrimary: true });
		expect(readColumn(IamQueryFieldItemEntity, "tags")).toMatchObject({ isArray: true });
		expect(readColumn(IamQueryFieldItemEntity, "document")).toMatchObject({ isJson: true });
		expect(readColumn(IamQueryFieldItemEntity, "collated")).toMatchObject({ collation: "und-x-icu" });
		expect(readColumn(IamQueryFieldItemEntity, "transformed")).toMatchObject({ hasTransformer: true });
		expect(readColumn(IamQueryFieldCodeEntity, "code")).toMatchObject({ family: EApiAuthorizationIamColumnFamily.TEXT, isPrimary: true, type: "char" });
	});

	it("reads no column for a path that is not resolvable", () => {
		expect(readColumn(IamQueryFieldItemEntity, "owner")).toBeUndefined();
		expect(readColumn(IamQueryFieldItemEntity, "missing")).toBeUndefined();
	});
});
