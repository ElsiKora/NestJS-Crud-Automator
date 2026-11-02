import { ErrorException } from "@utility/error/exception.utility";
import { Expose } from "class-transformer";
import { defaultMetadataStorage } from "class-transformer/cjs/storage.js";

class ClassTransformerStorageProbe {}

/**
 * Returns the metadata storage of class-transformer once it proves to be the one its decorators write to.
 * class-transformer does not export its storage from the package root; `cjs/storage.js` is the instance its Node entry point writes to. A bundler that
 * picks another entry would leave every read of it blind, so that fails here rather than silently losing metadata.
 * @param {object} target - Decorated DTO prototype, named in the error.
 * @param {string | symbol} propertyKey - Decorated property key, named in the error.
 * @returns {typeof defaultMetadataStorage} The storage class-transformer decorators write to.
 */
export function ClassTransformerGetStorage(target: object, propertyKey: string | symbol): typeof defaultMetadataStorage {
	Expose()(ClassTransformerStorageProbe.prototype, "probe");

	if (!defaultMetadataStorage.findExposeMetadata(ClassTransformerStorageProbe, "probe")) {
		throw ErrorException(`Cannot read class-transformer metadata for '${target.constructor.name}.${String(propertyKey)}': the bundle loads two copies. Alias exactly 'class-transformer' to 'class-transformer/cjs/index.js', set main before module in the bundler's mainFields, or mark both 'class-transformer' and 'class-transformer/cjs/storage.js' external.`);
	}

	return defaultMetadataStorage;
}
