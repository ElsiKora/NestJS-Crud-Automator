const AUTHORIZED_ENTITY: symbol = Symbol("AUTHORIZED_ENTITY");
const REQUEST_IP: symbol = Symbol("REQUEST_IP");
const REQUEST_USER_AGENT: symbol = Symbol("REQUEST_USER_AGENT");
const REQUEST_TIMESTAMP: symbol = Symbol("REQUEST_TIMESTAMP");
const REQUEST_SIGNATURE: symbol = Symbol("REQUEST_SIGNATURE");

export const TRANSFORMER_VALUE_DTO_CONSTANT: {
	readonly AUTHORIZED_ENTITY: symbol;
	readonly REQUEST_IP: symbol;
	readonly REQUEST_SIGNATURE: symbol;
	readonly REQUEST_TIMESTAMP: symbol;
	readonly REQUEST_USER_AGENT: symbol;
} = {
	AUTHORIZED_ENTITY,
	REQUEST_IP,
	REQUEST_SIGNATURE,
	REQUEST_TIMESTAMP,
	REQUEST_USER_AGENT,
} as const;
