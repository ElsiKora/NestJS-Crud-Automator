import "reflect-metadata";

import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { ApiPropertyCopy } from "@decorator/api/property/copy.decorator";
import { EApiDtoType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { DECORATORS } from "@nestjs/swagger/dist/constants";
import { DtoAutoContextPush } from "@utility/dto/auto/context/push.utility";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { describe, expect, it } from "vitest";

@Entity("copy_entities")
class CopyEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "name",
		exampleValue: "Name",
		format: EApiPropertyStringType.STRING,
		maxLength: 50,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public name!: string;
}

@Entity("copy_missing_metadata_entities")
class CopyMissingMetadataEntity {
	@Column({ type: "varchar" })
	public title!: string;
}

@Entity("copy_disabled_entities")
class CopyDisabledEntity {
	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "label",
		exampleValue: "Label",
		format: EApiPropertyStringType.STRING,
		maxLength: 50,
		minLength: 1,
		pattern: "/^.+$/",
		properties: {
			[EApiRouteType.CREATE]: {
				[EApiDtoType.BODY]: {
					isEnabled: false,
				},
			},
		},
		type: EApiPropertyDescribeType.STRING,
	})
	public label!: string;
}

class CopyPlainEntity {
	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "title",
		exampleValue: "Title",
		format: EApiPropertyStringType.STRING,
		maxLength: 50,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public title!: string;
}

describe("ApiPropertyCopy", () => {
	it("throws when method and dtoType are missing", () => {
		const buildDto = () => {
			class CopyDto {
				@ApiPropertyCopy({ entity: CopyEntity, propertyName: "name" })
				public name!: string;
			}

			return CopyDto;
		};

		expect(buildDto).toThrow("ApiPropertyCopy requires method and dtoType or a valid autoResolveContext.");
	});

	it("copies property decorators from entity metadata", () => {
		class CopyDto {
			@ApiPropertyCopy({
				entity: CopyEntity,
				propertyName: "name",
				method: EApiRouteType.CREATE,
				dtoType: EApiDtoType.BODY,
			})
			public name!: string;
		}

		const metadata = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, CopyDto.prototype, "name");
		expect(metadata).toBeDefined();
	});

	it("throws when property is not found on entity", () => {
		const buildDto = () => {
			class CopyDto {
				@ApiPropertyCopy({
					entity: CopyEntity,
					propertyName: "missing" as keyof CopyEntity,
					method: EApiRouteType.CREATE,
					dtoType: EApiDtoType.BODY,
				})
				public missing!: string;
			}

			return CopyDto;
		};

		expect(buildDto).toThrow("Property missing not found in entity CopyEntity");
	});

	it("throws when property metadata is missing", () => {
		const buildDto = () => {
			class CopyDto {
				@ApiPropertyCopy({
					entity: CopyMissingMetadataEntity,
					propertyName: "title",
					method: EApiRouteType.CREATE,
					dtoType: EApiDtoType.BODY,
				})
				public title!: string;
			}

			return CopyDto;
		};

		expect(buildDto).toThrow("Metadata for property title in entity CopyMissingMetadataEntity not found");
	});

	it("throws when entity table metadata is missing", () => {
		const buildDto = () => {
			class CopyDto {
				@ApiPropertyCopy({
					entity: CopyPlainEntity,
					propertyName: "title",
					method: EApiRouteType.CREATE,
					dtoType: EApiDtoType.BODY,
				})
				public title!: string;
			}

			return CopyDto;
		};

		expect(buildDto).toThrow("Table for entity CopyPlainEntity not found in metadata storage");
	});

	it("throws when no decorators are generated for property", () => {
		const buildDto = () => {
			class CopyDto {
				@ApiPropertyCopy({
					entity: CopyDisabledEntity,
					propertyName: "label",
					method: EApiRouteType.CREATE,
					dtoType: EApiDtoType.BODY,
				})
				public label!: string;
			}

			return CopyDto;
		};

		expect(buildDto).toThrow("No decorators generated for property label in entity CopyDisabledEntity");
	});

	it("queues execution when auto context is requested without context", () => {
		const buildDto = () => {
			class CopyDto {
				@ApiPropertyCopy({
					entity: CopyEntity,
					propertyName: "name",
					shouldAutoResolveContext: true,
				})
				public name!: string;
			}

			return CopyDto;
		};

		expect(buildDto).not.toThrow();
	});

	it("applies decorators after auto context is pushed", () => {
		class CopyDto {
			@ApiPropertyCopy({
				entity: CopyEntity,
				propertyName: "name",
				shouldAutoResolveContext: true,
			})
			public name!: string;
		}

		DtoAutoContextPush(CopyDto.prototype, EApiRouteType.CREATE, EApiDtoType.BODY);

		const metadata = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, CopyDto.prototype, "name");
		expect(metadata).toBeDefined();
	});

	it("applies class-validator decorators from copied metadata", () => {
		class CopyDto {
			@ApiPropertyCopy({
				entity: CopyEntity,
				propertyName: "name",
				method: EApiRouteType.CREATE,
				dtoType: EApiDtoType.BODY,
			})
			public name!: string;
		}

		const instance = plainToInstance(CopyDto, { name: 123 });
		const errors = validateSync(instance);

		expect(errors.length).toBeGreaterThan(0);
	});
});
