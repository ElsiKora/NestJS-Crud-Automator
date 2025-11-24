import type { IRegistry } from "@elsikora/cladi";
import type { IMetadataEntry } from "@interface/class";
import type { TMetadata } from "@type/class";

import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { createRegistry } from "@elsikora/cladi";
import { LoggerUtility } from "@utility/logger.utility";

const metadataStorageLogger: LoggerUtility = LoggerUtility.getLogger("MetadataStorage");

class EntityMetadataWrapper {
	private readonly PROPERTIES: Map<string | symbol, IMetadataEntry>;

	constructor(private readonly entityName: string) {
		this.PROPERTIES = new Map<string | symbol, IMetadataEntry>();
	}

	public asRecord(): TMetadata {
		return Object.fromEntries(this.PROPERTIES) as TMetadata;
	}

	public getName(): string {
		return this.entityName;
	}

	public getProperty(propertyName: string | symbol): IMetadataEntry | undefined {
		return this.PROPERTIES.get(propertyName);
	}

	public getPropertyCount(): number {
		return this.PROPERTIES.size;
	}

	public setProperty<K extends keyof IMetadataEntry>(propertyName: string | symbol, key: K, value: IMetadataEntry[K]): void {
		if (!this.PROPERTIES.has(propertyName)) {
			this.PROPERTIES.set(propertyName, { [PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY]: {} });
		}

		// eslint-disable-next-line @elsikora/typescript/no-non-null-assertion
		const entry: IMetadataEntry = this.PROPERTIES.get(propertyName)!;
		entry[key] = value;
	}
}

/**
 * Singleton class for storing and retrieving entity property metadata.
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/api-reference/classes#metadatastorage | API Reference - MetadataStorage}
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/core-concepts/metadata-storage | Core Concepts - Metadata Storage}
 */
export class MetadataStorage {
	private static instance: MetadataStorage;

	private readonly REGISTRY: IRegistry<EntityMetadataWrapper>;

	constructor() {
		this.REGISTRY = createRegistry<EntityMetadataWrapper>({});
	}

	public static getInstance(): MetadataStorage {
		if (!MetadataStorage.instance) {
			MetadataStorage.instance = new MetadataStorage();
		}

		return MetadataStorage.instance;
	}

	public getAllEntitiesMetadata(): Record<string, TMetadata> {
		const result: Record<string, TMetadata> = {};

		for (const wrapper of this.REGISTRY.getAll()) {
			result[wrapper.getName()] = wrapper.asRecord();
		}

		return result;
	}

	public getMetadata(entityName: string): TMetadata | undefined;
	public getMetadata(entityName: string, propertyName: string): IMetadataEntry | undefined;
	public getMetadata<K extends keyof IMetadataEntry>(entityName: string, propertyName: string, key: K): IMetadataEntry[K] | undefined;
	public getMetadata(entityName: string, propertyName?: string, key?: keyof IMetadataEntry): IMetadataEntry | IMetadataEntry[keyof IMetadataEntry] | TMetadata | undefined {
		const wrapper: EntityMetadataWrapper | undefined = this.REGISTRY.get(entityName);

		if (!wrapper) return undefined;

		if (!propertyName) return wrapper.asRecord();

		const propertyMetadata: IMetadataEntry | undefined = wrapper.getProperty(propertyName);

		if (!propertyMetadata) return undefined;

		if (!key) return propertyMetadata;

		return propertyMetadata[key];
	}

	public setMetadata<K extends keyof IMetadataEntry>(entityName: string, propertyName: string | symbol, key: K, value: IMetadataEntry[K]): void {
		let wrapper: EntityMetadataWrapper | undefined = this.REGISTRY.get(entityName);

		if (!wrapper) {
			wrapper = new EntityMetadataWrapper(entityName);
			this.REGISTRY.register(wrapper);
			metadataStorageLogger.debug(`Registered new entity metadata wrapper for "${entityName}"`);
		}

		wrapper.setProperty(propertyName, key, value);
		metadataStorageLogger.debug(`Total properties for entity "${entityName}": ${wrapper.getPropertyCount()}`);
		metadataStorageLogger.debug(
			`All registered entities: [${this.REGISTRY.getAll()
				.map((w: EntityMetadataWrapper) => w.getName())
				.join(", ")}]`,
		);
	}
}
