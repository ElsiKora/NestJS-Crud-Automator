import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "../constant";
export class MetadataStorage {
    static instance;
    STORAGE = new Map();
    static getInstance() {
        if (!MetadataStorage.instance) {
            MetadataStorage.instance = new MetadataStorage();
        }
        return MetadataStorage.instance;
    }
    getAllEntitiesMetadata() {
        const result = {};
        for (const [entityName, entityMetadata] of this.STORAGE.entries()) {
            result[entityName] = Object.fromEntries(entityMetadata);
        }
        return result;
    }
    getMetadata(entityName, propertyName, key) {
        const entityMetadata = this.STORAGE.get(entityName);
        if (!entityMetadata)
            return undefined;
        if (!propertyName)
            return Object.fromEntries(entityMetadata);
        const propertyMetadata = entityMetadata.get(propertyName);
        if (!propertyMetadata)
            return undefined;
        if (!key)
            return propertyMetadata;
        return propertyMetadata[key];
    }
    setMetadata(entityName, propertyName, key, value) {
        if (!this.STORAGE.has(entityName)) {
            this.STORAGE.set(entityName, new Map());
        }
        const entityMetadata = this.STORAGE.get(entityName);
        if (!entityMetadata.has(propertyName)) {
            entityMetadata.set(propertyName, { [PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_PROPERTY_NAME]: {} });
        }
        const propertyMetadata = entityMetadata.get(propertyName);
        propertyMetadata[key] = value;
    }
}
//# sourceMappingURL=metadata-storage.class.js.map