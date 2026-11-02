import type { Type } from "@nestjs/common";

export interface IApiControllerParametersCustomRuleOptions {
	controller: Type<unknown>;
	dto: Type<unknown> | undefined;
	/** Whether each path parameter must be held by a property with a column type, `ApiPropertyCopy` or an `ApiProperty*` decorator: a HOOKS route, whose policy has no resource path rule to lean on. */
	isColumnTypeRequired?: boolean;
	methodName: string;
	/** Path parameters of the whole route path: global prefix, `RouterModule` path, controller path, and route path. */
	pathParameters: ReadonlyArray<string>;
	/** IAM resource path of the controller; undefined for a HOOKS route, whose policy reads the path values without one. */
	resourcePath?: string;
}
