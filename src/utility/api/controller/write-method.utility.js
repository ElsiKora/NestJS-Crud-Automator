import { ErrorException } from "../../error-exception.utility";
import { ApiControllerGetMethodName } from "./get-method-name.utility";
export function ApiControllerWriteMethod(thisTarget, target, method, properties, entityMetadata) {
    const methodName = ApiControllerGetMethodName(method);
    if (target[methodName]) {
        throw ErrorException(`Reserved method ${methodName} already defined`);
    }
    thisTarget[method](method, methodName, properties, entityMetadata);
}
//# sourceMappingURL=write-method.utility.js.map