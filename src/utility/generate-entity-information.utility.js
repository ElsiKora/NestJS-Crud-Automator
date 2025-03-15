import { DefaultNamingStrategy, getMetadataArgsStorage } from "typeorm";
import { MetadataStorage } from "../class";
import { ErrorException } from "./error-exception.utility";
export function GenerateEntityInformation(entity) {
    const generatedEntity = {
        columns: [],
        name: "",
        primaryKey: undefined,
        tableName: "",
    };
    generatedEntity.tableName = (() => {
        const table = getMetadataArgsStorage().tables.find(({ target }) => target.name === entity.name);
        if (!table) {
            throw ErrorException(`Table for entity ${String(entity.name)} not found in metadata storage`);
        }
        const namingStrategy = (tableName) => new DefaultNamingStrategy().tableName(entity.name ?? "UnknownResource", tableName);
        if (!table.name && table.type === "entity-child") {
            const discriminatorValue = getMetadataArgsStorage().discriminatorValues.find(({ target }) => target == entity);
            if (!discriminatorValue?.value) {
                throw ErrorException(`Discriminator value for entity ${String(entity.name)} not found in metadata storage`);
            }
            else if (typeof discriminatorValue.value === "string") {
                return namingStrategy(discriminatorValue.value);
            }
            else {
                return namingStrategy(discriminatorValue.value?.name);
            }
        }
        return namingStrategy(table.name);
    })();
    generatedEntity.name = entity.name;
    const storage = MetadataStorage.getInstance();
    const columnList = getMetadataArgsStorage().columns.filter(({ target }) => target.name === entity.name);
    const relationList = getMetadataArgsStorage().relations.filter(({ target }) => target.name === entity.name);
    const entityColumns = [
        ...columnList.map(({ options, propertyName }) => ({
            isPrimary: Boolean(options.primary),
            metadata: storage.getMetadata(entity.name ?? "UnknownResource", propertyName) || undefined,
            name: propertyName,
            type: options.type,
        })),
        ...relationList.map(({ propertyName, relationType }) => ({
            isPrimary: false,
            metadata: storage.getMetadata(entity.name ?? "UnknownResource", propertyName) || undefined,
            name: propertyName,
            type: relationType,
        })),
    ];
    for (const column of entityColumns) {
        if (column.isPrimary) {
            generatedEntity.primaryKey = column;
        }
    }
    generatedEntity.columns = entityColumns;
    return generatedEntity;
}
//# sourceMappingURL=generate-entity-information.utility.js.map