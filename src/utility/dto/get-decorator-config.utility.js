import { DTO_UTILITY_CONSTANT } from "../../constant/utility/dto/constant";
import { DtoValidatePropertyConfig } from "./validate-property-config.utility";
export const DtoGetDecoratorConfig = (method, metadata, dtoType, propertyName) => {
    const strategy = DTO_UTILITY_CONSTANT.DTO_STRATEGIES[dtoType];
    if (!strategy) {
        throw new Error(`Unknown DTO type ${dtoType}`);
    }
    let config = strategy.getDecoratorConfig(method, metadata);
    const properties = metadata.properties?.[method];
    if (properties && properties[dtoType]) {
        const customConfig = properties[dtoType];
        DtoValidatePropertyConfig(customConfig, propertyName);
        config = { ...config, ...customConfig };
    }
    return config;
};
//# sourceMappingURL=get-decorator-config.utility.js.map