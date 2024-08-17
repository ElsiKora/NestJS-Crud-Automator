import { ValidatorConstraint } from "class-validator";

import type { ValidationArguments, ValidatorConstraintInterface } from "class-validator";

@ValidatorConstraint({ async: false, name: "only-one-of-listed-properties" })
export class OnlyOneOfListedProperties implements ValidatorConstraintInterface {
	defaultMessage(properties: ValidationArguments): string {
		return `only one of the following properties must be provided: ${properties.constraints.join(", ")}`;
	}

	validate(_value: unknown, properties: ValidationArguments): boolean {
		const constraints: Array<string> = properties.constraints as Array<string>;

		if (constraints.length > 0) {
			let count: number = 0;
			const indexableObject = properties.object as Record<string, any>;

			for (const constraint of constraints) {
				if (indexableObject.hasOwnProperty(constraint) && indexableObject[constraint] !== undefined) {
					count++;
				}
			}

			if (count === 1) {
				return true;
			}

			return false;
		}

		return true;
	}
}
