import type { Type } from "@nestjs/common";

export interface IApiControllerParametersCustomRuleOptions {
	controller: Type<unknown>;
	dto: Type<unknown> | undefined;
	methodName: string;
	pathParameters: ReadonlyArray<string>;
	/** IAM resource path of the controller; undefined for a HOOKS route, whose policy reads the path values without one. */
	resourcePath?: string;
}
