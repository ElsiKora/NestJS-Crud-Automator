import type { EApiRouteType } from "../../../enum";
import type { IApiControllerProperties, IApiEntity } from "../../../interface";

import { ErrorException } from "../../error-exception.utility";

import { ApiControllerGetMethodName } from "./get-method-name.utility";

export function ApiControllerWriteMethod<E>(thisTarget: Record<string, (method: EApiRouteType, methodName: string, properties: IApiControllerProperties<E>, entityMetadata: IApiEntity<E>) => void>, target: Record<string, unknown>, method: EApiRouteType, properties: IApiControllerProperties<E>, entityMetadata: IApiEntity<E>): void {
	const methodName: string = ApiControllerGetMethodName(method);

	if (target[methodName]) {
		throw ErrorException(`Reserved method ${methodName} already defined`);
	}

	if (thisTarget[method]) {
		thisTarget[method](method, methodName, properties, entityMetadata);
	} else {
		throw ErrorException(`Method ${methodName} not implemented`);
	}
}
