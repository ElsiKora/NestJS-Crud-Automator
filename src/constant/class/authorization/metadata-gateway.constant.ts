const MESSAGE_HANDLER_KEY: string = "websockets:message_mapping";
const MESSAGE_KEY: string = "message";

/**
 * Metadata keys that `@SubscribeMessage` of `@nestjs/websockets` writes.
 * They are read by value because the package is not a dependency of this library.
 */
export const AUTHORIZATION_GATEWAY_METADATA_CONSTANT: {
	readonly MESSAGE_HANDLER_KEY: string;
	readonly MESSAGE_KEY: string;
} = {
	MESSAGE_HANDLER_KEY,
	MESSAGE_KEY,
} as const;
