import type { IApiControllerParametersRouteDtoExposure } from "@interface/class/api/controller/parameters-route-dto-exposure.interface";
import type { Type } from "@nestjs/common";

import { AuthorizationSerializeValue } from "@utility/authorization/serialize-value.utility";
import { instanceToPlain, plainToInstance } from "class-transformer";
import { getMetadataStorage } from "class-validator";

import { ApiControllerParametersConvert } from "./convert.utility";

// class-transformer asks the option list with `some` whether a decorator's groups apply, so this list applies them all. The guard has no other way to see them: the package has no public metadata API.
const ALL_GROUPS: Array<string> = Object.assign([""], { some: (): boolean => true });
const GROUP_SAMPLES: Array<string> = ["1", "Aa 1"];

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
 * Lists the path parameters whose value depends on class-transformer groups, by converting samples with no group and with every group.
 * A `@Transform` limited to groups runs only in a host pipe with that group, on the text IAM already saw. A transform that leaves both samples unchanged cannot be seen this way.
 * @param {Type<unknown>} dto - PARAMETERS DTO of the route.
 * @param {ReadonlyMap<string, string>} properties - The DTO property that holds each path parameter.
 * @returns {Array<string>} The path parameters that a group changes.
 */
export function ApiControllerParametersRouteDtoFindGroupLimited(dto: Type<unknown>, properties: ReadonlyMap<string, string>): Array<string> {
	const limited: Set<string> = new Set<string>();

	for (const text of GROUP_SAMPLES) {
		const sample: Record<string, string> = Object.fromEntries([...properties.keys()].map((parameter: string): [string, string] => [parameter, text]));

		try {
			const plain: object = ApiControllerParametersConvert(dto, sample);
			const grouped: object = ApiControllerParametersConvert(dto, sample, { groups: ALL_GROUPS });

			for (const [parameter, property] of properties) {
				if (AuthorizationSerializeValue(Reflect.get(plain, property)) !== AuthorizationSerializeValue(Reflect.get(grouped, property))) {
					limited.add(parameter);
				}
			}
		} catch {
			// A `@Transform` that rejects the sample says nothing about real values.
		}
	}

	return [...limited];
}

/**
 * Finds the name each DTO property is exposed under, by writing each property back alone with a sample value.
 * class-transformer has no public metadata API, and the conversion to a class would run every `@Transform` on values the guard does not hold, so this reads the key that comes out.
 * @param {Type<unknown>} dto - PARAMETERS DTO of the route.
 * @returns {IApiControllerParametersRouteDtoExposure} The exposed names, the properties that could not be written back, and the names two properties share.
 */
export function ApiControllerParametersRouteDtoReadExposure(dto: Type<unknown>): IApiControllerParametersRouteDtoExposure {
	const exposure: IApiControllerParametersRouteDtoExposure = { failedProperties: new Set<string>(), names: new Map<string, string>(), properties: listProperties(dto), shadowedProperties: new Map<string, Array<string>>() };
	const defaultNames: Set<string> = readDefaultNames(dto);

	for (const property of exposure.properties) {
		try {
			const [name, ...others]: Array<string> = writeBack(dto, property).filter((key: string): boolean => !defaultNames.has(key));

			if (name !== undefined && others.length === 0) {
				const holder: string | undefined = exposure.names.get(name);

				if (holder !== undefined) {
					exposure.shadowedProperties.set(name, [holder, property]);
				}

				exposure.names.set(name, property);
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
 * Lists the keys a DTO writes back with no property set, which a `@Transform` that gives a default value puts next to the key of any property.
 * @param {{ prototype: object }} dto - PARAMETERS DTO of the route.
 * @param {object} dto.prototype - Prototype of the DTO class.
 * @returns {Set<string>} The keys.
 */
function readDefaultNames(dto: { prototype: object }): Set<string> {
	try {
		return new Set<string>(writeBack(dto));
	} catch {
		return new Set<string>();
	}
}

/**
 * Writes one property of a DTO back to a plain object and lists the keys that come out.
 * @param {{ prototype: object }} dto - PARAMETERS DTO of the route.
 * @param {object} dto.prototype - Prototype of the DTO class.
 * @param {string} [property] - Property name; with none, no property is set.
 * @returns {Array<string>} The keys of the plain object.
 */
function writeBack(dto: { prototype: object }, property?: string): Array<string> {
	const probe: object = {};
	Object.setPrototypeOf(probe, dto.prototype);

	if (property !== undefined) {
		Reflect.set(probe, property, "1");
	}

	return Object.keys(
		instanceToPlain(probe, {
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			exposeUnsetFields: false,
			groups: ALL_GROUPS,
		}),
	);
}
