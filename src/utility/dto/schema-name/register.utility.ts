import { ErrorException } from "@utility/error/exception.utility";

const SCHEMA_NAME_OWNERS: Map<string, { dto: object; origin: string }> = new Map<string, { dto: object; origin: string }>();

/**
 * Registers the class that owns an OpenAPI component name and fails startup when a different class already owns it,
 * because Swagger keys components by class name and would document one of the classes with the other's schema.
 * A different class from the same origin replaces the owner, because a re-evaluated module (webpack HMR, `vi.resetModules`) creates its classes again.
 * @param {object} dto - Class that the component name belongs to.
 * @param {string} name - OpenAPI component name, which is the class name.
 * @param {string} origin - Where the class comes from, for example the route and DTO type or the parent DTO and property; used to recognize a re-evaluation and in the error message.
 * @returns {void}
 * @throws {Error} When a different class from another origin already owns the name.
 */
export function DtoSchemaNameRegister(dto: object, name: string, origin: string): void {
	const owner: { dto: object; origin: string } | undefined = SCHEMA_NAME_OWNERS.get(name);

	if (owner?.dto === dto) {
		return;
	}

	if (owner && owner.origin !== origin) {
		throw ErrorException(`OpenAPI component name "${name}" belongs to two different classes: ${owner.origin}, and ${origin}. Swagger keeps one schema per name, so it would document one of them with the other's schema. Rename the hand-written class, or the controller class, property or variant that the generated name is built from`);
	}

	SCHEMA_NAME_OWNERS.set(name, { dto, origin });
}
