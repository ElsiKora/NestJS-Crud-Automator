import { ErrorException } from "../../error-exception.utility";

import { ApiControllerGetMethodName } from "./get-method-name.utility";

import type { EApiRouteType } from "../../../enum";

import type { IApiEntity } from "../../../interface";

export function ApiControllerWriteMethod(thisTarget: Record<string, (methodName: string, entity: IApiEntity) => void>, target: Record<string, unknown>, method: EApiRouteType, entity: IApiEntity): void {
	const methodName: string = ApiControllerGetMethodName(method);

	if (target[methodName]) {
		throw ErrorException(`Reserved method ${methodName} already defined`);
	}

	thisTarget[method](methodName, entity);
}
