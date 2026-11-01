export const DTO_SCHEMA_NAME_CONSTANT: { readonly CONTROLLER_METADATA_KEY: string; readonly ORIGIN_METADATA_KEY: string } = {
	// Set on the class decorated with `@ApiController`; a subclass or mixin inherits it, so it names the class whose schema prefix the routes use.
	CONTROLLER_METADATA_KEY: "DTO_SCHEMA_NAME_CONTROLLER_METADATA_KEY",
	// Set on a generated DTO class; it names the route or parent DTO the class was generated from.
	ORIGIN_METADATA_KEY: "DTO_SCHEMA_NAME_ORIGIN_METADATA_KEY",
} as const;
