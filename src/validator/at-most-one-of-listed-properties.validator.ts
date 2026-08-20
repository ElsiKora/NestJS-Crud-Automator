import type { ValidationArguments, ValidatorConstraintInterface } from "class-validator";

import { ValidatorConstraint } from "class-validator";

// eslint-disable-next-line @elsikora/typescript/naming-convention
@ValidatorConstraint({ async: false, name: "at-most-one-of-listed-properties" })
export class AtMostOneOfListedPropertiesValidator implements ValidatorConstraintInterface {
	defaultMessage(properties: ValidationArguments): string {
		return `at most one of the following properties may be provided: ${properties.constraints.join(", ")}`;
	}

	validate(_value: unknown, properties: ValidationArguments): boolean {
		const constraints: Array<string> = properties.constraints as Array<string>;
		const object: Record<string, unknown> = properties.object as Record<string, unknown>;
		const definedCount: number = constraints.filter((field: string): boolean => Object.hasOwn(object, field) && object[field] !== undefined).length;

		return definedCount <= 1;
	}
}
