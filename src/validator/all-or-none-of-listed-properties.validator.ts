import type { ValidationArguments, ValidatorConstraintInterface } from "class-validator";

import { ValidatorConstraint } from "class-validator";

// eslint-disable-next-line @elsikora/typescript/naming-convention
@ValidatorConstraint({ async: false, name: "all-or-none-of-listed-properties" })
export class AllOrNoneOfListedProperties implements ValidatorConstraintInterface {
	defaultMessage(properties: ValidationArguments): string {
		return `either all or none of the following properties must be provided: ${properties.constraints.join(", ")}`;
	}

	validate(_value: unknown, properties: ValidationArguments): boolean {
		const constraints: Array<string> = properties.constraints as Array<string>;

		if (constraints.length > 0) {
			const indexableObject: Record<string, any> = properties.object as Record<string, any>;
			const definedFields: Array<string> = constraints.filter((field: string) => Object.prototype.hasOwnProperty.call(indexableObject, field) && indexableObject[field] !== undefined);

			return definedFields.length === 0 || definedFields.length === constraints.length;
		}

		return true;
	}
}
