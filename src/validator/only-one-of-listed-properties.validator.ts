import type { ValidationArguments, ValidatorConstraintInterface } from "class-validator";

import { ValidatorConstraint } from "class-validator";

@ValidatorConstraint({ async: false, name: "only-one-of-listed-properties" })
export class OnlyOneOfListedPropertiesValidator implements ValidatorConstraintInterface {
	defaultMessage(properties: ValidationArguments): string {
		return `only one of the following properties must be provided: ${properties.constraints.join(", ")}`;
	}

	validate(_value: unknown, properties: ValidationArguments): boolean {
		const constraints: Array<string> = properties.constraints as Array<string>;

		if (constraints.length > 0) {
			let count: number = 0;
			const indexableObject: Record<string, any> = properties.object as Record<string, any>;

			for (const constraint of constraints) {
				if (Object.prototype.hasOwnProperty.call(indexableObject, constraint) && indexableObject[constraint] !== undefined) {
					count++;
				}
			}

			return count === 1;
		}

		return true;
	}
}
