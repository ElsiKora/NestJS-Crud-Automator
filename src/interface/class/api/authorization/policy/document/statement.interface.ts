import type { EApiPolicyEffect } from "@enum/class/authorization";

export interface IApiPolicyStatement {
	Action: ReadonlyArray<string>;
	Condition?: Record<string, Record<string, unknown>>;
	Effect: EApiPolicyEffect;
	Resource: ReadonlyArray<string>;
	Sid?: string;
}
