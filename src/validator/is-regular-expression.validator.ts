import type { ValidatorConstraintInterface } from "class-validator";

import { ValidatorConstraint } from "class-validator";

@ValidatorConstraint()
export class IsRegularExpressionValidator implements ValidatorConstraintInterface {
	validate(pattern: string): boolean {
		if (pattern) {
			try {
				new RegExp(pattern);

				return true;
			} catch {
				return false;
			}
		} else {
			return false;
		}
	}
}
