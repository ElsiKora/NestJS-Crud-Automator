const SWAGGER_METADATA_PREFIX: string = "swagger";

export const SWAGGER_METADATA_CONSTANT: Readonly<{
	readonly MODEL_PROPERTIES: string;
	readonly MODEL_PROPERTIES_ARRAY: string;
}> = Object.freeze({
	MODEL_PROPERTIES: `${SWAGGER_METADATA_PREFIX}/apiModelProperties`,
	MODEL_PROPERTIES_ARRAY: `${SWAGGER_METADATA_PREFIX}/apiModelPropertiesArray`,
});
