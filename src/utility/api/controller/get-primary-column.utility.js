export function ApiControllerGetPrimaryColumn(parameters, entityMetadata) {
    const primaryKeyColumn = entityMetadata.columns.find((column) => column.isPrimary);
    if (!primaryKeyColumn) {
        return undefined;
    }
    return {
        key: primaryKeyColumn.name,
        value: parameters[primaryKeyColumn.name],
    };
}
//# sourceMappingURL=get-primary-column.utility.js.map