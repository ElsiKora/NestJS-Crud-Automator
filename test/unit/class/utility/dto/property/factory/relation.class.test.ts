import "reflect-metadata";

import type { IApiEntity } from "@interface/entity";
import type { ValidationMetadata } from "class-validator/types/metadata/ValidationMetadata";

import { DtoPropertyFactoryRelation } from "@class/utility/dto/property/factory/relation.class";
import { EApiDtoType, EApiPropertyDescribeType, EApiRouteType } from "@enum/decorator/api";
import { SWAGGER_METADATA_CONSTANT } from "@constant/swagger";
import { getMetadataStorage } from "class-validator";
import { describe, expect, it } from "vitest";

interface IRelationOwner {
	relation?: unknown;
}

const buildEntity = (relationType: string): IApiEntity<IRelationOwner> =>
	({
		columns: [{ isPrimary: false, name: "relation", relation: { target: { name: "Target" } }, type: relationType }],
		name: "Owner",
		primaryKey: undefined,
		tableName: "owners",
	}) as never;

const decorateProperty = (relationType: string, dtoType: EApiDtoType, config: Record<string, unknown>): { schema: Record<string, unknown>; validators: Array<string> } => {
	class TargetDto {
		relation?: unknown;
	}

	new DtoPropertyFactoryRelation<IRelationOwner>().create({ description: "relation", type: EApiPropertyDescribeType.RELATION } as never, buildEntity(relationType), config as never, EApiRouteType.CREATE, dtoType, "relation")(TargetDto.prototype, "relation");

	const metadata: Array<ValidationMetadata> = getMetadataStorage().getTargetValidationMetadatas(TargetDto, "", false, false);
	const schema: Record<string, unknown> = { ...(Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, TargetDto.prototype, "relation") as Record<string, unknown>) };

	delete schema.example;

	return { schema, validators: metadata.map((item: ValidationMetadata): string => `${item.type}:${String(item.name ?? item.constraintCls)}:${String(item.each)}`).toSorted() };
};

describe("DtoPropertyFactoryRelation", () => {
	it.each(["one-to-many", "many-to-many"])("describes %s response relations as arrays", (relationType: string) => {
		const { schema } = decorateProperty(relationType, EApiDtoType.RESPONSE, { isRequired: true, isResponse: true });

		expect(schema.isArray).toBe(true);
		expect(schema.minItems).toBe(0);
		expect(schema.maxItems).toBeUndefined();
		expect(schema.description).toBe("Array of Owner relation");
	});

	it.each(["many-to-one", "one-to-one"])("keeps %s response relations as single objects", (relationType: string) => {
		const { schema } = decorateProperty(relationType, EApiDtoType.RESPONSE, { isRequired: true, isResponse: true });

		expect(schema.isArray).toBe(false);
		expect(schema.minItems).toBeUndefined();
		expect(schema.description).toBe("Owner relation");
	});

	it("does not make the relation an array when a response DTO opts out of the response flag", () => {
		const { schema } = decorateProperty("one-to-many", EApiDtoType.RESPONSE, { isRequired: true, isResponse: false });

		expect(schema.isArray).toBe(false);
	});

	it.each([EApiDtoType.BODY, EApiDtoType.PARAMETERS, EApiDtoType.QUERY])("keeps %s schema and validators independent of the relation type", (dtoType: EApiDtoType) => {
		const config: Record<string, unknown> = { isRequired: true };
		const toOne = decorateProperty("many-to-one", dtoType, config);

		expect(toOne.schema.format).toBe("uuid");
		expect(toOne.schema.isArray).toBe(false);
		expect(decorateProperty("one-to-many", dtoType, config)).toEqual(toOne);
		expect(decorateProperty("many-to-many", dtoType, config)).toEqual(toOne);
	});
});
