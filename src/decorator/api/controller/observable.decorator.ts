import { CONTROLLER_API_DECORATOR_CONSTANT } from "@constant/decorator/api/controller.constant";

/**
 *
 */
export function ApiControllerObservable(): ClassDecorator {
	return (target: object) => {
		Reflect.defineMetadata(CONTROLLER_API_DECORATOR_CONSTANT.OBSERVABLE_METADATA_KEY, true, target);
	};
}
