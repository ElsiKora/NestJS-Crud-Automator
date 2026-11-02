import { ErrorException } from "@utility/error/exception.utility";
import { Expose } from "class-transformer";
import { defaultMetadataStorage } from "class-transformer/cjs/storage.js";

/**
 * Exposes a property under its own name, unless an `@Expose` of the class or a parent already covers it.
 * class-transformer keeps one `@Expose` per property and the last one wins, so without this check the bare `Expose()` of an `@ApiProperty*` decorator
 * would erase the name, groups or versions of an explicit `@Expose` that ran before it. Which one runs first depends on the source order and on when a lazy entity resolves.
 * class-transformer does not export its storage from the package root; `cjs/storage.js` is the instance its Node entry point writes to. A bundler that picks another
 * entry would leave this check blind, so that fails here rather than silently losing an explicit `@Expose`.
 * @param {object} target - Decorated DTO prototype.
 * @param {string | symbol} propertyKey - Decorated property key.
 */
export function ApplyAutoExpose(target: object, propertyKey: string | symbol): void {
	if (defaultMetadataStorage.findExposeMetadata(target.constructor, String(propertyKey))) {
		return;
	}

	Expose()(target, propertyKey);

	if (!defaultMetadataStorage.findExposeMetadata(target.constructor, String(propertyKey))) {
		throw ErrorException(`Cannot read class-transformer metadata for '${target.constructor.name}.${String(propertyKey)}': 'class-transformer' and 'class-transformer/cjs/storage.js' resolve to different copies. Resolve 'class-transformer' to its CommonJS entry in your bundler`);
	}
}
