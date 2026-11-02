import type { Type } from "@nestjs/common";

export interface IApiControllerParametersCustomRuleOptions {
	controller: Type<unknown>;
	dto: Type<unknown> | undefined;
	methodName: string;
	pathParameters: ReadonlyArray<string>;
	resourcePath: string;
}
