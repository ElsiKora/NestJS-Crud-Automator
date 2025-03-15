import { HttpException, InternalServerErrorException } from "@nestjs/common";
import { EErrorStringAction } from "../../../enum";
import { ErrorException } from "../../../utility/error-exception.utility";
import { ErrorString } from "../../../utility/error-string.utility";
import { ApiFunctionGet } from "./get.decorator";
export function ApiFunctionDelete(properties) {
    const { entity } = properties;
    const getDecorator = ApiFunctionGet({ entity });
    let getFunction;
    return function (target, propertyKey, descriptor) {
        void target;
        void propertyKey;
        descriptor.value = async function (criteria) {
            const repository = this.repository;
            if (!repository) {
                throw ErrorException("Repository is not available in this context");
            }
            if (!getFunction) {
                const getDescriptor = {
                    value: function () {
                        return Promise.reject(ErrorException("Not implemented"));
                    },
                };
                getDecorator(this, "get", getDescriptor);
                if (getDescriptor.value) {
                    getFunction = getDescriptor.value.bind(this);
                }
                else {
                    throw ErrorException("Get function is not properly decorated");
                }
            }
            return executor({ criteria, entity, getFunction, repository });
        };
        return descriptor;
    };
}
async function executor(options) {
    const { criteria, entity, getFunction, repository } = options;
    try {
        const existingEntity = await getFunction({ where: criteria });
        return await repository.remove(existingEntity);
    }
    catch (error) {
        if (error instanceof HttpException) {
            throw error;
        }
        throw new InternalServerErrorException(ErrorString({
            entity: entity,
            type: EErrorStringAction.UPDATING_ERROR,
        }));
    }
}
//# sourceMappingURL=delete.decorator.js.map