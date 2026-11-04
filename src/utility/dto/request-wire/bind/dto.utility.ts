import type { TransformFnParams } from "class-transformer";
import type { TClassTransformerTransformMetadata } from "class-transformer/cjs/storage.js";

import { AUTOMATOR_TRANSFORM_DTO_CONSTANT } from "@constant/dto/automator-transform.constant";
import { REQUEST_WIRE_DTO_CONSTANT } from "@constant/dto/request-wire.constant";
import { EApiDtoType } from "@enum/decorator/api";
import { ClassTransformerAutomatorTransform } from "@utility/class-transformer/automator-transform.utility";
import { ClassTransformerGetStorage } from "@utility/class-transformer/get-storage.utility";
import { ErrorException } from "@utility/error/exception.utility";

type TDtoClass = new (...arguments_: Array<never>) => unknown;
type TParser = (parameters: TransformFnParams) => unknown;
type TStorage = ReturnType<typeof ClassTransformerGetStorage>;

const PLAIN_TYPES: ReadonlySet<unknown> = new Set<unknown>([Array, Boolean, Date, Number, Object, String]);
// Where each class with text conversions was first bound, for the error that names both places.
const JSON_ORIGINS: WeakMap<object, string> = new WeakMap<object, string>();
const TEXT_ORIGINS: WeakMap<object, string> = new WeakMap<object, string>();

/**
 * Binds a request DTO class to the part of the request a route reads it from, which decides whether its `ApiPropertyNumber` and `ApiPropertyBoolean` properties convert text.
 * A query or a path is text, so each such property of the class, inherited ones included, gets the conversion on the class itself, and so does each DTO class nested in it through `@Type`.
 * A JSON body converts nothing; the class, its parents and its nested classes are only recorded, so that one class is never read from both.
 * A property of a generated DTO already follows its DTO type, and a class without such properties is not recorded. Binding a class again to the same part changes nothing.
 * @param {unknown} dto - DTO class; anything else, such as `Object` or `String`, is ignored.
 * @param {EApiDtoType} dtoType - Part of the request: `BODY`, `QUERY` or `PARAMETERS`.
 * @param {string} origin - Where the class is read, such as `the query of route list in controller ItemController`, for the error.
 * @returns {void}
 * @throws {Error} When the class, a parent or a nested class holds such a property and is read both from a JSON body and from a query or a path.
 */
export function DtoRequestWireBindDto(dto: unknown, dtoType: EApiDtoType, origin: string): void {
	if (!isDtoClass(dto)) {
		return;
	}

	const storage: TStorage = ClassTransformerGetStorage(dto.prototype as object, "*");

	if (dtoType === EApiDtoType.BODY) {
		bindJson(storage, dto, origin, new Set<object>());
	} else if (dtoType === EApiDtoType.QUERY || dtoType === EApiDtoType.PARAMETERS) {
		bindText(storage, dto, origin, new Set<object>());
	}
}

/**
 * Records a class read from a JSON body, with its parents and nested classes.
 * @param {TStorage} storage - class-transformer metadata storage.
 * @param {TDtoClass} dto - DTO class.
 * @param {string} origin - Where the class is read.
 * @param {Set<object>} visited - Classes already walked.
 * @returns {void}
 * @throws {Error} When one of them converts text because a query or a path reads it.
 * @private
 */
function bindJson(storage: TStorage, dto: TDtoClass, origin: string, visited: Set<object>): void {
	if (visited.has(dto)) {
		return;
	}

	visited.add(dto);

	// A parent that converts text passes the conversion on to the class.
	for (const current of [dto, ...storage.getAncestors(dto)]) {
		const textOrigin: string | undefined = TEXT_ORIGINS.get(current);

		if (textOrigin !== undefined) {
			throw createConflict(current, textOrigin, origin);
		}

		if (!JSON_ORIGINS.has(current) && collectParsers(storage, current).size > 0) {
			JSON_ORIGINS.set(current, origin);
		}
	}

	for (const nested of collectNestedClasses(storage, dto)) {
		bindJson(storage, nested, origin, visited);
	}
}

/**
 * Adds the text conversion of each property to a class read from a query or a path, and to its nested classes.
 * @param {TStorage} storage - class-transformer metadata storage.
 * @param {TDtoClass} dto - DTO class.
 * @param {string} origin - Where the class is read.
 * @param {Set<object>} visited - Classes already walked.
 * @returns {void}
 * @throws {Error} When a JSON body reads the class or a class that inherits from it.
 * @private
 */
function bindText(storage: TStorage, dto: TDtoClass, origin: string, visited: Set<object>): void {
	if (visited.has(dto)) {
		return;
	}

	visited.add(dto);

	const parsers: Map<string, TParser> = collectParsers(storage, dto);

	if (parsers.size > 0) {
		const jsonOrigin: string | undefined = JSON_ORIGINS.get(dto);

		if (jsonOrigin !== undefined) {
			throw createConflict(dto, origin, jsonOrigin);
		}

		if (!TEXT_ORIGINS.has(dto)) {
			TEXT_ORIGINS.set(dto, origin);
		}

		for (const [propertyName, parser] of parsers) {
			const ownTransforms: Array<TClassTransformerTransformMetadata> = storage._transformMetadatas.get(dto)?.get(propertyName) ?? [];

			if (!ownTransforms.some((metadata: TClassTransformerTransformMetadata): boolean => metadata.transformFn === parser)) {
				ClassTransformerAutomatorTransform(parser, { toClassOnly: true })(dto.prototype as object, propertyName);
			}
		}
	}

	for (const nested of collectNestedClasses(storage, dto)) {
		bindText(storage, nested, origin, visited);
	}
}

