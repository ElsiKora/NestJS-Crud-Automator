import { ErrorString } from "../../error-string.utility";
export async function ApiControllerValidateRequest(validators, properties, parameters) {
    if (validators) {
        for (const validator of validators) {
            const result = validator.validationFunction(parameters);
            const isValid = result instanceof Promise ? await result : result;
            if (!isValid) {
                throw new validator.exception(ErrorString({ entity: properties.entity, type: validator.errorType }));
            }
        }
    }
}
//# sourceMappingURL=validate-request.utility.js.map