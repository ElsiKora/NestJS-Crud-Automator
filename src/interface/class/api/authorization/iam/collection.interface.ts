/**
 * The SQL a `resource.*` key through a to-many relation of the resource compiles to: a correlated subquery over the
 * related rows of one resource row. It is read from the entity metadata of the one DataSource that reads the resource
 * entity, so every name is the one that DataSource writes, escaped by its driver.
 */
export interface IApiAuthorizationIamCollection {
	// Query path of the resource column the related rows refer to, which the subquery is correlated with, such as `id`.
	correlationPath: string;
	// Escaped column of a related row, such as `"iam_collection_row"."name"`.
	element: string;
	// Query path of that column on the related entity, such as `name`.
	elementPath: string;
	// Escaped `FROM` clause of the subquery: the related table, joined through the junction table of a ManyToMany.
	from: string;
	// Escaped column the subquery compares with the correlated resource column.
	link: string;
	// Escaped condition every counted related row meets, such as not being soft-deleted, or undefined when there is none.
	rowCondition?: string;
	// Query path of the delete date column of the related entity, whose soft-deleted rows a relation does not load.
	softDeletePath?: string;
}
