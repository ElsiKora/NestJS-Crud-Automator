import { DtoSchemaNameRegister } from "@utility/dto/schema-name/register.utility";

/**
 * Names a generated DTO class, which also names its OpenAPI component, and registers it, so a different class with that name fails startup.
 * @param {object} dto - Generated DTO class.
 * @param {string} name - Class and OpenAPI component name.
 * @param {string} origin - Where the class is generated from, for example the route and DTO type or the parent DTO and property.
 * @returns {void}
 * @throws {Error} When a different class from another origin already has the name.
 */
export function DtoSetGeneratedName(dto: object, name: string, origin: string): void {
	DtoSchemaNameRegister(dto, name, origin);
	Object.defineProperty(dto, "name", { value: name });
}
