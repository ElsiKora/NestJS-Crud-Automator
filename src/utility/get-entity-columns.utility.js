import { getMetadataArgsStorage } from "typeorm";
export function GetEntityColumns(properties) {
    const { entity, shouldTakeGeneratedOnly, shouldTakeRelationsOnly } = properties;
    const columns = getMetadataArgsStorage().columns.filter((column) => column.target == entity);
    const relations = getMetadataArgsStorage().relations.filter((relation) => relation.target == entity);
    let columnNames;
    if (shouldTakeRelationsOnly) {
        columnNames = relations.map((relation) => relation.propertyName);
    }
    else {
        const columnPropertyNames = columns.filter((column) => !shouldTakeGeneratedOnly || column.options.generated || column.options.default !== undefined).map((column) => column.propertyName);
        const relationNames = relations.map((relation) => relation.propertyName);
        columnNames = [...columnPropertyNames, ...relationNames];
    }
    return columnNames;
}
//# sourceMappingURL=get-entity-columns.utility.js.map