import { MetadataStorage } from "../../../class";
import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "../../../constant";
export function ApiPropertyDescribe(properties) {
    return (target, propertyKey) => {
        const entityName = target.constructor.name;
        MetadataStorage.getInstance().setMetadata(entityName, propertyKey, PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_PROPERTY_NAME, properties);
    };
}
//# sourceMappingURL=describe.decorator.js.map