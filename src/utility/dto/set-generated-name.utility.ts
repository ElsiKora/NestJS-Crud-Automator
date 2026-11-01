import { ErrorException } from "@utility/error/exception.utility";

const GENERATED_DTO_NAME_OWNERS: Map<string, { dto: object; source: string }> = new Map<string, { dto: object; source: string }>();

/**
 * Names a generated DTO class, which also names its OpenAPI component, and fails startup when a different generated class already has that name,
 * because Swagger keys components by class name and would document one of them with the other's schema.
 * @param {object} dto - Generated DTO class.
 * @param {string} name - Class and OpenAPI component name.
 * @param {string} source - What the class is generated for, used in the error message.
 * @returns {void}
 * @throws {Error} When a different generated DTO class already has the name.
 */
export function DtoSetGeneratedName(dto: object, name: string, source: string): void {
	const owner: { dto: object; source: string } | undefined = GENERATED_DTO_NAME_OWNERS.get(name);

	if (owner && owner.dto !== dto) {
		throw ErrorException(`Generated DTO name "${name}" belongs to two different DTO classes, generated for ${owner.source} and for ${source}. Rename one of the controller classes, or configure a manual DTO for one of the routes`);
	}

	Object.defineProperty(dto, "name", { value: name });
	GENERATED_DTO_NAME_OWNERS.set(name, { dto, source });
}
