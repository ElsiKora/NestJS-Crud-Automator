import type { ValidationArguments, ValidationError, ValidationOptions, ValidatorConstraintInterface } from "class-validator";

import { ApiAuthorizationIamDocumentValidator } from "@class/api/authorization/iam/document/validator.class";
import { registerDecorator, ValidatorConstraint } from "class-validator";

/**
 * The class-validator constraint behind `@IsApiPolicyDocument`: the value must pass IAM policy document validation for the namespace.
 */
@ValidatorConstraint({ name: "isApiPolicyDocument" })
export class IsApiPolicyDocumentConstraint implements ValidatorConstraintInterface {
	/**
	 * Lists the constraint codes the value fails with, for the failure message.
	 * @param {ValidationArguments} validationArguments - Value and decorator options.
	 * @returns {string} Message naming each failing path and code.
	 */
	public defaultMessage(validationArguments: ValidationArguments): string {
		const failures: Array<ValidationError> = this.inspect(validationArguments);

		const codes: Array<string> = failures.map((failure: ValidationError): string => [failure.property, ...Object.keys(failure.constraints ?? {})].join(" "));

		return `${validationArguments.property} must be a valid IAM policy document: ${codes.join("; ")}`;
	}

	/**
	 * Tells whether the value passes IAM policy document validation.
	 * @param {unknown} _value - Value to check; read from the arguments.
	 * @param {ValidationArguments} validationArguments - Value and decorator options.
	 * @returns {boolean} Whether the document is valid.
	 */
	public validate(_value: unknown, validationArguments: ValidationArguments): boolean {
		return this.inspect(validationArguments).length === 0;
	}

	/**
	 * Runs IAM policy document validation for the namespace the decorator names.
	 * @param {ValidationArguments} validationArguments - Value and decorator options.
	 * @returns {Array<ValidationError>} Every failure.
	 */
	private inspect(validationArguments: ValidationArguments): Array<ValidationError> {
		const options: { namespace: string } = validationArguments.constraints[0] as { namespace: string };

		return new ApiAuthorizationIamDocumentValidator().inspect(validationArguments.value, options);
	}
}

/**
 * Validates a DTO property as an IAM policy document of a namespace, with the grammar the engine loads documents with.
 * It fails with the single constraint `isApiPolicyDocument`; for one code per problem call
 * `ApiAuthorizationIamDocumentValidator.assertSavable` instead.
 * @param {object} options - Namespace-aware checks.
 * @param {string} options.namespace - Namespace the document is stored for.
 * @param {ValidationOptions} [validationOptions] - class-validator options.
 * @returns {PropertyDecorator} The property decorator.
 */
export function IsApiPolicyDocument(options: { namespace: string }, validationOptions?: ValidationOptions): PropertyDecorator {
	return function (target: object, propertyKey: string | symbol): void {
		registerDecorator({
			constraints: [options],
			name: "isApiPolicyDocument",
			options: validationOptions,
			propertyName: String(propertyKey),
			target: target.constructor,
			validator: IsApiPolicyDocumentConstraint,
		});
	};
}
