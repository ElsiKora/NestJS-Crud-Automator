/* eslint-disable @elsikora/javascript/no-dupe-class-members */

import type { IMetadataEntry } from "@interface/class";
import type { TMetadata } from "@type/class";

import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";

export class MetadataStorage {
	private static instance: MetadataStorage;

	private readonly STORAGE: Map<string, Map<string, IMetadataEntry>> = new Map<string, Map<string, IMetadataEntry>>();

	public static getInstance(): MetadataStorage {
		if (!MetadataStorage.instance) {
			MetadataStorage.instance = new MetadataStorage();
		}

		return MetadataStorage.instance;
	}

	public getAllEntitiesMetadata(): Record<string, TMetadata> {
		const result: Record<string, TMetadata> = {};

		for (const [entityName, entityMetadata] of this.STORAGE.entries()) {
			result[entityName] = Object.fromEntries(entityMetadata);
		}

		return result;
	}

	public getMetadata(entityName: string): TMetadata | undefined;
	public getMetadata(entityName: string, propertyName: string): IMetadataEntry | undefined;
	public getMetadata<K extends keyof IMetadataEntry>(entityName: string, propertyName: string, key: K): IMetadataEntry[K] | undefined;
	public getMetadata(entityName: string, propertyName?: string, key?: keyof IMetadataEntry): IMetadataEntry | IMetadataEntry[keyof IMetadataEntry] | TMetadata | undefined {
		const entityMetadata: Map<string, IMetadataEntry> | undefined = this.STORAGE.get(entityName);

		if (!entityMetadata) return undefined;

		if (!propertyName) return Object.fromEntries(entityMetadata);
		const propertyMetadata: IMetadataEntry | undefined = entityMetadata.get(propertyName);

		if (!propertyMetadata) return undefined;

		if (!key) return propertyMetadata;

		return propertyMetadata[key];
	}

	public setMetadata<K extends keyof IMetadataEntry>(entityName: string, propertyName: string, key: K, value: IMetadataEntry[K]): void {
		if (!this.STORAGE.has(entityName)) {
			this.STORAGE.set(entityName, new Map());
		}
		// eslint-disable-next-line @elsikora/typescript/no-non-null-assertion
		const entityMetadata: Map<string, IMetadataEntry> = this.STORAGE.get(entityName)!;

		if (!entityMetadata.has(propertyName)) {
			entityMetadata.set(propertyName, { [PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_PROPERTY_NAME]: {} });
		}

		// eslint-disable-next-line @elsikora/typescript/no-non-null-assertion
		const propertyMetadata: IMetadataEntry = entityMetadata.get(propertyName)!;
		propertyMetadata[key] = value;
	}
}
