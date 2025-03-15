import { HttpException, InternalServerErrorException } from "@nestjs/common";
import { EErrorStringAction } from "../../../enum";
import { ErrorException } from "../../../utility/error-exception.utility";
import { ErrorString } from "../../../utility/error-string.utility";
export function ApiFunctionCreate(properties) {
    const { entity } = properties;
    return function (target, propertyKey, descriptor) {
        void target;
        void propertyKey;
        descriptor.value = async function (properties) {
            const repository = this.repository;
            if (!repository) {
                throw ErrorException("Repository is not available in this context");
            }
            return executor({ entity, properties, repository });
        };
        return descriptor;
    };
}
async function executor(options) {
    const { entity, properties, repository } = options;
    try {
        return await repository.save(properties);
    }
    catch (error) {
        if (error instanceof HttpException) {
            throw error;
        }
        throw new InternalServerErrorException(ErrorString({
            entity: entity,
            type: EErrorStringAction.CREATING_ERROR,
        }));
    }
}
//# sourceMappingURL=create.decorator.js.map