declare module "class-transformer/cjs/storage.js" {
	type TExcludeOptions = { toClassOnly?: boolean; toPlainOnly?: boolean };
	type TExposeOptions = { groups?: Array<string>; name?: string; since?: number; toClassOnly?: boolean; toPlainOnly?: boolean; until?: number };
	type TMetadata<TOptions> = { options?: TOptions; propertyName: string };
	type TTypeMetadata = {
		options: { discriminator?: { property: string; subTypes: Array<{ name: string; value: new () => unknown }> } };
		typeFunction: (options: { newObject: unknown; object: object; property: string }) => unknown;
	};

	export const defaultMetadataStorage: {
		findExcludeMetadata: (target: object, propertyName: string | symbol) => TMetadata<TExcludeOptions> | undefined;
		findExposeMetadata: (target: object, propertyName: string | symbol) => TMetadata<TExposeOptions> | undefined;
		findTypeMetadata: (target: object, propertyName: string) => TTypeMetadata | undefined;
		getExcludedMetadatas: (target: object) => Array<TMetadata<TExcludeOptions>>;
		getExposedMetadatas: (target: object) => Array<TMetadata<TExposeOptions>>;
		getExposedProperties: (target: object, transformationType: number) => Array<string>;
		getStrategy: (target: object) => "excludeAll" | "exposeAll" | "none";
	};
}
