declare module "class-transformer/cjs/storage.js" {
	type TMetadata<TOptions> = { options?: TOptions };

	export const defaultMetadataStorage: {
		findExcludeMetadata: (target: object, propertyName: string | symbol) => TMetadata<{ toClassOnly?: boolean; toPlainOnly?: boolean }> | undefined;
		findExposeMetadata: (target: object, propertyName: string | symbol) => TMetadata<{ name?: string }> | undefined;
		getExposedProperties: (target: object, transformationType: number) => Array<string>;
	};
}
