import { type ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";

import { EFilterOperation } from "../enum/filter-operation.enum";

enum EArgumentType {
	ARRAY = "array",
	NULL = "null",
	SINGLE = "single",
}

type TOperationConfig = {
	argumentType: EArgumentType;
	exactLength?: number;
	maxLength?: number;
	minLength?: number;
};

type TValidationContext = {
	__fieldGroups: Map<string, Set<string>>;
	__operatorSuffix: string;
	__valueSuffixes: Array<string>;
};

const DEFAULT_OPERATION_CONFIGS: Record<EFilterOperation, TOperationConfig> = {
	[EFilterOperation.BETWEEN]: {
		argumentType: EArgumentType.ARRAY,
		exactLength: 2,
	},
	[EFilterOperation.CONT]: {
		argumentType: EArgumentType.SINGLE,
	},
	[EFilterOperation.CONTL]: {
		argumentType: EArgumentType.SINGLE,
	},
	[EFilterOperation.ENDS]: {
		argumentType: EArgumentType.SINGLE,
	},
	[EFilterOperation.ENDSL]: {
		argumentType: EArgumentType.SINGLE,
	},
	[EFilterOperation.EQ]: {
		argumentType: EArgumentType.SINGLE,
	},
	[EFilterOperation.EQL]: {
		argumentType: EArgumentType.SINGLE,
	},
	[EFilterOperation.EXCL]: {
		argumentType: EArgumentType.ARRAY,
	},
	[EFilterOperation.EXCLL]: {
		argumentType: EArgumentType.ARRAY,
	},
	[EFilterOperation.GT]: {
		argumentType: EArgumentType.SINGLE,
	},
	[EFilterOperation.GTE]: {
		argumentType: EArgumentType.SINGLE,
	},
	[EFilterOperation.IN]: {
		argumentType: EArgumentType.ARRAY,
		minLength: 1,
	},
	[EFilterOperation.INL]: {
		argumentType: EArgumentType.ARRAY,
		minLength: 1,
	},
	[EFilterOperation.ISNULL]: {
		argumentType: EArgumentType.NULL,
	},
	[EFilterOperation.LT]: {
		argumentType: EArgumentType.SINGLE,
	},
	[EFilterOperation.LTE]: {
		argumentType: EArgumentType.SINGLE,
	},
	[EFilterOperation.NE]: {
		argumentType: EArgumentType.SINGLE,
	},
	[EFilterOperation.NEL]: {
		argumentType: EArgumentType.SINGLE,
	},
	[EFilterOperation.NOTIN]: {
		argumentType: EArgumentType.ARRAY,
		minLength: 1,
	},
	[EFilterOperation.NOTINL]: {
		argumentType: EArgumentType.ARRAY,
		minLength: 1,
	},
	[EFilterOperation.NOTNULL]: {
		argumentType: EArgumentType.NULL,
	},
	[EFilterOperation.STARTS]: {
		argumentType: EArgumentType.SINGLE,
	},
	[EFilterOperation.STARTSL]: {
		argumentType: EArgumentType.SINGLE,
	},
};

@ValidatorConstraint({ async: false, name: "has-paired-custom-suffixes-fields" })
export class HasPairedCustomSuffixesFields implements ValidatorConstraintInterface {
	defaultMessage(properties: ValidationArguments): string {
		const object: TValidationContext = properties.object as TValidationContext;
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
				const operator = operatorValue as EFilterOperation;
				const operatorConfig: TOperationConfig = DEFAULT_OPERATION_CONFIGS[operator];

				if (!operatorConfig) {
					return `Invalid operator "${operator}" for group "${baseName}"`;
				}

				if (operatorConfig.argumentType === EArgumentType.NULL) {
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

				const value: unknown = indexableObject[valueFields[0]];
				const isArray = Array.isArray(value);

				if (operatorConfig.argumentType === EArgumentType.ARRAY && !isArray) {
					return `group "${baseName}" with ${operator} operation requires an array value`;
				}

				if (operatorConfig.argumentType === EArgumentType.SINGLE && isArray) {
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

		(properties.object as TValidationContext).__fieldGroups = fieldGroups;
		(properties.object as TValidationContext).__operatorSuffix = operatorSuffix;
		(properties.object as TValidationContext).__valueSuffixes = valueSuffixes;

		for (const [baseName, groupSuffixes] of fieldGroups) {
			const hasValueSuffix: boolean = valueSuffixes.some((suffix: string) => groupSuffixes.has(suffix));

			if (hasValueSuffix && !groupSuffixes.has(operatorSuffix)) {
				return false;
			}

			if (groupSuffixes.has(operatorSuffix)) {
				const operatorField: string = `${baseName}[${operatorSuffix}]`;
				const operatorValue: string = indexableObject[operatorField] as string;
				const operator = operatorValue as EFilterOperation;
				const operatorConfig: TOperationConfig = DEFAULT_OPERATION_CONFIGS[operator];

				if (!operatorConfig) return false;

				if (operatorConfig.argumentType === EArgumentType.NULL) {
					const valueCount: number = valueSuffixes.filter((suffix: string) => groupSuffixes.has(suffix)).length;

					if (valueCount > 0) return false;
					continue;
				}

				const valueFields: Array<string> = valueSuffixes.filter((suffix: string) => groupSuffixes.has(suffix)).map((suffix) => `${baseName}[${suffix}]`);

				if (valueFields.length !== 1) return false;

				const value: unknown = indexableObject[valueFields[0]];
				const isArray = Array.isArray(value);

				if (operatorConfig.argumentType === EArgumentType.ARRAY && !isArray) return false;

				if (operatorConfig.argumentType === EArgumentType.SINGLE && isArray) return false;

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
