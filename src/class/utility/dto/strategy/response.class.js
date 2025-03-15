import { EApiRouteType } from "../../../../enum";
export class DtoStrategyResponse {
    getDecoratorConfig(method, _metadata) {
        switch (method) {
            case EApiRouteType.CREATE: {
                return { isResponse: true };
            }
            case EApiRouteType.DELETE: {
                return { isResponse: true };
            }
            case EApiRouteType.GET: {
                return { isResponse: true };
            }
            case EApiRouteType.GET_LIST: {
                return { isExpose: true, isResponse: true };
            }
            case EApiRouteType.PARTIAL_UPDATE: {
                return { isResponse: true };
            }
            case EApiRouteType.UPDATE: {
                return { isResponse: true };
            }
            default: {
                return { isResponse: true };
            }
        }
    }
}
//# sourceMappingURL=response.class.js.map