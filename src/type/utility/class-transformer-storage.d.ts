declare module "class-transformer/cjs/storage.js" {
	type TExcludeOptions = { toClassOnly?: boolean; toPlainOnly?: boolean };
	type TExposeOptions = { groups?: Array<string>; name?: string; since?: number; toClassOnly?: boolean; toPlainOnly?: boolean; until?: number };
	type TMetadata<TOptions> = { options?: TOptions; propertyName: string };

	export const defaultMetadataStorage: {
		findExcludeMetadata: (target: object, propertyName: string | symbol) => TMetadata<TExcludeOptions> | undefined;
		findExposeMetadata: (target: object, propertyName: string | symbol) => TMetadata<TExposeOptions> | undefined;
		getExcludedMetadatas: (target: object) => Array<TMetadata<TExcludeOptions>>;
		getExposedMetadatas: (target: object) => Array<TMetadata<TExposeOptions>>;
		getExposedProperties: (target: object, transformationType: number) => Array<string>;
		getStrategy: (target: object) => "excludeAll" | "exposeAll" | "none";
	};
}
