import type { IApiControllerParametersRouteDtoExposure } from "@interface/class/api/controller/parameters-route-dto-exposure.interface";
import type { Type } from "@nestjs/common";

import { AuthorizationSerializeValue } from "@utility/authorization/serialize-value.utility";
import { instanceToPlain, plainToInstance } from "class-transformer";
import { getMetadataStorage } from "class-validator";

import { ApiControllerParametersConvert } from "./convert.utility";

// class-transformer asks the option list with `some` whether a decorator's groups apply, so this list applies them all. The guard has no other way to see them: the package has no public metadata API.
const ALL_GROUPS: Array<string> = Object.assign([""], { some: (): boolean => true });

// Two values of each kind a written form may need, so the key whose value follows them is the key of the property. A `@Transform` that reads a date's method throws on text.
const WRITE_BACK_SAMPLES: Array<[unknown, unknown]> = [
	["1", "2"],
	[new Date(0), new Date(1)],
	[0, 1],
	[true, false],
];

/**
 * Lists the path parameters that class-transformer never reads from the plain object, because of an exclusion or because it skips the name.
 * This watches the read itself, so it holds whatever own properties a class field definition leaves on the instance.
 * @param {Type<unknown>} dto - PARAMETERS DTO of the route.
 * @param {ReadonlySet<string>} parameters - Path parameter names.
 * @returns {Array<string>} The dropped path parameters; empty when a `@Transform` rejects the sample, which says nothing about real values.
 */
export function ApiControllerParametersRouteDtoFindDropped(dto: Type<unknown>, parameters: ReadonlySet<string>): Array<string> {
	const read: Set<string> = new Set<string>();
	const source: object = {};

	for (const parameter of parameters) {
		Object.defineProperty(source, parameter, {
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			enumerable: true,
			get: (): string => {
				read.add(parameter);

				return "1";
			},
		});
	}

	try {
		plainToInstance(dto, source);
	} catch {
		return [];
	}

	return [...parameters].filter((parameter: string): boolean => !read.has(parameter));
}

/**
 * Finds the name each DTO property is exposed under, by writing each property back alone with two sample values.
 * The key whose value follows the samples is the name; a sibling's `@Transform` on its unset value gives the same result both times, whatever that result is.
 * @param {Type<unknown>} dto - PARAMETERS DTO of the route.
 * @returns {IApiControllerParametersRouteDtoExposure} The exposed names, the properties that could not be written back, the keys of each property written under more than one key whatever the sample, and the names two properties share.
 */
export function ApiControllerParametersRouteDtoReadExposure(dto: Type<unknown>): IApiControllerParametersRouteDtoExposure {
	const exposure: IApiControllerParametersRouteDtoExposure = { ambiguousProperties: new Map<string, Array<string>>(), failedProperties: new Set<string>(), names: new Map<string, string>(), properties: listProperties(dto), shadowedProperties: new Map<string, Array<string>>() };

	for (const property of exposure.properties) {
		try {
			const [name, ...others]: Array<string> = readWrittenKeys(dto, property);

			if (name !== undefined && others.length === 0) {
				const holder: string | undefined = exposure.names.get(name);

				if (holder !== undefined) {
					exposure.shadowedProperties.set(name, [holder, property]);
				}

				exposure.names.set(name, property);
			} else if (name !== undefined) {
				exposure.ambiguousProperties.set(property, [name, ...others]);
			}
		} catch {
			exposure.failedProperties.add(property);
		}
	}

	return exposure;
}

/**
 * Lists the properties of a DTO from its validators and from the fields of a new instance.
 * @param {Type<unknown>} dto - PARAMETERS DTO of the route.
 * @returns {Set<string>} Property names.
 */
function listProperties(dto: Type<unknown>): Set<string> {
	const properties: Set<string> = new Set<string>(
		getMetadataStorage()
			.getTargetValidationMetadatas(dto, "", false, false)
			.map(({ propertyName }: { propertyName: string }): string => propertyName),
	);

	try {
		for (const property of Object.keys(ApiControllerParametersConvert(dto, {}))) {
			properties.add(property);
		}
	} catch {
		// A `@Transform` that rejects an unset value leaves the properties its validators name.
	}

	return properties;
}

/**
 * Lists the keys that hold one property when it is written back, trying each kind of sample until a `@Transform` accepts it.
 * @param {{ prototype: object }} dto - PARAMETERS DTO of the route.
 * @param {object} dto.prototype - Prototype of the DTO class.
 * @param {string} property - Property name.
 * @returns {Array<string>} The keys whose value follows the samples, or every key when no value does, as with a `@Transform` that writes a constant.
 * @throws {Error} When a `@Transform` throws on every kind of sample.
 */
function readWrittenKeys(dto: { prototype: object }, property: string): Array<string> {
	let failure: unknown;

	for (const [first, second] of WRITE_BACK_SAMPLES) {
		try {
			const firstPlain: Record<string, unknown> = writeBack(dto, property, first);
			const secondPlain: Record<string, unknown> = writeBack(dto, property, second);
			const followingKeys: Array<string> = Object.keys(firstPlain).filter((key: string): boolean => AuthorizationSerializeValue(firstPlain[key]) !== AuthorizationSerializeValue(secondPlain[key]));

			return followingKeys.length > 0 ? followingKeys : Object.keys(firstPlain);
		} catch (error) {
			failure = error;
		}
	}

	throw failure;
}

/**
 * Writes one property of a DTO back to a plain object.
 * @param {{ prototype: object }} dto - PARAMETERS DTO of the route.
 * @param {object} dto.prototype - Prototype of the DTO class.
 * @param {string} property - Property name.
 * @param {unknown} value - Sample value of the property.
 * @returns {Record<string, unknown>} The plain object.
 */
function writeBack(dto: { prototype: object }, property: string, value: unknown): Record<string, unknown> {
	const probe: object = {};
	Object.setPrototypeOf(probe, dto.prototype);
	Reflect.set(probe, property, value);

	return instanceToPlain(probe, {
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		exposeUnsetFields: false,
		groups: ALL_GROUPS,
	});
}
