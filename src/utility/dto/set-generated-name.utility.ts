import { DTO_SCHEMA_NAME_CONSTANT } from "@constant/utility/dto/schema-name.constant";

/**
 * Names a generated DTO class, which also names its OpenAPI component, and records where it is generated from.
 * Uniqueness is not checked here: the bootstrap check of each application compares the classes that its routes reach, and names a generated class by this origin.
 * @param {object} dto - Generated DTO class.
 * @param {string} name - Class and OpenAPI component name.
 * @param {string} origin - Where the class is generated from, for example the route and DTO type or the parent DTO and property.
 * @returns {void}
 */
export function DtoSetGeneratedName(dto: object, name: string, origin: string): void {
	Object.defineProperty(dto, "name", { value: name });
	Reflect.defineMetadata(DTO_SCHEMA_NAME_CONSTANT.ORIGIN_METADATA_KEY, origin, dto);
}
