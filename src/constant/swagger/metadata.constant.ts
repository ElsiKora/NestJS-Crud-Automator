const SWAGGER_METADATA_PREFIX: string = "swagger";

export const SWAGGER_METADATA_CONSTANT: Readonly<{
	readonly EXTRA_MODELS: string;
	readonly MODEL_PROPERTIES: string;
	readonly MODEL_PROPERTIES_ARRAY: string;
	readonly PARAMETERS: string;
	readonly RESPONSES: string;
}> = Object.freeze({
	EXTRA_MODELS: `${SWAGGER_METADATA_PREFIX}/apiExtraModels`,
	MODEL_PROPERTIES: `${SWAGGER_METADATA_PREFIX}/apiModelProperties`,
	MODEL_PROPERTIES_ARRAY: `${SWAGGER_METADATA_PREFIX}/apiModelPropertiesArray`,
	PARAMETERS: `${SWAGGER_METADATA_PREFIX}/apiParameters`,
	RESPONSES: `${SWAGGER_METADATA_PREFIX}/apiResponse`,
});
