import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

import { ApiPropertyNumber, ApiPropertyObject, ApiPropertyString, EApiPropertyNumberType, EApiPropertyStringType } from "../../../src/index";

class E2eKeepOwnerEntity {}

export class E2eKeepCatDto {
	@ApiPropertyString({ description: "kind", entity: E2eKeepOwnerEntity, exampleValue: "cat", format: EApiPropertyStringType.STRING, isRequired: true, maxLength: 8, minLength: 1, pattern: "/^[a-z]+$/" })
	public kind!: string;

	@ApiPropertyNumber({ description: "lives", entity: E2eKeepOwnerEntity, exampleValue: 9, format: EApiPropertyNumberType.INTEGER, isRequired: true, maximum: 9, minimum: 0, multipleOf: 1 })
	public lives!: number;
}

export class E2eKeepDogDto {
	@ApiPropertyString({ description: "kind", entity: E2eKeepOwnerEntity, exampleValue: "dog", format: EApiPropertyStringType.STRING, isRequired: true, maxLength: 8, minLength: 1, pattern: "/^[a-z]+$/" })
	public kind!: string;

	@ApiPropertyString({ description: "name", entity: E2eKeepOwnerEntity, exampleValue: "Rex", format: EApiPropertyStringType.STRING, isRequired: true, maxLength: 16, minLength: 1, pattern: "/^[A-Za-z]+$/" })
	public name!: string;
}

export class E2eKeepOmittedBodyDto {
	@ApiPropertyObject({ description: "pet", discriminator: { mapping: { cat: E2eKeepCatDto, dog: E2eKeepDogDto }, propertyName: "kind" }, entity: E2eKeepOwnerEntity, isRequired: false, shouldValidateNested: true, type: [E2eKeepCatDto, E2eKeepDogDto] })
	public pet?: E2eKeepCatDto | E2eKeepDogDto;

	@ApiPropertyObject({ description: "pets", discriminator: { mapping: { cat: E2eKeepCatDto, dog: E2eKeepDogDto }, propertyName: "kind" }, entity: E2eKeepOwnerEntity, isArray: true, isRequired: false, isUniqueItems: false, maxItems: 5, minItems: 0, shouldValidateNested: true, type: [E2eKeepCatDto, E2eKeepDogDto] })
	public pets?: Array<E2eKeepCatDto | E2eKeepDogDto>;
}

export class E2eKeepTrueBodyDto {
	@ApiPropertyObject({ description: "pet", discriminator: { mapping: { cat: E2eKeepCatDto, dog: E2eKeepDogDto }, propertyName: "kind", shouldKeepDiscriminatorProperty: true }, entity: E2eKeepOwnerEntity, isRequired: false, shouldValidateNested: true, type: [E2eKeepCatDto, E2eKeepDogDto] })
	public pet?: E2eKeepCatDto | E2eKeepDogDto;

	@ApiPropertyObject({ description: "pets", discriminator: { mapping: { cat: E2eKeepCatDto, dog: E2eKeepDogDto }, propertyName: "kind", shouldKeepDiscriminatorProperty: true }, entity: E2eKeepOwnerEntity, isArray: true, isRequired: false, isUniqueItems: false, maxItems: 5, minItems: 0, shouldValidateNested: true, type: [E2eKeepCatDto, E2eKeepDogDto] })
	public pets?: Array<E2eKeepCatDto | E2eKeepDogDto>;
}

export class E2eKeepOmittedResponseDto {
	@ApiPropertyObject({ description: "pet", discriminator: { mapping: { cat: E2eKeepCatDto, dog: E2eKeepDogDto }, propertyName: "kind" }, entity: E2eKeepOwnerEntity, isRequired: true, isResponse: true, shouldValidateNested: true, type: [E2eKeepCatDto, E2eKeepDogDto] })
	public pet!: E2eKeepCatDto | E2eKeepDogDto;

	@ApiPropertyObject({ description: "pets", discriminator: { mapping: { cat: E2eKeepCatDto, dog: E2eKeepDogDto }, propertyName: "kind" }, entity: E2eKeepOwnerEntity, isArray: true, isRequired: true, isResponse: true, isUniqueItems: false, maxItems: 5, minItems: 0, shouldValidateNested: true, type: [E2eKeepCatDto, E2eKeepDogDto] })
	public pets!: Array<E2eKeepCatDto | E2eKeepDogDto>;
}

export class E2eKeepTrueResponseDto {
	@ApiPropertyObject({ description: "pet", discriminator: { mapping: { cat: E2eKeepCatDto, dog: E2eKeepDogDto }, propertyName: "kind", shouldKeepDiscriminatorProperty: true }, entity: E2eKeepOwnerEntity, isRequired: true, isResponse: true, shouldValidateNested: true, type: [E2eKeepCatDto, E2eKeepDogDto] })
	public pet!: E2eKeepCatDto | E2eKeepDogDto;

	@ApiPropertyObject({ description: "pets", discriminator: { mapping: { cat: E2eKeepCatDto, dog: E2eKeepDogDto }, propertyName: "kind", shouldKeepDiscriminatorProperty: true }, entity: E2eKeepOwnerEntity, isArray: true, isRequired: true, isResponse: true, isUniqueItems: false, maxItems: 5, minItems: 0, shouldValidateNested: true, type: [E2eKeepCatDto, E2eKeepDogDto] })
	public pets!: Array<E2eKeepCatDto | E2eKeepDogDto>;
}

export class E2eKeepFalseResponseDto {
	@ApiPropertyObject({ description: "pet", discriminator: { mapping: { cat: E2eKeepCatDto, dog: E2eKeepDogDto }, propertyName: "kind", shouldKeepDiscriminatorProperty: false }, entity: E2eKeepOwnerEntity, isRequired: true, isResponse: true, shouldValidateNested: true, type: [E2eKeepCatDto, E2eKeepDogDto] })
	public pet!: E2eKeepCatDto | E2eKeepDogDto;

	@ApiPropertyObject({ description: "pets", discriminator: { mapping: { cat: E2eKeepCatDto, dog: E2eKeepDogDto }, propertyName: "kind", shouldKeepDiscriminatorProperty: false }, entity: E2eKeepOwnerEntity, isArray: true, isRequired: true, isResponse: true, isUniqueItems: false, maxItems: 5, minItems: 0, shouldValidateNested: true, type: [E2eKeepCatDto, E2eKeepDogDto] })
	public pets!: Array<E2eKeepCatDto | E2eKeepDogDto>;
}

export class E2eKeepRootRequiredBodyDto {
	@ApiPropertyString({ description: "channel", entity: E2eKeepOwnerEntity, exampleValue: "token", format: EApiPropertyStringType.STRING, isRequired: true, maxLength: 8, minLength: 1, pattern: "/^[a-z]+$/" })
	public channel!: string;

	@IsString()
	public token!: string;
}

export class E2eKeepRootRawRequiredBodyDto {
	@ApiProperty({ type: String })
	@IsString()
	public channel!: string;

	@IsString()
	public token!: string;
}

export class E2eKeepRootOptionalBodyDto {
	@ApiPropertyString({ description: "channel", entity: E2eKeepOwnerEntity, exampleValue: "token", format: EApiPropertyStringType.STRING, isRequired: false, maxLength: 8, minLength: 1, pattern: "/^[a-z]+$/" })
	@IsOptional()
	public channel?: string;

	@IsString()
	public token!: string;
}