/**
 * Lists the DTO classes a class nests through `@Type`, each discriminator subtype included.
 * @param {TStorage} storage - class-transformer metadata storage.
 * @param {TDtoClass} dto - DTO class.
 * @returns {Array<TDtoClass>} The nested classes.
 * @private
 */
function collectNestedClasses(storage: TStorage, dto: TDtoClass): Array<TDtoClass> {
	const propertyNames: Set<string> = new Set<string>([dto, ...storage.getAncestors(dto)].flatMap((current: object): Array<string> => [...(storage._typeMetadatas.get(current)?.keys() ?? [])]));
	const nested: Array<TDtoClass> = [];

	for (const propertyName of propertyNames) {
		const metadata: ReturnType<TStorage["findTypeMetadata"]> = storage.findTypeMetadata(dto, propertyName);

		if (!metadata) {
			continue;
		}

		const candidates: Array<unknown> = metadata.options.discriminator ? metadata.options.discriminator.subTypes.map(({ value }: { value: unknown }): unknown => value) : [readType(metadata, propertyName)];

		for (const candidate of candidates) {
			if (isDtoClass(candidate)) {
				nested.push(candidate);
			}
		}
	}

	return nested;
}

/**
 * Lists the text conversion of each property a class reads, from the nearest class that declares an Automator transform for it.
 * A property is left out when that class converts its text already, or when an Automator decorator other than `ApiPropertyNumber` and `ApiPropertyBoolean` redeclares it.
 * @param {TStorage} storage - class-transformer metadata storage.
 * @param {object} dto - DTO class.
 * @returns {Map<string, TParser>} The conversion of each property that keeps its value as sent.
 * @private
 */
function collectParsers(storage: TStorage, dto: object): Map<string, TParser> {
	const classes: Array<object> = [dto, ...storage.getAncestors(dto)];
	const propertyNames: Set<string> = new Set<string>(classes.flatMap((current: object): Array<string> => [...(storage._transformMetadatas.get(current)?.keys() ?? [])]));
	const parsers: Map<string, TParser> = new Map<string, TParser>();

	for (const propertyName of propertyNames) {
		for (const current of classes) {
			const automatorTransforms: Array<TParser> = (storage._transformMetadatas.get(current)?.get(propertyName) ?? []).map((metadata: TClassTransformerTransformMetadata): TParser => metadata.transformFn).filter((transform: TParser): boolean => Reflect.getMetadata(AUTOMATOR_TRANSFORM_DTO_CONSTANT.METADATA_KEY, transform) === true);

			if (automatorTransforms.length === 0) {
				continue;
			}

			const parser: TParser | undefined = automatorTransforms.map((transform: TParser): TParser | undefined => Reflect.getMetadata(REQUEST_WIRE_DTO_CONSTANT.TEXT_PARSER_METADATA_KEY, transform) as TParser | undefined).find((candidate: TParser | undefined): boolean => candidate !== undefined);

			if (parser !== undefined) {
				parsers.set(propertyName, parser);
			}

			break;
		}
	}

	return parsers;
}

/**
 * Builds the error for a class that one route reads from text and another from a JSON body.
 * @param {object} dto - The class.
 * @param {string} textOrigin - Where a query or a path reads it.
 * @param {string} jsonOrigin - Where a JSON body reads it.
 * @returns {Error} The startup error.
 * @private
 */
function createConflict(dto: object, textOrigin: string, jsonOrigin: string): Error {
	return ErrorException(`DTO ${String((dto as { name?: string }).name)} is read from text in ${textOrigin} and from a JSON body in ${jsonOrigin}. Its ApiPropertyNumber and ApiPropertyBoolean properties convert text only in a query or a path, and a JSON body must send JSON numbers and booleans, so one class cannot serve both: declare a separate DTO for each`);
}

/**
 * Tells whether a value is a DTO class rather than a built-in type.
 * @param {unknown} value - Candidate.
 * @returns {boolean} Whether it is a class to walk.
 * @private
 */
function isDtoClass(value: unknown): value is TDtoClass {
	return typeof value === "function" && !PLAIN_TYPES.has(value) && typeof (value as { prototype?: unknown }).prototype === "object";
}

/**
 * Reads the class a `@Type` names, or nothing when its function cannot run yet.
 * @param {NonNullable<ReturnType<TStorage["findTypeMetadata"]>>} metadata - The `@Type` metadata.
 * @param {string} propertyName - Property key.
 * @returns {unknown} The type.
 * @private
 */
function readType(metadata: NonNullable<ReturnType<TStorage["findTypeMetadata"]>>, propertyName: string): unknown {
	try {
		return metadata.typeFunction({ newObject: {}, object: {}, property: propertyName });
	} catch {
		return undefined;
	}
}
