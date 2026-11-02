import type { Type } from "@nestjs/common";
import type { TTypeOrmTableMetadataArguments } from "@type/utility/typeorm";

import { IsEntityConstructor } from "@utility/is/entity/constructor.utility";
import { getMetadataArgsStorage } from "typeorm";

/**
 * Resolves an entity to its class.
 * A class resolves to itself. An object that carries only an entity name, such as a relation declared by name, resolves to
 * the first class of that name in TypeORM's global metadata registry. This is not how a data source resolves such a relation:
 * it looks among its own entities, so two registered classes that share a name can resolve differently here.
 * @param {unknown} entity - Entity class, or an object carrying the entity name.
 * @returns {Type<unknown> | undefined} Entity class, or undefined when no class matches.
 */
export function DatabaseTypeOrmGetEntityClass(entity: unknown): Type<unknown> | undefined {
	if (IsEntityConstructor(entity)) {
		return entity;
	}

	const entityName: unknown = typeof entity === "object" && entity !== null ? Reflect.get(entity, "name") : undefined;

	if (typeof entityName !== "string" || entityName.length === 0) {
		return undefined;
	}

	return getMetadataArgsStorage()
		.tables.map(({ target }: TTypeOrmTableMetadataArguments): unknown => target)
		.find((target: unknown): target is Type<unknown> => typeof target === "function" && target.name === entityName);
}
