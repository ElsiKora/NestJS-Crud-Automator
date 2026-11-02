import type { IApiControllerPathPlanParameter } from "./parameter.interface";

export interface IApiControllerPathPlan {
	controllerName: string;
	/** Whether the row route path is the entity's primary key in declaration order, so the generic PARAMETERS DTO describes it. */
	isDefaultRowPath: boolean;
	/** Whether the path addresses every primary key column, so no route has to resolve the rest of the key at request time. */
	isKeyCovered: boolean;
	/** Whether rowPath was declared on the controller. */
	isRowPathDeclared: boolean;
	primaryFields: ReadonlyArray<string>;
	rowParameters: ReadonlyArray<IApiControllerPathPlanParameter>;
	signature: string;
}
