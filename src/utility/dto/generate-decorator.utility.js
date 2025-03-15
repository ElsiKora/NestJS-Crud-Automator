import { DTO_UTILITY_CONSTANT } from "../../constant/utility/dto/constant";
import { ErrorException } from "../error-exception.utility";
export function DtoGenerateDecorator(metadata, entity, config, method, dtoType, propertyName) {
    const factory = DTO_UTILITY_CONSTANT.PROPERTY_DECORATOR_FACTORIES[metadata.type];
    if (!factory) {
        throw ErrorException(`Unknown property type ${metadata.type}`);
    }
    return factory.create(metadata, entity, config, method, dtoType, propertyName);
}
//# sourceMappingURL=generate-decorator.utility.js.map