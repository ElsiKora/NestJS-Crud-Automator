import type { IApiAuthorizationIamContextKey } from "@interface/class/api/authorization/iam/context-key.interface";

import { EApiAuthorizationIamSupport } from "@enum/class/authorization";

const { ACCEPTED, NOT_ALLOWED, NOT_SUPPORTED_YET }: typeof EApiAuthorizationIamSupport = EApiAuthorizationIamSupport;

/**
 * The IAM context-key registry: every context path a condition key or a variable may name, and what the grammar takes
 * it for. `resource.*` keys are checked further against the resource definitions of the document's namespace.
 * Client-controlled paths (`request.body`, `request.query`, `request.headers`) are keys only: as a value or in a
 * `Resource` pattern they would let a client choose its own grant.
 */
export const AUTHORIZATION_POLICY_CONTEXT_KEY_CONSTANT: {
	readonly KEYS: ReadonlyArray<IApiAuthorizationIamContextKey>;
} = {
	KEYS: [
		{ isMultiValued: false, isPrefix: false, key: ACCEPTED, path: "principal.id", resource: NOT_SUPPORTED_YET, value: ACCEPTED },
		{ isMultiValued: false, isPrefix: false, key: ACCEPTED, path: "principal.type", resource: NOT_SUPPORTED_YET, value: ACCEPTED },
		{ isMultiValued: true, isPrefix: false, key: ACCEPTED, path: "principal.roles", resource: NOT_ALLOWED, value: NOT_ALLOWED },
		{ isMultiValued: true, isPrefix: false, key: ACCEPTED, path: "principal.groups", resource: NOT_ALLOWED, value: NOT_ALLOWED },
		{ isMultiValued: true, isPrefix: true, key: ACCEPTED, path: "principal.attributes", resource: NOT_SUPPORTED_YET, value: ACCEPTED },
		{ isMultiValued: true, isPrefix: true, key: ACCEPTED, path: "principal.claims", resource: NOT_SUPPORTED_YET, value: ACCEPTED },
		{ isMultiValued: false, isPrefix: true, key: ACCEPTED, path: "request.parameters", resource: NOT_SUPPORTED_YET, value: ACCEPTED },
		{ isMultiValued: false, isPrefix: false, key: ACCEPTED, path: "request.ip", resource: NOT_ALLOWED, value: ACCEPTED },
		{ isMultiValued: false, isPrefix: false, key: NOT_SUPPORTED_YET, path: "request.sourceIp", resource: NOT_ALLOWED, value: NOT_SUPPORTED_YET },
		{ isMultiValued: false, isPrefix: false, key: NOT_SUPPORTED_YET, path: "request.time", resource: NOT_ALLOWED, value: NOT_SUPPORTED_YET },
		{ isMultiValued: false, isPrefix: false, key: NOT_ALLOWED, path: "request.secureTransport", resource: NOT_ALLOWED, value: NOT_ALLOWED },
		{ isMultiValued: true, isPrefix: true, key: ACCEPTED, path: "request.body", resource: NOT_ALLOWED, value: NOT_ALLOWED },
		{ isMultiValued: true, isPrefix: true, key: ACCEPTED, path: "request.query", resource: NOT_ALLOWED, value: NOT_ALLOWED },
		{ isMultiValued: false, isPrefix: true, key: ACCEPTED, path: "request.headers", resource: NOT_ALLOWED, value: NOT_ALLOWED },
		// A `resource.*` value reads the loaded resource; in a `Resource` pattern it would be circular.
		{ isMultiValued: true, isPrefix: true, key: ACCEPTED, path: "resource", resource: NOT_ALLOWED, value: ACCEPTED },
	],
} as const;
