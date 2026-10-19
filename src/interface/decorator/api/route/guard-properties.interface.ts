import type { EApiRouteGuardStage } from "@enum/decorator/api/route/guard-stage.enum";
import type { CanActivate, Type } from "@nestjs/common";

export interface IApiRouteGuardProperties {
	guard: CanActivate | Type<CanActivate>;
	stage?: EApiRouteGuardStage;
}
