import { EApiRouteType } from "../../../../enum";
export class DtoStrategyQuery {
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
                return { isRequired: false };
            }
        }
    }
}
//# sourceMappingURL=query.class.js.map