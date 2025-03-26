import { Type } from "@nestjs/common";
import { registerDecorator, ValidationArguments, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";

import { EMastMatchOneOfSchemasValidationErrorType } from "../enum";
import { IMustMatchOneOfSchemasDiscriminatorConfig } from "../interface";
import { TTypeDiscriminator, TTypeDynamicDiscriminator } from "../type";

// eslint-disable-next-line @elsikora/typescript/naming-convention
@ValidatorConstraint({ async: false, name: "must-match-one-of-schemas" })
export class MustMatchOneOfSchemasConstraint implements ValidatorConstraintInterface {
	private allowedValues: Array<string> = [];

	private discriminatorField: null | string = null;

	private discriminatorValue: null | string = null;

	private errorType: EMastMatchOneOfSchemasValidationErrorType = EMastMatchOneOfSchemasValidationErrorType.UNKNOWN;

	private schemasInfo: Record<string, string> = {};

	defaultMessage(_arguments: ValidationArguments): string {
		const propertyName: string = _arguments.property;

		switch (this.errorType) {
			case EMastMatchOneOfSchemasValidationErrorType.INVALID_DISCRIMINATOR: {
				const schemasList: string = this.allowedValues
					.map((value: string) => {
						const schemaName: string = this.schemasInfo[value] ?? "Unknown schema";

						return `'${value}' (${schemaName})`;
					})
					.join(", ");

				return `${propertyName} has invalid discriminator value '${String(this.discriminatorValue)}' for field '${String(this.discriminatorField)}'. must be one of: ${schemasList}`;
			}

			case EMastMatchOneOfSchemasValidationErrorType.MISSING_DISCRIMINATOR: {
				return `${propertyName} is missing required discriminator field '${String(this.discriminatorField)}'`;
			}

			case EMastMatchOneOfSchemasValidationErrorType.SCHEMA_MISMATCH: {
				const schemasList: string = this.allowedValues
					.map((value: string) => {
						const schemaName: string = this.schemasInfo[value] ?? "Unknown schema";

						return `'${value}' (${schemaName})`;
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

	private prepareAllowedSchemas(_arguments: ValidationArguments): void {
		this.allowedValues = [];
		this.schemasInfo = {};

		const constraints: Array<IMustMatchOneOfSchemasDiscriminatorConfig> = _arguments.constraints as Array<IMustMatchOneOfSchemasDiscriminatorConfig>;

		if (!constraints?.[0]) {
			return;
		}

		const { discriminator, schemas }: IMustMatchOneOfSchemasDiscriminatorConfig = constraints[0];

		if (!discriminator?.mapping) {
			return;
		}

		this.allowedValues = Object.keys(discriminator.mapping);

		for (const [key, value] of Object.entries(discriminator.mapping)) {
			let schemaName: string = "Unknown schema";

			if (Array.isArray(schemas)) {
				// eslint-disable-next-line @elsikora/typescript/no-unsafe-function-type
				const schemaClass: Function | Type<unknown> | undefined = schemas.find((schema: Function | Type<unknown>) => {
					if (typeof value === "function" && schema === value) {
						return true;
					}

					return typeof value === "string" && (schema as { name?: string }).name === value;
				});

				if (schemaClass) {
					schemaName = (schemaClass as { name?: string }).name ?? "Anonymous class";
				}
			} else if (schemas && typeof schemas === "object") {
				if (typeof value === "string" && value in schemas) {
					const schemaClass: { name?: string } = schemas[value] as { name?: string };
					schemaName = schemaClass.name ?? value;
				} else if (typeof value === "function") {
					schemaName = (value as { name?: string }).name ?? "Anonymous class";
				}
			}

			this.schemasInfo[key] = schemaName;
		}
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
			throw new TypeError("MatchesOneOfSchemas decorator can only be applied to string properties");
		}

		if (!discriminatorConfig?.discriminator) {
			throw new TypeError("discriminatorConfig must contain a discriminator property");
		}

		const discriminator: TTypeDiscriminator | TTypeDynamicDiscriminator = discriminatorConfig.discriminator;

		if (!discriminator.propertyName || !discriminator.mapping) {
			throw new TypeError("discriminator must contain propertyName and mapping properties");
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
