import { HttpException, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { EErrorStringAction } from "../../../enum";
import { ErrorException } from "../../../utility/error-exception.utility";
import { ErrorString } from "../../../utility/error-string.utility";
export function ApiFunctionGetMany(properties) {
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
        const items = await repository.find(properties);
        if (items.length === 0) {
            throw new NotFoundException(ErrorString({ entity, type: EErrorStringAction.NOT_FOUND }));
        }
        return items;
    }
    catch (error) {
        if (error instanceof HttpException) {
            throw error;
        }
        throw new InternalServerErrorException(ErrorString({
            entity,
            type: EErrorStringAction.FETCHING_ERROR,
        }));
    }
}
//# sourceMappingURL=get-many.decorator.js.map