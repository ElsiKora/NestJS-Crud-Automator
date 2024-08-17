import { ValidatorConstraint } from "class-validator";

import type { ValidationArguments, ValidatorConstraintInterface } from "class-validator";

@ValidatorConstraint({ async: false, name: "all-or-none-of-listed-properties" })
export class AllOrNoneOfListedProperties implements ValidatorConstraintInterface {
	defaultMessage(arguments_: ValidationArguments): string {
		return `either all or none of the following properties must be provided: ${arguments_.constraints.join(", ")}`;
	}

	validate(_value: unknown, arguments_: ValidationArguments): boolean {
		const constraints: Array<string> = arguments_.constraints as Array<string>;

		if (constraints.length > 0) {
			const indexableObject = arguments_.object as Record<string, any>;
			const definedFields = constraints.filter((field) => indexableObject.hasOwnProperty(field) && indexableObject[field] !== undefined);

			return definedFields.length === 0 || definedFields.length === constraints.length;
		}

		return true;
	}
}
