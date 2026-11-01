import type { IMetadataEntry } from "@interface/class";
import type { TMetadata, TMetadataStorageTarget } from "@type/class";

import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { LoggerUtility } from "@utility/logger.utility";

const metadataStorageLogger: LoggerUtility = LoggerUtility.getLogger("MetadataStorage");

class EntityMetadataWrapper {
	private readonly PROPERTIES: Map<string | symbol, IMetadataEntry>;

	constructor(private readonly target: TMetadataStorageTarget) {
		this.PROPERTIES = new Map<string | symbol, IMetadataEntry>();
	}

	public asRecord(): TMetadata {
		return Object.fromEntries(this.PROPERTIES);
	}

	public getProperty(propertyName: string | symbol): IMetadataEntry | undefined {
		return this.PROPERTIES.get(propertyName);
	}

	public getPropertyCount(): number {
		return this.PROPERTIES.size;
	}

	public getTarget(): TMetadataStorageTarget {
		return this.target;
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
 * Metadata is keyed by the class constructor, never by its name, and a class sees its own metadata merged with its ancestors'.
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/api-reference/classes#metadatastorage | API Reference - MetadataStorage}
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/core-concepts/metadata-storage | Core Concepts - Metadata Storage}
 */
export class MetadataStorage {
	private static instance: MetadataStorage;

	private readonly REGISTRY: Map<TMetadataStorageTarget, EntityMetadataWrapper>;

	constructor() {
		this.REGISTRY = new Map();
	}

	public static getInstance(): MetadataStorage {
		if (!MetadataStorage.instance) {
			MetadataStorage.instance = new MetadataStorage();
		}

		return MetadataStorage.instance;
	}

	/**
	 * Returns the metadata each registered class declares itself, without its ancestors' metadata.
	 * @returns {Map<TMetadataStorageTarget, TMetadata>} Own metadata keyed by class.
	 */
	public getAllEntitiesMetadata(): Map<TMetadataStorageTarget, TMetadata> {
		const result: Map<TMetadataStorageTarget, TMetadata> = new Map<TMetadataStorageTarget, TMetadata>();

		for (const wrapper of this.REGISTRY.values()) {
			result.set(wrapper.getTarget(), wrapper.asRecord());
		}

		return result;
	}

	/**
	 * Reads the metadata of a class and its ancestors. A property declared on the class wins over the same property on an ancestor.
	 * @param {TMetadataStorageTarget} target - Class to read.
	 * @param {string} [propertyName] - Property to read; all properties when omitted.
	 * @param {keyof IMetadataEntry} [key] - Metadata key to read from the property entry.
	 * @returns {IMetadataEntry | IMetadataEntry[keyof IMetadataEntry] | TMetadata | undefined} Merged metadata, one property entry, one key, or undefined when the class and its ancestors have none.
	 */
	public getMetadata(target: TMetadataStorageTarget): TMetadata | undefined;
	public getMetadata(target: TMetadataStorageTarget, propertyName: string): IMetadataEntry | undefined;
	public getMetadata<K extends keyof IMetadataEntry>(target: TMetadataStorageTarget, propertyName: string, key: K): IMetadataEntry[K] | undefined;
	public getMetadata(target: TMetadataStorageTarget, propertyName?: string, key?: keyof IMetadataEntry): IMetadataEntry | IMetadataEntry[keyof IMetadataEntry] | TMetadata | undefined {
		const wrappers: Array<EntityMetadataWrapper> = this.getLineageWrappers(target);

		if (wrappers.length === 0) return undefined;

		if (propertyName === undefined) {
			const merged: TMetadata = {};

			for (const wrapper of wrappers.toReversed()) {
				Object.assign(merged, wrapper.asRecord());
			}

			return merged;
		}

		for (const wrapper of wrappers) {
			const propertyMetadata: IMetadataEntry | undefined = wrapper.getProperty(propertyName);

			if (propertyMetadata) {
				return key ? propertyMetadata[key] : propertyMetadata;
			}
		}

		return undefined;
	}

	/**
	 * Stores metadata for a property the class declares itself.
	 * @param {TMetadataStorageTarget} target - Class that declares the property.
	 * @param {string | symbol} propertyName - Property name.
	 * @param {K} key - Metadata key.
	 * @param {IMetadataEntry[K]} value - Metadata value.
	 * @template K - Metadata key type.
	 */
	public setMetadata<K extends keyof IMetadataEntry>(target: TMetadataStorageTarget, propertyName: string | symbol, key: K, value: IMetadataEntry[K]): void {
		let wrapper: EntityMetadataWrapper | undefined = this.REGISTRY.get(target);

		if (!wrapper) {
			wrapper = new EntityMetadataWrapper(target);
			this.REGISTRY.set(target, wrapper);
			metadataStorageLogger.debug(`Registered new entity metadata wrapper for "${target.name}"`);
		}

		wrapper.setProperty(propertyName, key, value);
		metadataStorageLogger.debug(`Total properties for entity "${target.name}": ${wrapper.getPropertyCount()}`);
	}

	/**
	 * Collects the registered wrappers of a class and its ancestors, nearest first, by walking the constructor prototype chain.
	 * @param {TMetadataStorageTarget} target - Class to start from.
	 * @returns {Array<EntityMetadataWrapper>} Wrappers of the class and its ancestors that have metadata.
	 */
	private getLineageWrappers(target: TMetadataStorageTarget): Array<EntityMetadataWrapper> {
		const wrappers: Array<EntityMetadataWrapper> = [];
		let current: unknown = target;

		while (typeof current === "function" && current !== Function.prototype) {
			const wrapper: EntityMetadataWrapper | undefined = this.REGISTRY.get(current as TMetadataStorageTarget);

			if (wrapper) {
				wrappers.push(wrapper);
			}

			current = Object.getPrototypeOf(current);
		}

		return wrappers;
	}
}
