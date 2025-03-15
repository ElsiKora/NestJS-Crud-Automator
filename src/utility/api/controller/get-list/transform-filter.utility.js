import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "../../../../constant";
import { EApiPropertyDescribeType } from "../../../../enum";
import { ApiControllerGetListTransformOperation } from "./transform-operation.utility";
export function ApiControllerGetListTransformFilter(query, entityMetadata) {
    const filter = {};
    for (const fullKey of Object.keys(query)) {
        if (!fullKey.includes("["))
            continue;
        const [key, field] = fullKey.split("[");
        const cleanField = field.replace("]", "");
        if (cleanField === "value" || cleanField === "values") {
            const operation = query[`${key}[operator]`];
            const value = query[fullKey];
            if (!operation || !key || value === undefined || value === null)
                continue;
            const column = entityMetadata.columns.find((column) => column.name == key);
            if (column && column.metadata[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_PROPERTY_NAME].type === EApiPropertyDescribeType.RELATION) {
                filter[key] = { id: ApiControllerGetListTransformOperation(operation, value) };
            }
            else {
                filter[key] = ApiControllerGetListTransformOperation(operation, value);
            }
        }
    }
    return filter;
}
//# sourceMappingURL=transform-filter.utility.js.map