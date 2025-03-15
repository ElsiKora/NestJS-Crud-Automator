var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { ValidatorConstraint } from "class-validator";
import { EFilterOperation } from "../enum/filter-operation.enum";
var EArgumentType;
(function (EArgumentType) {
    EArgumentType["ARRAY"] = "array";
    EArgumentType["NULL"] = "null";
    EArgumentType["SINGLE"] = "single";
})(EArgumentType || (EArgumentType = {}));
const DEFAULT_OPERATION_CONFIGS = {
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
let HasPairedCustomSuffixesFields = class HasPairedCustomSuffixesFields {
    defaultMessage(properties) {
        const object = properties.object;
        const fieldGroups = object.__fieldGroups;
        const operatorSuffix = object.__operatorSuffix;
        const valueSuffixes = object.__valueSuffixes;
        const indexableObject = properties.object;
        for (const [baseName, groupSuffixes] of fieldGroups) {
            const hasValueSuffix = valueSuffixes.some((suffix) => groupSuffixes.has(suffix));
            if (hasValueSuffix && !groupSuffixes.has(operatorSuffix)) {
                return `group "${baseName}" with value suffix must have an operator suffix [${operatorSuffix}]`;
            }
            if (groupSuffixes.has(operatorSuffix)) {
                if (groupSuffixes.size === 1) {
                    return `group "${baseName}" with operator suffix must have at least one value with suffix [${[...valueSuffixes].join(", ")}]`;
                }
                const operatorField = `${baseName}[${operatorSuffix}]`;
                const operatorValue = indexableObject[operatorField];
                const operator = operatorValue;
                const operatorConfig = DEFAULT_OPERATION_CONFIGS[operator];
                if (!operatorConfig) {
                    return `Invalid operator "${operator}" for group "${baseName}"`;
                }
                if (operatorConfig.argumentType === EArgumentType.NULL) {
                    const valueCount = valueSuffixes.filter((suffix) => groupSuffixes.has(suffix)).length;
                    if (valueCount > 0) {
                        return `group "${baseName}" with ${operator} operation should not have any values`;
                    }
                    continue;
                }
                const valueFields = valueSuffixes.filter((suffix) => groupSuffixes.has(suffix)).map((suffix) => `${baseName}[${suffix}]`);
                if (valueFields.length === 0) {
                    return `group "${baseName}" requires a value for ${operator} operation`;
                }
                if (valueFields.length > 1) {
                    return `group "${baseName}" can only have one value with suffix [${[...valueSuffixes].join(", ")}] when operator is present`;
                }
                const value = indexableObject[valueFields[0]];
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
    validate(_value, properties) {
        const [operatorSuffix, valueSuffixes] = properties.constraints;
        const indexableObject = properties.object;
        const fields = Object.keys(indexableObject);
        const fieldGroups = new Map();
        const suffixPattern = [operatorSuffix, ...valueSuffixes].map((suffix) => suffix.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw `\$&`)).join("|");
        const regex = new RegExp(`^(.+?)\\[(${suffixPattern})\\]$`);
        for (const field of fields) {
            const match = regex.exec(field);
            if (match) {
                const [, baseName, suffix] = match;
                if (!fieldGroups.has(baseName)) {
                    fieldGroups.set(baseName, new Set());
                }
                if (indexableObject[field] !== undefined) {
                    fieldGroups.get(baseName)?.add(suffix);
                }
            }
        }
        properties.object.__fieldGroups = fieldGroups;
        properties.object.__operatorSuffix = operatorSuffix;
        properties.object.__valueSuffixes = valueSuffixes;
        for (const [baseName, groupSuffixes] of fieldGroups) {
            const hasValueSuffix = valueSuffixes.some((suffix) => groupSuffixes.has(suffix));
            if (hasValueSuffix && !groupSuffixes.has(operatorSuffix)) {
                return false;
            }
            if (groupSuffixes.has(operatorSuffix)) {
                const operatorField = `${baseName}[${operatorSuffix}]`;
                const operatorValue = indexableObject[operatorField];
                const operator = operatorValue;
                const operatorConfig = DEFAULT_OPERATION_CONFIGS[operator];
                if (!operatorConfig)
                    return false;
                if (operatorConfig.argumentType === EArgumentType.NULL) {
                    const valueCount = valueSuffixes.filter((suffix) => groupSuffixes.has(suffix)).length;
                    if (valueCount > 0)
                        return false;
                    continue;
                }
                const valueFields = valueSuffixes.filter((suffix) => groupSuffixes.has(suffix)).map((suffix) => `${baseName}[${suffix}]`);
                if (valueFields.length !== 1)
                    return false;
                const value = indexableObject[valueFields[0]];
                const isArray = Array.isArray(value);
                if (operatorConfig.argumentType === EArgumentType.ARRAY && !isArray)
                    return false;
                if (operatorConfig.argumentType === EArgumentType.SINGLE && isArray)
                    return false;
                if (isArray) {
                    if (operatorConfig.exactLength !== undefined && value.length !== operatorConfig.exactLength)
                        return false;
                    if (operatorConfig.minLength !== undefined && value.length < operatorConfig.minLength)
                        return false;
                    if (operatorConfig.maxLength !== undefined && value.length > operatorConfig.maxLength)
                        return false;
                }
            }
        }
        return true;
    }
};
HasPairedCustomSuffixesFields = __decorate([
    ValidatorConstraint({ async: false, name: "has-paired-custom-suffixes-fields" })
], HasPairedCustomSuffixesFields);
export { HasPairedCustomSuffixesFields };
//# sourceMappingURL=has-paired-custom-suffixes-fields.validator.js.map