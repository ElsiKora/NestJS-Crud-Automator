import type { Type } from "@nestjs/common";
import type { TTypeOrmTableMetadataArguments } from "@type/utility/typeorm";

import { IsConstructor } from "@utility/is/constructor.utility";
import { getMetadataArgsStorage } from "typeorm";

/**
 * Lists the `@ChildEntity` classes that extend a table inheritance root, in TypeORM registration order.
 * @param {unknown} root - Table inheritance root class; any other value gives an empty list.
 * @returns {Array<Type<unknown>>} Child entity classes known to TypeORM so far.
 */
export function DatabaseTypeOrmGetChildEntities(root: unknown): Array<Type<unknown>> {
	if (!IsConstructor(root)) {
		return [];
	}

	return getMetadataArgsStorage()
		.tables.map(({ target, type }: TTypeOrmTableMetadataArguments): Type<unknown> | undefined => (type === "entity-child" && IsConstructor(target) && target.prototype instanceof root ? target : undefined))
		.filter((target: Type<unknown> | undefined): target is Type<unknown> => target !== undefined);
}
