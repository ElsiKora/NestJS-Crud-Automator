import "reflect-metadata";
import { BaseEntity, getMetadataArgsStorage } from "typeorm";
import {ColumnMetadataArgs} from "typeorm/metadata-args/ColumnMetadataArgs";
import {MetadataArgsStorage} from "typeorm/metadata-args/MetadataArgsStorage";
import {IApiFilterOrderBy, TFilterFieldSelector} from "../../type";
import {API_FILTER_INTERFACE_CONSTANT} from "../../constant/interface/api/filter.constant";

export function FilterOrderByFromEntity<E extends BaseEntity>(
    entityClass: new () => E,
    fieldSelector?: TFilterFieldSelector<E>
): IApiFilterOrderBy<E> {
    const metadata: MetadataArgsStorage = getMetadataArgsStorage();
    const columns: ColumnMetadataArgs[] = metadata.columns.filter(col => col.target === entityClass);

    if (fieldSelector) {
        const entityFields: Set<string> = new Set(columns.map(col => col.propertyName));
        for (const field in fieldSelector) {
            if (!entityFields.has(field)) {
                throw new Error(`Field "${field}" does not exist in the entity.`);
            }
        }
    }

    return columns.reduce((acc: IApiFilterOrderBy<E>, column: ColumnMetadataArgs) => {
        const columnType = column.options?.type || Reflect.getMetadata("design:type", entityClass.prototype, column.propertyName);
        console.log("TYPE", column.propertyName, columnType);
        if ((typeof columnType === 'function' && (columnType === String || columnType === Number || columnType === Date)) || API_FILTER_INTERFACE_CONSTANT.ALLOWED_ENTITY_TO_FILTER_COLUMNS.includes(columnType as string) &&
            (fieldSelector === undefined || fieldSelector[column.propertyName as keyof E] !== false)) {
            const snakeUpperCase: string = column.propertyName.split('').map((char, index) => {
                if (index > 0 && char === char.toUpperCase() && char !== char.toLowerCase()) {
                    return '_' + char;
                }
                return char;
            }).join('').toUpperCase();

            acc[snakeUpperCase as keyof IApiFilterOrderBy<E>] = column.propertyName as any;
        }
        return acc;
    }, {} as IApiFilterOrderBy<E>);
}
