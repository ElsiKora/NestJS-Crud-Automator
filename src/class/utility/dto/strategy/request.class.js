import { EApiRouteType } from "../../../../enum";
export class DtoStrategyRequest {
    getDecoratorConfig(method, _metadata) {
        switch (method) {
            case EApiRouteType.CREATE: {
                return { isRequired: true };
            }
            case EApiRouteType.DELETE: {
                return { isRequired: true };
            }
            case EApiRouteType.GET: {
                return { isRequired: true };
            }
            case EApiRouteType.GET_LIST: {
                return { isRequired: true };
            }
            case EApiRouteType.PARTIAL_UPDATE: {
                return { isRequired: true };
            }
            case EApiRouteType.UPDATE: {
                return { isRequired: true };
            }
            default: {
                return { isRequired: true };
            }
        }
    }
}
//# sourceMappingURL=request.class.js.map