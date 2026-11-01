import type { IApiEntityColumn } from "@interface/entity";

/**
 * Checks whether a relation column points at one related row, the only kind a generated GET_LIST may filter through a one-hop path such as `author.id`.
 * Typed plans and routes without a typed filter share this rule, so neither publishes nor applies a to-many path.
 * @template E - Entity type.
 * @param {IApiEntityColumn<E>} column - Relation column of the listed entity.
 * @returns {boolean} True for many-to-one and one-to-one relations.
 */
export function ApiControllerGetListIsToOneRelation<E>(column: IApiEntityColumn<E>): boolean {
	return column.type === "many-to-one" || column.type === "one-to-one";
}
