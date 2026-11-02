import type { EApiFunctionType } from "@enum/decorator/api";

/**
 * A service function a generated route calls, with what the route does through it.
 */
export interface IApiControllerRouteFunction {
	decorator: string;
	failure: string;
	functionType: EApiFunctionType.CREATE | EApiFunctionType.DELETE | EApiFunctionType.GET | EApiFunctionType.UPDATE;
	purpose: string;
}
