import type { EApiPolicyEffect } from "@enum/class/authorization";

/**
 * One statement of a policy document. The grammar reads exactly one of `Action` and `NotAction`, and exactly one of
 * `Resource` and `NotResource`.
 */
export interface IApiPolicyStatement {
	Action?: ReadonlyArray<string>;
	Condition?: Record<string, Record<string, unknown>>;
	Effect: EApiPolicyEffect;
	NotAction?: ReadonlyArray<string>;
	NotResource?: ReadonlyArray<string>;
	Resource?: ReadonlyArray<string>;
	Sid?: string;
}
