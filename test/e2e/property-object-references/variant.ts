import type { Type } from "@nestjs/common";

import { ApiProperty } from "@nestjs/swagger";

import { ApiPropertyString, EApiPropertyStringType } from "../../../src/index";

/**
 * Creates a variant class of its own, so that no route of the fixture registers a class another route depends on.
 * @param {string} name - Class name, which is also the component name.
 * @returns {Type<unknown>} The variant class.
 */
export function createVariant(name: string): Type<unknown> {
	const variant: Type<unknown> = Object.defineProperty(class {}, "name", { value: name }) as Type<unknown>;

	ApiPropertyString({ description: "kind", entity: variant, exampleValue: "a", format: EApiPropertyStringType.STRING, maxLength: 16, minLength: 1, pattern: "/^.+$/" } as never)(variant.prototype as object, "kind");

	return variant;
}

/**
 * Creates a variant class that only Swagger's own decorator describes, so a generated route references it as it is.
 * @param {string} name - Class name, which is also the component name.
 * @returns {Type<unknown>} The variant class.
 */
export function createPlainVariant(name: string): Type<unknown> {
	const variant: Type<unknown> = Object.defineProperty(class {}, "name", { value: name }) as Type<unknown>;

	ApiProperty({ type: String })(variant.prototype as object, "kind");

	return variant;
}

/**
 * Builds the describe fields of a polymorphic manual object from two new variant classes.
 * @param {string} prefix - Name prefix of the variant classes.
 * @returns {{ dataType: Array<Type<unknown>>; discriminator: { mapping: Record<string, Type<unknown>>; propertyName: string } }} The describe fields.
 */
export function createUnion(prefix: string): { dataType: Array<Type<unknown>>; discriminator: { mapping: Record<string, Type<unknown>>; propertyName: string } } {
	const first: Type<unknown> = createVariant(`${prefix}FirstDTO`);
	const second: Type<unknown> = createVariant(`${prefix}SecondDTO`);

	return { dataType: [first, second], discriminator: { mapping: { first, second }, propertyName: "kind" } };
}

/**
 * Builds the options of a hand-written polymorphic `@ApiPropertyObject` from two new variant classes.
 * @param {string} prefix - Name prefix of the variant classes.
 * @param {Type<unknown>} entity - Class that owns the property.
 * @returns {never} The decorator options.
 */
export function createObjectOptions(prefix: string, entity: Type<unknown>): never {
	const { dataType, discriminator }: ReturnType<typeof createUnion> = createUnion(prefix);

	return { description: "union", discriminator, entity, isResponse: true, type: dataType } as never;
}
