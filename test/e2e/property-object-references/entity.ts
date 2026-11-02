import "reflect-metadata";

import type { Type } from "@nestjs/common";

import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

import { ApiPropertyDescribe, ApiPropertyObject, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../src/index";

import { createObjectOptions, createUnion, createVariant } from "./variant";

const ID_DESCRIBE = { description: "id", exampleValue: "id-1", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING } as const;
const KIND_DESCRIBE = { description: "kind", exampleValue: "Variant", format: EApiPropertyStringType.STRING, maxLength: 50, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING } as const;

/**
 * Builds the describe fields of a dynamic object with one variant that holds a polymorphic manual object.
 * @param {string} prefix - Name prefix of the variant classes of the nested object.
 * @returns {object} The describe fields.
 */
function createDynamicUnion(prefix: string): object {
	return {
		dataType: { Variant: { kind: KIND_DESCRIBE, nested: { ...createUnion(prefix), description: "nested", type: EApiPropertyDescribeType.OBJECT } } },
		description: "dynamic",
		discriminator: { mapping: { Variant: "Variant" }, propertyName: "kind", shouldKeepDiscriminatorProperty: true },
		isDynamicallyGenerated: true,
		type: EApiPropertyDescribeType.OBJECT,
	};
}

export class E2eReferenceHolderDTO {
	@ApiPropertyObject(createObjectOptions("E2eReferenceHeld", E2eReferenceHolderDTO))
	public held!: unknown;
}

@Entity("e2e_reference_relatives")
export class E2eReferenceRelativeEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe(ID_DESCRIBE)
	public id!: string;
}

@Entity("e2e_reference_sources")
export class E2eReferenceSourceEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe(ID_DESCRIBE)
	public id!: string;

	@Column({ type: "simple-json" })
	@ApiPropertyDescribe({ ...createUnion("E2eReferenceUnion"), description: "union", type: EApiPropertyDescribeType.OBJECT } as never)
	public union!: unknown;

	@Column({ type: "simple-json" })
	@ApiPropertyDescribe({ ...createUnion("E2eReferenceUnionList"), description: "union list", isArray: true, isUniqueItems: false, maxItems: 4, minItems: 0, shouldValidateNested: true, type: EApiPropertyDescribeType.OBJECT } as never)
	public unionList!: Array<unknown>;

	@Column({ type: "simple-json" })
	@ApiPropertyDescribe({ dataType: [createVariant("E2eReferenceOnlyDTO")], description: "single", type: EApiPropertyDescribeType.OBJECT } as never)
	public single!: unknown;

	@Column({ type: "simple-json" })
	@ApiPropertyDescribe(createDynamicUnion("E2eReferenceDynamic") as never)
	public dynamic!: unknown;

	@Column({ type: "simple-json" })
	@ApiPropertyDescribe({ ...(createDynamicUnion("E2eReferenceDynamicList") as object), isArray: true, isUniqueItems: false, maxItems: 4, minItems: 0, shouldValidateNested: true } as never)
	public dynamicList!: Array<unknown>;

	@Column({ type: "simple-json" })
	@ApiPropertyDescribe({ dataType: E2eReferenceHolderDTO as Type<unknown>, description: "holder", type: EApiPropertyDescribeType.OBJECT } as never)
	public holder!: unknown;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(ID_DESCRIBE)
	public relativeId!: string;

	@ManyToOne(() => E2eReferenceRelativeEntity)
	@JoinColumn({ name: "relativeId" })
	@ApiPropertyDescribe({ description: "relative", type: EApiPropertyDescribeType.RELATION })
	public relative!: E2eReferenceRelativeEntity;
}

@Entity("e2e_reference_generated")
export class E2eReferenceGeneratedEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe(ID_DESCRIBE)
	public id!: string;

	@Column({ type: "simple-json" })
	@ApiPropertyDescribe({ ...createUnion("E2eReferenceGenerated"), description: "union", type: EApiPropertyDescribeType.OBJECT } as never)
	public union!: unknown;

	@Column({ type: "simple-json" })
	@ApiPropertyDescribe(createDynamicUnion("E2eReferenceGeneratedDynamic") as never)
	public dynamic!: unknown;
}
