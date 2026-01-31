import "reflect-metadata";

import { ApiPropertyDescribe, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType } from "../../../dist/esm/index";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

import { E2E_OWNER_ID } from "./constants";
import { E2eOwnerEntity } from "./owner/entity";

@Entity("e2e_entities")
export class E2eEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "id",
		exampleValue: "item-1",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "name",
		exampleValue: "Item",
		format: EApiPropertyStringType.STRING,
		maxLength: 100,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public name!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "ownerId",
		exampleValue: E2E_OWNER_ID,
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public ownerId!: string;

	@ManyToOne(() => E2eOwnerEntity)
	@JoinColumn({ name: "ownerId" })
	@ApiPropertyDescribe({
		description: "owner",
		relationMetadata: {
			entity: E2eOwnerEntity,
			isEager: false,
			relationType: "many-to-one",
		},
		type: EApiPropertyDescribeType.RELATION,
	} as unknown as { description: string; type: EApiPropertyDescribeType.RELATION })
	public owner!: E2eOwnerEntity;

	@Column({ type: "int" })
	@ApiPropertyDescribe({
		description: "count",
		exampleValue: 1,
		format: EApiPropertyNumberType.INTEGER,
		maximum: 100,
		minimum: 0,
		multipleOf: 1,
		type: EApiPropertyDescribeType.NUMBER,
	})
	public count!: number;

	@Column({ type: "varchar", nullable: true, unique: true })
	@ApiPropertyDescribe({
		description: "code",
		exampleValue: "code-1",
		format: EApiPropertyStringType.STRING,
		isNullable: true,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public code?: string;

	@Column({ type: "boolean", nullable: true })
	@ApiPropertyDescribe({
		description: "isActive",
		isNullable: true,
		type: EApiPropertyDescribeType.BOOLEAN,
	})
	public isActive?: boolean;

	@Column({ type: "datetime", nullable: true })
	@ApiPropertyDescribe({
		format: EApiPropertyDateType.DATE_TIME,
		identifier: EApiPropertyDateIdentifier.CREATED_AT,
		isNullable: true,
		type: EApiPropertyDescribeType.DATE,
	})
	public createdAt?: Date;

	@Column({ type: "varchar", nullable: true })
	@ApiPropertyDescribe({
		description: "signature",
		exampleValue: "sig-1",
		format: EApiPropertyStringType.STRING,
		maxLength: 128,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public signature?: string;

	@Column({ type: "varchar", nullable: true })
	@ApiPropertyDescribe({
		description: "timestamp",
		exampleValue: "1700000000",
		format: EApiPropertyStringType.STRING,
		maxLength: 32,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public timestamp?: string;

	@Column({ type: "varchar", nullable: true })
	@ApiPropertyDescribe({
		description: "userAgent",
		exampleValue: "e2e-agent",
		format: EApiPropertyStringType.STRING,
		maxLength: 255,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public userAgent?: string;

	@Column({ type: "varchar", nullable: true })
	@ApiPropertyDescribe({
		description: "requestIp",
		exampleValue: "127.0.0.1",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public requestIp?: string;

	@Column({ type: "simple-json", nullable: true })
	@ApiPropertyDescribe({
		dataType: Object,
		description: "authorizedEntity",
		type: EApiPropertyDescribeType.OBJECT,
	})
	public authorizedEntity?: Record<string, unknown>;

	@Column({ type: "varchar", nullable: true })
	@ApiPropertyDescribe({
		description: "responseSignature",
		exampleValue: "sig-1",
		format: EApiPropertyStringType.STRING,
		isNullable: true,
		maxLength: 128,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public responseSignature?: string;

	@Column({ type: "varchar", nullable: true })
	@ApiPropertyDescribe({
		description: "policySubjectId",
		exampleValue: E2E_OWNER_ID,
		format: EApiPropertyStringType.STRING,
		isNullable: true,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public policySubjectId?: string;

	@Column({ type: "simple-json", nullable: true })
	@ApiPropertyDescribe({
		dataType: Object,
		description: "policyPermissions",
		isNullable: true,
		type: EApiPropertyDescribeType.OBJECT,
	})
	public policyPermissions?: Array<string>;
}
