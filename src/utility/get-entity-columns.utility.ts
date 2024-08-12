import {BaseEntity, getMetadataArgsStorage} from "typeorm";

export function GetEntityColumns<E extends BaseEntity>(
    entity: new () => E,
    onlyGenerated: boolean = false
): Array<keyof E> {
    const columns = getMetadataArgsStorage().columns.filter(col => col.target === entity);

    return columns
        .filter(column => !onlyGenerated || column.options.generated || column.options.default !== undefined)
        .map(column => column.propertyName) as Array<keyof E>;
}
