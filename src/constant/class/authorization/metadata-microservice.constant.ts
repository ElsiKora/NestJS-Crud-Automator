const PATTERN_HANDLER_KEY: string = "microservices:handler_type";
const PATTERN_KEY: string = "microservices:pattern";

/**
 * Metadata keys that `@MessagePattern` and `@EventPattern` of `@nestjs/microservices` write.
 * They are read by value because the package is not a dependency of this library.
 */
export const AUTHORIZATION_MICROSERVICE_METADATA_CONSTANT: {
	readonly PATTERN_HANDLER_KEY: string;
	readonly PATTERN_KEY: string;
} = {
	PATTERN_HANDLER_KEY,
	PATTERN_KEY,
} as const;
