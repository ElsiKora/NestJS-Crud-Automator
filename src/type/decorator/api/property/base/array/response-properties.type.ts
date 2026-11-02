/** Array bounds of a response property: a response documents rows the server returns, so it may leave out a limit the wire does not have. */
export type TApiPropertyBaseArrayResponseProperties = {
	isArray: true;
	isUniqueItems?: boolean;
	maxItems?: number;
	minItems?: number;
};
