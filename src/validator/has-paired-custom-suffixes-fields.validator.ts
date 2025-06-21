import { VALIDATOR_HAS_PAIRED_CUSTOM_SUFFIXES_FIELDS_CONSTANT } from "@constant/validator";
import { EFilterOperation } from "@enum/filter-operation.enum";
import { EHasPairedCustomSuffixesFieldsArgumentType } from "@enum/validator";
import { THasPairedCustomSuffixesFieldsOperationConfig, THasPairedCustomSuffixesFieldsValidationContext } from "@type/validator/has-paired-custom-suffixes-fields";
import { type ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";

// eslint-disable-next-line @elsikora/typescript/naming-convention
@ValidatorConstraint({ async: false, name: "has-paired-custom-suffixes-fields" })
export class HasPairedCustomSuffixesFieldsValidator implements ValidatorConstraintInterface {
	/**
	 * Provides a custom error message describing the validation failure
	 * @param {ValidationArguments} properties - Validation arguments containing the object being validated
	 * @returns {string} A descriptive error message explaining why validation failed
	 */
	defaultMessage(properties: ValidationArguments): string {
		const object: THasPairedCustomSuffixesFieldsValidationContext = properties.object as THasPairedCustomSuffixesFieldsValidationContext;
		const fieldGroups: Map<string, Set<string>> = object.__fieldGroups;
		const operatorSuffix: string = object.__operatorSuffix;
		const valueSuffixes: Array<string> = object.__valueSuffixes;
		const indexableObject: Record<string, unknown> = properties.object as Record<string, unknown>;

		for (const [baseName, groupSuffixes] of fieldGroups) {
			const hasValueSuffix: boolean = valueSuffixes.some((suffix: string) => groupSuffixes.has(suffix));

			if (hasValueSuffix && !groupSuffixes.has(operatorSuffix)) {
				return `group "${baseName}" with value suffix must have an operator suffix [${operatorSuffix}]`;
			}

			if (groupSuffixes.has(operatorSuffix)) {
				if (groupSuffixes.size === 1) {
					return `group "${baseName}" with operator suffix must have at least one value with suffix [${[...valueSuffixes].join(", ")}]`;
				}

				const operatorField: string = `${baseName}[${operatorSuffix}]`;
				const operatorValue: string = indexableObject[operatorField] as string;
				const operator: EFilterOperation = operatorValue as EFilterOperation;
				const operatorConfig: THasPairedCustomSuffixesFieldsOperationConfig = VALIDATOR_HAS_PAIRED_CUSTOM_SUFFIXES_FIELDS_CONSTANT.DEFAULT_OPERATION_CONFIGS[operator];

				if (!operatorConfig) {
					return `Invalid operator "${operator}" for group "${baseName}"`;
				}

				if (operatorConfig.argumentType === EHasPairedCustomSuffixesFieldsArgumentType.NULL) {
					const valueCount: number = valueSuffixes.filter((suffix: string) => groupSuffixes.has(suffix)).length;

					if (valueCount > 0) {
						return `group "${baseName}" with ${operator} operation should not have any values`;
					}
					continue;
				}

				const valueFields: Array<string> = valueSuffixes.filter((suffix: string) => groupSuffixes.has(suffix)).map((suffix: string) => `${baseName}[${suffix}]`);

				if (valueFields.length === 0) {
					return `group "${baseName}" requires a value for ${operator} operation`;
				}

				if (valueFields.length > 1) {
					return `group "${baseName}" can only have one value with suffix [${[...valueSuffixes].join(", ")}] when operator is present`;
				}

				// @ts-ignore
				// eslint-disable-next-line @elsikora/typescript/no-unsafe-assignment
				const value: Array<unknown> = indexableObject[valueFields[0]];
				const isArray: boolean = Array.isArray(value);

				if (operatorConfig.argumentType === EHasPairedCustomSuffixesFieldsArgumentType.ARRAY && !isArray) {
					return `group "${baseName}" with ${operator} operation requires an array value`;
				}

				if (operatorConfig.argumentType === EHasPairedCustomSuffixesFieldsArgumentType.SINGLE && isArray) {
					return `group "${baseName}" with ${operator} operation requires a single value, not an array`;
				}

				if (isArray) {
					if (operatorConfig.exactLength !== undefined && value.length !== operatorConfig.exactLength) {
						return `group "${baseName}" with ${operator} operation requires exactly ${String(operatorConfig.exactLength)} values`;
					}

					if (operatorConfig.minLength !== undefined && value.length < operatorConfig.minLength) {
						return `group "${baseName}" with ${operator} operation requires at least ${String(operatorConfig.minLength)} values`;
					}

					if (operatorConfig.maxLength !== undefined && value.length > operatorConfig.maxLength) {
						return `group "${baseName}" with ${operator} operation requires at most ${String(operatorConfig.maxLength)} values`;
					}
				}
			}
		}

		return `fields must have valid operator-value suffix pairs`;
	}

	/**
	 * Validates that fields with suffixes follow the proper operator-value pairing pattern
	 * @param {unknown} _value - The value being validated (unused)
	 * @param {{ constraints: [string, Array<string>] } & ValidationArguments} properties - Validation arguments and constraints
	 * @returns {boolean} True if the object has properly paired suffixes, false otherwise
	 */
	validate(_value: unknown, properties: { constraints: [string, Array<string>] } & ValidationArguments): boolean {
		const [operatorSuffix, valueSuffixes]: [string, Array<string>] = properties.constraints;
		const indexableObject: Record<string, unknown> = properties.object as Record<string, unknown>;
		const fields: Array<string> = Object.keys(indexableObject);
		const fieldGroups: Map<string, Set<string>> = new Map<string, Set<string>>();

		const suffixPattern: string = [operatorSuffix, ...valueSuffixes].map((suffix: string): string => suffix.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)).join("|");
		const regex: RegExp = new RegExp(`^(.+?)\\[(${suffixPattern})\\]$`);

		for (const field of fields) {
			const match: null | RegExpExecArray = regex.exec(field);

			if (match) {
				const [, baseName, suffix]: [string, string, string] = match as unknown as [string, string, string];

				if (!fieldGroups.has(baseName)) {
					fieldGroups.set(baseName, new Set<string>());
				}

				if (indexableObject[field] !== undefined) {
					fieldGroups.get(baseName)?.add(suffix);
				}
			}
		}

		(properties.object as THasPairedCustomSuffixesFieldsValidationContext).__fieldGroups = fieldGroups;
		(properties.object as THasPairedCustomSuffixesFieldsValidationContext).__operatorSuffix = operatorSuffix;
		(properties.object as THasPairedCustomSuffixesFieldsValidationContext).__valueSuffixes = valueSuffixes;

		for (const [baseName, groupSuffixes] of fieldGroups) {
			const hasValueSuffix: boolean = valueSuffixes.some((suffix: string) => groupSuffixes.has(suffix));

			if (hasValueSuffix && !groupSuffixes.has(operatorSuffix)) {
				return false;
			}

			if (groupSuffixes.has(operatorSuffix)) {
				const operatorField: string = `${baseName}[${operatorSuffix}]`;
				const operatorValue: string = indexableObject[operatorField] as string;
				const operator: EFilterOperation = operatorValue as EFilterOperation;
				const operatorConfig: THasPairedCustomSuffixesFieldsOperationConfig = VALIDATOR_HAS_PAIRED_CUSTOM_SUFFIXES_FIELDS_CONSTANT.DEFAULT_OPERATION_CONFIGS[operator];

				if (!operatorConfig) return false;

				if (operatorConfig.argumentType === EHasPairedCustomSuffixesFieldsArgumentType.NULL) {
					const valueCount: number = valueSuffixes.filter((suffix: string) => groupSuffixes.has(suffix)).length;

					if (valueCount > 0) return false;
					continue;
				}

				const valueFields: Array<string> = valueSuffixes.filter((suffix: string) => groupSuffixes.has(suffix)).map((suffix: string) => `${baseName}[${suffix}]`);

				if (valueFields.length !== 1) return false;

				// @ts-ignore
				// eslint-disable-next-line @elsikora/typescript/no-unsafe-assignment
				const value: Array<unknown> = indexableObject[valueFields[0]];
				const isArray: boolean = Array.isArray(value);

				if (operatorConfig.argumentType === EHasPairedCustomSuffixesFieldsArgumentType.ARRAY && !isArray) return false;

				if (operatorConfig.argumentType === EHasPairedCustomSuffixesFieldsArgumentType.SINGLE && isArray) return false;

				if (isArray) {
					if (operatorConfig.exactLength !== undefined && value.length !== operatorConfig.exactLength) return false;

					if (operatorConfig.minLength !== undefined && value.length < operatorConfig.minLength) return false;

					if (operatorConfig.maxLength !== undefined && value.length > operatorConfig.maxLength) return false;
				}
			}
		}

		return true;
	}
}
