import type { Relation } from "typeorm";

import { Column, Entity, ManyToOne, OneToMany, PrimaryColumn, TableInheritance } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType } from "../../../src/index";

import { EIntegrationDetailKind } from "./kind.enum";
import { IntegrationDetailTagItemDto } from "./tag-item.dto";
import { IntegrationDetailTagEntity } from "./tag.entity";
import { IntegrationDetailVendorEntity } from "./vendor.entity";

@Entity("sti_integration_details")
@TableInheritance({ column: { enum: EIntegrationDetailKind, enumName: "sti_integration_detail_kind", name: "kind", type: "enum" } })
export class IntegrationDetailEntity {
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	@PrimaryColumn({ type: "uuid" })
	public id!: string;

	@ApiPropertyDescribe({ description: "kind", enum: EIntegrationDetailKind, enumName: "EIntegrationDetailKind", type: EApiPropertyDescribeType.ENUM })
	@Column({ enum: EIntegrationDetailKind, enumName: "sti_integration_detail_kind", type: "enum" })
	public kind!: EIntegrationDetailKind;

	@ApiPropertyDescribe({
		description: "label",
		exampleValue: "Detail",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	@Column({ type: "varchar" })
	public label!: string;

	@ApiPropertyDescribe({
		description: "operator id",
		exampleValue: "operator-1",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	@Column({ type: "varchar" })
	public operatorId!: string;

	@ApiPropertyDescribe({
		description: "rank",
		exampleValue: 1,
		format: EApiPropertyNumberType.INTEGER,
		maximum: 1000,
		minimum: 0,
		multipleOf: 1,
		type: EApiPropertyDescribeType.NUMBER,
	})
	@Column({ type: "int" })
	public rank!: number;

	@ApiPropertyDescribe({
		dataType: IntegrationDetailTagItemDto,
		description: "tags",
		isArray: true,
		isUniqueItems: false,
		maxItems: 100,
		minItems: 0,
		shouldValidateNested: true,
		type: EApiPropertyDescribeType.OBJECT,
	})
	@OneToMany(() => IntegrationDetailTagEntity, ({ detail }: IntegrationDetailTagEntity) => detail, { eager: true })
	public tags!: Array<Relation<IntegrationDetailTagEntity>>;

	@ApiPropertyDescribe({ description: "vendor", type: EApiPropertyDescribeType.RELATION })
	@ManyToOne(() => IntegrationDetailVendorEntity, { eager: true, nullable: true })
	public vendor!: IntegrationDetailVendorEntity;
}
