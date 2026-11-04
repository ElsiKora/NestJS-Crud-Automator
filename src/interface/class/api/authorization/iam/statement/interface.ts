import type { EApiPolicyEffect } from "@enum/class/authorization";
import type { IApiAuthorizationIamCondition } from "@interface/class/api/authorization/iam/statement/condition.interface";
import type { IApiAuthorizationIamStatementTarget } from "@interface/class/api/authorization/iam/statement/target.interface";

/**
 * A policy statement read by the IAM grammar: the normalized, typed form the engine and the query planner evaluate.
 */
export interface IApiAuthorizationIamStatement {
	// `Action` or `NotAction` patterns.
	action: IApiAuthorizationIamStatementTarget;
	// Condition keys, one entry per operator and key, in document order.
	conditions: ReadonlyArray<IApiAuthorizationIamCondition>;
	// Statement effect.
	effect: EApiPolicyEffect;
	// `Resource` or `NotResource` patterns.
	resource: IApiAuthorizationIamStatementTarget;
	// Statement id, when the statement has one.
	sid?: string;
}
