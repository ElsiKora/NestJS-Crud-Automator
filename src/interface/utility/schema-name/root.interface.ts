export interface IDtoSchemaNameRoot {
	// Where the type is used, for example the route and DTO type; it names the type in errors.
	origin: string;
	// Swagger type: a class, a lazy `() => Class` function, or an array of either.
	type: unknown;
}
