import "reflect-metadata";

import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType } from "../../../src/index";

import { E2eKeepCatDto, E2eKeepDogDto } from "./dto";

@Entity("e2e_discriminator_keep_records")
export class E2eKeepRecordEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "simple-json" })
	@ApiPropertyDescribe({
		dataType: [E2eKeepCatDto, E2eKeepDogDto],
		description: "pets",
		discriminator: { mapping: { cat: E2eKeepCatDto, dog: E2eKeepDogDto }, propertyName: "kind" },
		isArray: true,
		isUniqueItems: false,
		maxItems: 5,
		minItems: 0,
		shouldValidateNested: true,
		type: EApiPropertyDescribeType.OBJECT,
	})
	public pets!: Array<E2eKeepCatDto | E2eKeepDogDto>;

	@Column({ type: "simple-json" })
	@ApiPropertyDescribe({
		dataType: {
			Variant: {
				kind: { description: "kind", exampleValue: "Variant", format: EApiPropertyStringType.STRING, maxLength: 50, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING },
				score: { description: "score", exampleValue: 5, format: EApiPropertyNumberType.INTEGER, maximum: 10, minimum: 0, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER },
			},
		},
		description: "details",
		discriminator: { mapping: { Variant: "Variant" }, propertyName: "kind" },
		isDynamicallyGenerated: true,
		shouldValidateNested: true,
		type: EApiPropertyDescribeType.OBJECT,
	} as never)
	public details!: Record<string, unknown>;
}

@Entity("e2e_discriminator_keep_response_records")
export class E2eKeepResponseRecordEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "simple-json" })
	@ApiPropertyDescribe({
		dataType: [E2eKeepCatDto, E2eKeepDogDto],
		description: "pet",
		discriminator: { mapping: { cat: E2eKeepCatDto, dog: E2eKeepDogDto }, propertyName: "kind", shouldKeepDiscriminatorProperty: false },
		shouldValidateNested: true,
		type: EApiPropertyDescribeType.OBJECT,
	})
	public pet!: E2eKeepCatDto | E2eKeepDogDto;
}
