export class MetadataStorage {
	private static instance: MetadataStorage;

	private readonly STORAGE: Map<string, Map<string, any>> = new Map<string, Map<string, any>>();

	public static getInstance(): MetadataStorage {
		if (!MetadataStorage.instance) {
			MetadataStorage.instance = new MetadataStorage();
		}

		return MetadataStorage.instance;
	}

	public getAllEntitiesMetadata(): Record<string, Record<string, any>> {
		const result: Record<string, Record<string, any>> = {};

		for (const [entityName, entityMetadata] of this.STORAGE.entries()) {
			result[entityName] = Object.fromEntries(entityMetadata);
		}

		return result;
	}

	public getMetadata(entityName: string, propertyName?: string, key?: string): any {
		const entityMetadata: Map<string, any> | undefined = this.STORAGE.get(entityName);

		if (!entityMetadata) return undefined;

		if (!propertyName) return Object.fromEntries(entityMetadata);
		const propertyMetadata: unknown = entityMetadata.get(propertyName);

		if (!propertyMetadata) return undefined;

		if (!key) return propertyMetadata;

		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-expect-error
		return propertyMetadata[key];
	}

	public setMetadata(entityName: string, propertyName: string, key: string, value: unknown): void {
		if (!this.STORAGE.has(entityName)) {
			this.STORAGE.set(entityName, new Map());
		}
		const entityMetadata: Map<string, any> = this.STORAGE.get(entityName)!;

		if (!entityMetadata.has(propertyName)) {
			entityMetadata.set(propertyName, {});
		}
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		entityMetadata.get(propertyName)[key] = value;
	}
}
