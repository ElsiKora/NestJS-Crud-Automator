import type { ValidationArguments, ValidatorConstraintInterface } from "class-validator";

import { ValidatorConstraint } from "class-validator";

// eslint-disable-next-line @elsikora/typescript/naming-convention
@ValidatorConstraint({ async: false, name: "has-at-least-one-of-listed-properties" })
export class HasAtLeastOneOfListedPropertiesValidator implements ValidatorConstraintInterface {
	defaultMessage(properties: ValidationArguments): string {
		return `at least one of the following properties must be provided: ${properties.constraints.join(", ")}`;
	}

	validate(_value: unknown, properties: ValidationArguments): boolean {
		const constraints: Array<string> = properties.constraints as Array<string>;

		if (constraints.length > 0) {
			let isExists: boolean = false;
			const indexableObject: Record<string, any> = properties.object as Record<string, any>;

			for (const constraint of constraints) {
				if (Object.prototype.hasOwnProperty.call(indexableObject, constraint) && indexableObject[constraint] !== undefined) {
					isExists = true;

					break;
				}
			}

			return isExists;
		}

		return true;
	}
}
