declare module "class-transformer/cjs/storage.js" {
	export type TClassTransformerTransformMetadata = {
		options: { groups?: Array<string>; since?: number; toClassOnly?: boolean; toPlainOnly?: boolean; until?: number };
		propertyName: string;
		target: object;
		transformFn: (parameters: unknown) => unknown;
	};
	type TExcludeOptions = { toClassOnly?: boolean; toPlainOnly?: boolean };
	type TExposeOptions = { groups?: Array<string>; name?: string; since?: number; toClassOnly?: boolean; toPlainOnly?: boolean; until?: number };
	type TMetadata<TOptions> = { options?: TOptions; propertyName: string };

	type TTypeMetadata = {
		options: { discriminator?: { property: string; subTypes: Array<{ name: string; value: new () => unknown }> } };
		propertyName: string;
		reflectedType: unknown;
		target: object;
		typeFunction: (options: { newObject: unknown; object: object; property: string }) => unknown;
	};

	export const defaultMetadataStorage: {
		_exposeMetadatas: Map<object, Map<string, TMetadata<TExposeOptions>>>;
		_transformMetadatas: Map<object, Map<string, Array<TClassTransformerTransformMetadata>>>;
		_typeMetadatas: Map<object, Map<string, TTypeMetadata>>;
		addTypeMetadata: (metadata: TTypeMetadata) => void;
		findExcludeMetadata: (target: object, propertyName: string | symbol) => TMetadata<TExcludeOptions> | undefined;
		findExposeMetadata: (target: object, propertyName: string | symbol) => TMetadata<TExposeOptions> | undefined;
		findTransformMetadatas: (target: object, propertyName: string, transformationType: number) => Array<TClassTransformerTransformMetadata>;
		findTypeMetadata: (target: object, propertyName: string) => TTypeMetadata | undefined;
		getAncestors: (target: object) => Array<object>;
		getExcludedMetadatas: (target: object) => Array<TMetadata<TExcludeOptions>>;
		getExposedMetadatas: (target: object) => Array<TMetadata<TExposeOptions>>;
		getExposedProperties: (target: object, transformationType: number) => Array<string>;
		getStrategy: (target: object) => "excludeAll" | "exposeAll" | "none";
	};
}
