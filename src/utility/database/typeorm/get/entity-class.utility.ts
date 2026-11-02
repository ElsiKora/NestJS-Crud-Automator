import type { Type } from "@nestjs/common";
import type { TTypeOrmTableMetadataArguments } from "@type/utility/typeorm";

import { getMetadataArgsStorage } from "typeorm";

/**
 * Resolves an entity to its class.
 * A class resolves to itself. An object that carries only an entity name, such as a relation declared by name, resolves to
 * the first registered TypeORM entity class with that name, the way TypeORM resolves a relation target given by name.
 * @param {unknown} entity - Entity class, or an object carrying the entity name.
 * @returns {Type<unknown> | undefined} Entity class, or undefined when no class matches.
 */
export function DatabaseTypeOrmGetEntityClass(entity: unknown): Type<unknown> | undefined {
	if (typeof entity === "function") {
		return entity as Type<unknown>;
	}

	const entityName: unknown = typeof entity === "object" && entity !== null ? (entity as { name?: unknown }).name : undefined;

	if (typeof entityName !== "string" || entityName.length === 0) {
		return undefined;
	}

	return getMetadataArgsStorage()
		.tables.map(({ target }: TTypeOrmTableMetadataArguments): unknown => target)
		.find((target: unknown): target is Type<unknown> => typeof target === "function" && target.name === entityName);
}
