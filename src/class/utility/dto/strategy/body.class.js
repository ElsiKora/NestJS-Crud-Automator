import { EApiRouteType } from "../../../../enum";
export class DtoStrategyBody {
    getDecoratorConfig(method, _metadata) {
        switch (method) {
            case EApiRouteType.CREATE: {
                return { isRequired: false };
            }
            case EApiRouteType.DELETE: {
                return { isRequired: false };
            }
            case EApiRouteType.GET: {
                return { isRequired: false };
            }
            case EApiRouteType.GET_LIST: {
                return { isRequired: false };
            }
            case EApiRouteType.PARTIAL_UPDATE: {
                return { isRequired: false };
            }
            case EApiRouteType.UPDATE: {
                return { isRequired: true };
            }
            default: {
                return { isRequired: false };
            }
        }
    }
}
//# sourceMappingURL=body.class.js.map