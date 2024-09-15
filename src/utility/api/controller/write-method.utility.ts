import { ErrorException } from "../../error-exception.utility";

import { ApiControllerGetMethodName } from "./get-method-name.utility";

import type { EApiRouteType } from "../../../enum";

import type { IApiBaseEntity, IApiEntity } from "../../../interface";

export function ApiControllerWriteMethod(thisTarget: Record<string, (method: EApiRouteType, methodName: string, entity: IApiBaseEntity, entityMetadata: IApiEntity) => void>, target: Record<string, unknown>, method: EApiRouteType, entity: IApiBaseEntity, entityMetadata: IApiEntity): void {
	const methodName: string = ApiControllerGetMethodName(method);

	if (target[methodName]) {
		throw ErrorException(`Reserved method ${methodName} already defined`);
	}

	thisTarget[method](method, methodName, entity, entityMetadata);
}
