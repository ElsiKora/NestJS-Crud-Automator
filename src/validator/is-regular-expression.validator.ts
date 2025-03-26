import type { ValidatorConstraintInterface } from "class-validator";

import { ValidatorConstraint } from "class-validator";

@ValidatorConstraint()
export class IsRegularExpressionValidator implements ValidatorConstraintInterface {
	/**
	 * Validates whether a string is a valid regular expression pattern
	 * @param {string} pattern - The regular expression pattern to validate
	 * @returns {boolean} True if the pattern is a valid regular expression, false otherwise
	 */
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
