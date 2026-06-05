import { EMastMatchOneOfSchemasValidationErrorType } from "@enum/validator";
import { IMustMatchOneOfSchemasDiscriminatorConfig } from "@interface/validator";
import { TTypeDiscriminator, TTypeDynamicDiscriminator } from "@type/decorator/api/property";
import { ErrorException } from "@utility/error/exception.utility";
import { registerDecorator, ValidationArguments, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";

// eslint-disable-next-line @elsikora/typescript/naming-convention
@ValidatorConstraint({ async: false, name: "must-match-one-of-schemas" })
export class MustMatchOneOfSchemasConstraint implements ValidatorConstraintInterface {
	private allowedValues: Array<string> = [];

	private discriminatorField: null | string = null;

	private discriminatorValue: null | string = null;

	private errorType: EMastMatchOneOfSchemasValidationErrorType = EMastMatchOneOfSchemasValidationErrorType.UNKNOWN;

	/**
	 * Provides a custom error message based on the type of validation failure
	 * @param {ValidationArguments} _arguments - Validation arguments containing property information
	 * @returns {string} A descriptive error message explaining why validation failed
	 */
	defaultMessage(_arguments: ValidationArguments): string {
		const propertyName: string = _arguments.property;

		switch (this.errorType) {
			case EMastMatchOneOfSchemasValidationErrorType.INVALID_DISCRIMINATOR: {
				const schemasList: string = this.allowedValues
					.map((value: string): string => {
						return `'${value}'`;
					})
					.join(", ");

				return `${propertyName} has invalid discriminator value '${String(this.discriminatorValue)}' for field '${String(this.discriminatorField)}'. must be one of: ${schemasList}`;
			}

			case EMastMatchOneOfSchemasValidationErrorType.MISSING_DISCRIMINATOR: {
				return `${propertyName} is missing required discriminator field '${String(this.discriminatorField)}'`;
			}

			case EMastMatchOneOfSchemasValidationErrorType.SCHEMA_MISMATCH: {
				const schemasList: string = this.allowedValues
					.map((value: string): string => {
						return `'${value}'`;
					})
					.join(", ");

				return `${propertyName} must match one of the schemas: ${schemasList}`;
			}

			case EMastMatchOneOfSchemasValidationErrorType.UNKNOWN: {
				return `${propertyName} must match one of the valid schemas`;
			}

			default: {
				return `${propertyName} must match one of the valid schemas`;
			}
		}
	}

	/**
	 * Validates whether an object matches one of the allowed schemas based on its discriminator field
	 * @param {unknown} value - The value being validated
	 * @param {ValidationArguments} _arguments - Validation arguments containing constraints
	 * @returns {boolean} True if the value matches a valid schema, false otherwise
	 */
	validate(value: unknown, _arguments: ValidationArguments): boolean {
		if (!value || typeof value !== "object" || Array.isArray(value)) {
			this.errorType = EMastMatchOneOfSchemasValidationErrorType.SCHEMA_MISMATCH;
			this.prepareAllowedSchemas(_arguments);

			return false;
		}

		const valueAsRecord: Record<string, unknown> = value as Record<string, unknown>;

		if (Object.keys(valueAsRecord).length === 0) {
			this.errorType = EMastMatchOneOfSchemasValidationErrorType.SCHEMA_MISMATCH;
			this.prepareAllowedSchemas(_arguments);

			return false;
		}

		const constraints: Array<IMustMatchOneOfSchemasDiscriminatorConfig> = _arguments.constraints as Array<IMustMatchOneOfSchemasDiscriminatorConfig>;

		if (!constraints?.[0]?.discriminator) {
			this.errorType = EMastMatchOneOfSchemasValidationErrorType.UNKNOWN;

			return false;
		}

		try {
			const discriminator: TTypeDiscriminator | TTypeDynamicDiscriminator = constraints[0].discriminator;

			if (!discriminator.propertyName || typeof discriminator.propertyName !== "string") {
				this.errorType = EMastMatchOneOfSchemasValidationErrorType.UNKNOWN;

				return false;
			}

			this.discriminatorField = discriminator.propertyName;

			if (!(discriminator.propertyName in valueAsRecord)) {
				this.errorType = EMastMatchOneOfSchemasValidationErrorType.MISSING_DISCRIMINATOR;

				return false;
			}

			const discriminatorValue: unknown = valueAsRecord[discriminator.propertyName];

			if (typeof discriminatorValue !== "string" || discriminatorValue === "") {
				this.errorType = EMastMatchOneOfSchemasValidationErrorType.INVALID_DISCRIMINATOR;
				this.discriminatorValue = String(discriminatorValue);
				this.prepareAllowedSchemas(_arguments);

				return false;
			}

			this.discriminatorValue = discriminatorValue;

			if (!discriminator.mapping || typeof discriminator.mapping !== "object") {
				this.errorType = EMastMatchOneOfSchemasValidationErrorType.SCHEMA_MISMATCH;
				this.prepareAllowedSchemas(_arguments);

				return false;
			}

			this.prepareAllowedSchemas(_arguments);

			if (!this.allowedValues.includes(discriminatorValue)) {
				this.errorType = EMastMatchOneOfSchemasValidationErrorType.INVALID_DISCRIMINATOR;

				return false;
			}

			return true;
		} catch {
			this.errorType = EMastMatchOneOfSchemasValidationErrorType.SCHEMA_MISMATCH;
			this.prepareAllowedSchemas(_arguments);

			return false;
		}
	}

	/**
	 * Prepares the list of allowed discriminator values based on validation constraints
	 * @param {ValidationArguments} _arguments - Validation arguments containing constraints
	 * @returns {void}
	 * @private
	 */
	private prepareAllowedSchemas(_arguments: ValidationArguments): void {
		this.allowedValues = [];

		const constraints: Array<IMustMatchOneOfSchemasDiscriminatorConfig> = _arguments.constraints as Array<IMustMatchOneOfSchemasDiscriminatorConfig>;

		if (!constraints?.[0]) {
			return;
		}

		const { discriminator }: IMustMatchOneOfSchemasDiscriminatorConfig = constraints[0];

		if (!discriminator?.mapping) {
			return;
		}

		this.allowedValues = Object.keys(discriminator.mapping);
	}
}

/**
 * Decorator that checks if the object matches one of the schemas based on the discriminator field
 * @param {IMustMatchOneOfSchemasDiscriminatorConfig} discriminatorConfig - Configuration for the discriminator
 * @param {ValidationOptions} [validationOptions] - Validation options
 * @returns {PropertyDecorator} - Decorator
 */
export function MustMatchOneOfSchemasValidator(discriminatorConfig: IMustMatchOneOfSchemasDiscriminatorConfig, validationOptions?: ValidationOptions): PropertyDecorator {
	return function (target: object, propertyKey: string | symbol) {
		if (typeof propertyKey !== "string") {
			throw ErrorException("MatchesOneOfSchemas decorator can only be applied to string properties");
		}

		if (!discriminatorConfig?.discriminator) {
			throw ErrorException("discriminatorConfig must contain a discriminator property");
		}

		const discriminator: TTypeDiscriminator | TTypeDynamicDiscriminator = discriminatorConfig.discriminator;

		if (!discriminator.propertyName || !discriminator.mapping) {
			throw ErrorException("discriminator must contain propertyName and mapping properties");
		}

		registerDecorator({
			constraints: [discriminatorConfig],
			name: "must-match-one-of-schemas",
			options: validationOptions,
			propertyName: propertyKey,
			target: target.constructor,
			validator: MustMatchOneOfSchemasConstraint,
		});
	};
}
