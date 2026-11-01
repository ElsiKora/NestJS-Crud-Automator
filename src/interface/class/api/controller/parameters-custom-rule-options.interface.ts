import type { Type } from "@nestjs/common";

export interface IApiControllerParametersCustomRuleOptions {
	controllerName: string;
	dto: Type<unknown> | undefined;
	methodName: string;
	pathParameters: ReadonlyArray<string>;
	resourcePath: string;
}
