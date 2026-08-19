import type { IApiControllerReadPlanParameter } from "./parameter.interface";

export interface IApiControllerReadPlan {
	controllerName: string;
	parameters: ReadonlyArray<IApiControllerReadPlanParameter>;
	schemaName: string;
	signature: string;
}
