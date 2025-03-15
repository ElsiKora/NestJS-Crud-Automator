import { applyDecorators } from "@nestjs/common";
import { ApiProperty, ApiResponseProperty } from "@nestjs/swagger";
import { Exclude, Expose, Transform } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, ArrayNotEmpty, IsArray, IsBoolean, IsOptional } from "class-validator";
import { EApiPropertyDataType } from "../../../enum";
export function ApiPropertyBoolean(properties) {
    validateOptions(properties);
    const apiPropertyOptions = buildApiPropertyOptions(properties);
    const decorators = buildDecorators(properties, apiPropertyOptions);
    return applyDecorators(...decorators);
}
function buildApiPropertyOptions(properties) {
    const apiPropertyOptions = {
        description: `${String(properties.entity.name)} ${properties.description ?? ""}`,
        nullable: properties.isNullable,
        type: EApiPropertyDataType.BOOLEAN,
    };
    apiPropertyOptions.required = properties.isResponse === false || properties.isResponse === undefined ? properties.isRequired : false;
    if (properties.isArray) {
        apiPropertyOptions.isArray = true;
        apiPropertyOptions.minItems = properties.minItems;
        apiPropertyOptions.maxItems = properties.maxItems;
        apiPropertyOptions.uniqueItems = properties.isUniqueItems;
        apiPropertyOptions.example = [true];
    }
    else {
        apiPropertyOptions.example = true;
    }
    return apiPropertyOptions;
}
function buildDecorators(properties, apiPropertyOptions) {
    const decorators = [ApiProperty(apiPropertyOptions)];
    decorators.push(...buildResponseDecorators(properties), ...buildRequestDecorators(properties), ...buildFormatDecorators(properties), ...buildTransformDecorators(properties));
    return decorators;
}
function buildFormatDecorators(properties) {
    const decorators = [];
    const isArray = properties.isArray ?? false;
    if (properties.isResponse === undefined || !properties.isResponse) {
        decorators.push(IsBoolean({ each: isArray }));
    }
    return decorators;
}
function buildRequestDecorators(properties) {
    const decorators = [];
    if (properties.isResponse === false || properties.isResponse === undefined) {
        if (!properties.isRequired) {
            decorators.push(IsOptional());
        }
        if (properties.isArray === true) {
            decorators.push(IsArray(), ArrayMinSize(properties.minItems), ArrayMaxSize(properties.maxItems));
            if (properties.minItems > 0) {
                decorators.push(ArrayNotEmpty());
            }
        }
    }
    return decorators;
}
function buildResponseDecorators(properties) {
    const decorators = [];
    if (properties.isResponse) {
        decorators.push(ApiResponseProperty());
        if (properties.isExpose === undefined || properties.isExpose) {
            decorators.push(Expose());
        }
        else {
            decorators.push(Exclude());
        }
    }
    return decorators;
}
function buildTransformDecorators(properties) {
    const decorators = [];
    if (!properties.isResponse) {
        if (properties.isArray) {
            decorators.push(Transform(({ value }) => {
                if (value === null || value === undefined) {
                    return [];
                }
                if (!Array.isArray(value)) {
                    const singleValue = value;
                    if (singleValue === undefined || singleValue === null)
                        return [false];
                    if (typeof singleValue === "boolean")
                        return [singleValue];
                    if (typeof singleValue === "number")
                        return [singleValue !== 0];
                    if (typeof singleValue === "string") {
                        const normalized = singleValue.toLowerCase().trim();
                        if (normalized === "true" || normalized === "1")
                            return [true];
                        if (normalized === "false" || normalized === "0")
                            return [false];
                        return [Boolean(normalized)];
                    }
                    return [false];
                }
                return value.map((_value) => {
                    if (_value === undefined || _value === null)
                        return false;
                    if (typeof _value === "boolean")
                        return _value;
                    if (typeof _value === "number")
                        return _value !== 0;
                    if (typeof _value === "string") {
                        const normalized = _value.toLowerCase().trim();
                        if (normalized === "true" || normalized === "1")
                            return true;
                        if (normalized === "false" || normalized === "0")
                            return false;
                        return Boolean(normalized);
                    }
                    return false;
                });
            }, { toClassOnly: true }));
        }
        else {
            decorators.push(Transform(({ value }) => {
                if (value === undefined || value === null)
                    return false;
                if (typeof value === "boolean")
                    return value;
                if (typeof value === "number")
                    return value !== 0;
                if (typeof value === "string") {
                    value = value.toLowerCase().trim();
                    if (value === "true" || value === "1")
                        return true;
                    if (value === "false" || value === "0")
                        return false;
                    return Boolean(value);
                }
                return false;
            }, { toClassOnly: true }));
        }
    }
    return decorators;
}
function validateOptions(properties) {
    const errors = [];
    if (properties.isArray === true) {
        if (properties.minItems > properties.maxItems) {
            errors.push("'minItems' is greater than 'maxItems'");
        }
        if (properties.minItems < 0) {
            errors.push("'minItems' is less than 0");
        }
        if (properties.maxItems < 0) {
            errors.push("'maxItems' is less than 0");
        }
        if (properties.isUniqueItems && properties.maxItems <= 1) {
            errors.push("'uniqueItems' is true but 'maxItems' is less than or equal to 1");
        }
    }
    if (errors.length > 0) {
        throw new Error(`ApiPropertyBoolean error: ${errors.join("\n")}`);
    }
}
//# sourceMappingURL=boolean.decorator.js.map