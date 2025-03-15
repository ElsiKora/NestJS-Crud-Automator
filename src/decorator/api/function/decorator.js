import { EApiFunctionType } from "../../../enum";
import { ErrorException } from "../../../utility/error-exception.utility";
import { ApiFunctionCreate } from "./create.decorator";
import { ApiFunctionDelete } from "./delete.decorator";
import { ApiFunctionGetList } from "./get-list.decorator";
import { ApiFunctionGetMany } from "./get-many.decorator";
import { ApiFunctionGet } from "./get.decorator";
import { ApiFunctionUpdate } from "./update.decorator";
export function ApiFunction(properties) {
    const { entity, type } = properties;
    return function (_target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = function (...arguments_) {
            let decoratorFunction;
            switch (type) {
                case EApiFunctionType.CREATE: {
                    decoratorFunction = ApiFunctionCreate({ entity });
                    break;
                }
                case EApiFunctionType.DELETE: {
                    decoratorFunction = ApiFunctionDelete({ entity });
                    break;
                }
                case EApiFunctionType.GET: {
                    decoratorFunction = ApiFunctionGet({ entity });
                    break;
                }
                case EApiFunctionType.GET_LIST: {
                    decoratorFunction = ApiFunctionGetList({ entity });
                    break;
                }
                case EApiFunctionType.GET_MANY: {
                    decoratorFunction = ApiFunctionGetMany({ entity });
                    break;
                }
                case EApiFunctionType.UPDATE: {
                    decoratorFunction = ApiFunctionUpdate({ entity });
                    break;
                }
                default: {
                    throw ErrorException("Unsupported function");
                }
            }
            const modifiedDescriptor = decoratorFunction(this, propertyKey, { value: originalMethod });
            const modifiedMethod = modifiedDescriptor.value;
            return modifiedMethod.apply(this, arguments_);
        };
        return descriptor;
    };
}
//# sourceMappingURL=decorator.js.map