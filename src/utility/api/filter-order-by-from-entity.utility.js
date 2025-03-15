import { getMetadataArgsStorage } from "typeorm";
import { FILTER_API_INTERFACE_CONSTANT, PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "../../constant";
import "reflect-metadata";
export function FilterOrderByFromEntity(entity, entityMetadata, method, dtoType, fieldSelector) {
    const metadata = getMetadataArgsStorage();
    const columns = metadata.columns.filter((column) => column.target == entity);
    if (fieldSelector) {
        const entityFields = new Set(columns.map((col) => col.propertyName));
        for (const field in fieldSelector) {
            if (!entityFields.has(field)) {
                throw new Error(`Field "${field}" does not exist in the entity.`);
            }
        }
    }
    const accumulator = {};
    for (const column of columns) {
        const columnType = column.options?.type || Reflect.getMetadata("design:type", entity.prototype, column.propertyName);
        const isAllowedType = (typeof columnType === "function" && (columnType === String || columnType === Number || columnType === Date)) || (FILTER_API_INTERFACE_CONSTANT.ALLOWED_ENTITY_TO_FILTER_COLUMNS.includes(columnType) && (fieldSelector === undefined || fieldSelector[column.propertyName] !== false));
        if (isAllowedType) {
            for (const metadataColumn of entityMetadata.columns) {
                const metadata = metadataColumn.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_PROPERTY_NAME];
                const useAsFilter = metadata?.properties?.[method]?.[dtoType]?.useAsOrderByFilter ?? false;
                if (metadataColumn.name == column.propertyName && metadata && (useAsFilter == undefined || useAsFilter)) {
                    const snakeUpperCase = column.propertyName
                        .split("")
                        .map((char, index) => {
                        if (index > 0 && char === char.toUpperCase() && char !== char.toLowerCase()) {
                            return "_" + char;
                        }
                        return char;
                    })
                        .join("")
                        .toUpperCase();
                    accumulator[snakeUpperCase] = column.propertyName;
                }
            }
        }
    }
    return accumulator;
}
//# sourceMappingURL=filter-order-by-from-entity.utility.js.map