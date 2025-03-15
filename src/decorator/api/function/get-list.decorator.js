import { HttpException, InternalServerErrorException } from "@nestjs/common";
import { EErrorStringAction } from "../../../enum";
import { ErrorException } from "../../../utility/error-exception.utility";
import { ErrorString } from "../../../utility/error-string.utility";
export function ApiFunctionGetList(properties) {
    const { entity } = properties;
    return function (_target, _propertyKey, descriptor) {
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
        const [items, totalCount] = await repository.findAndCount(properties);
        return {
            count: items.length,
            currentPage: items.length === 0 ? 0 : properties.skip ? Math.ceil(properties.skip / properties?.take) + 1 : 1,
            items,
            totalCount,
            totalPages: Math.ceil(totalCount / properties.take),
        };
    }
    catch (error) {
        if (error instanceof HttpException) {
            throw error;
        }
        throw new InternalServerErrorException(ErrorString({
            entity: entity,
            type: EErrorStringAction.FETCHING_LIST_ERROR,
        }));
    }
}
//# sourceMappingURL=get-list.decorator.js.map