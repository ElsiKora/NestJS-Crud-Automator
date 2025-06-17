import { SERVICE_API_DECORATOR_CONSTANT } from "@constant/decorator/api/service.constant";

/**
 *
 */
export function ApiServiceObservable(): ClassDecorator {
	return (target: object) => {
		Reflect.defineMetadata(SERVICE_API_DECORATOR_CONSTANT.OBSERVABLE_METADATA_KEY, true, target);
	};
}
