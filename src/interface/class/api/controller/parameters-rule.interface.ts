import type { Type } from "@nestjs/common";

export interface IApiControllerParametersRule {
	configuredDto?: Type<unknown>;
	dto: Type<unknown>;
	isRouteDto?: boolean;
}
