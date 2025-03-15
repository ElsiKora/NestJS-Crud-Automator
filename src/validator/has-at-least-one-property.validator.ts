import type { ValidationArguments, ValidatorConstraintInterface } from "class-validator";

import { ValidatorConstraint } from "class-validator";

// eslint-disable-next-line @elsikora/typescript/naming-convention
@ValidatorConstraint({ async: false, name: "has-at-least-one-property" })
export class HasAtLeastOneProperty implements ValidatorConstraintInterface {
	defaultMessage(): string {
		return "at least one property must be provided";
	}

	validate(_value: unknown, properties: ValidationArguments): boolean {
		return Object.keys(properties.object).length > 0;
	}
}
