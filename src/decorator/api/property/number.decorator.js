import { applyDecorators } from "@nestjs/common";
import { ApiProperty, ApiResponseProperty } from "@nestjs/swagger";
import { Exclude, Expose, Transform, Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, ArrayNotEmpty, IsArray, IsDivisibleBy, IsInt, isInt, IsNumber, IsOptional, Max, Min } from "class-validator";
import random from "lodash/random";
import { NUMBER_CONSTANT } from "../../../constant";
import { EApiPropertyDataType, EApiPropertyNumberType } from "../../../enum";
export function ApiPropertyNumber(properties) {
    if (properties.exampleValue === undefined) {
        properties.exampleValue = random(properties.minimum, properties.maximum);
    }
    validateOptions(properties);
    const apiPropertyOptions = buildApiPropertyOptions(properties);
    const decorators = buildDecorators(properties, apiPropertyOptions);
    return applyDecorators(...decorators);
}
function buildApiPropertyOptions(properties) {
    const apiPropertyOptions = {
        description: `${String(properties.entity.name)} ${properties.description ?? ""}`,
        format: getFormat(properties),
        nullable: properties.isNullable,
        type: getType(properties),
    };
    apiPropertyOptions.required = properties.isResponse === false || properties.isResponse === undefined ? properties.isRequired : false;
    if (properties.isArray) {
        apiPropertyOptions.isArray = true;
        apiPropertyOptions.minItems = properties.minItems;
        apiPropertyOptions.maxItems = properties.maxItems;
        apiPropertyOptions.uniqueItems = properties.isUniqueItems;
        apiPropertyOptions.example = Array.isArray(properties.exampleValue) ? properties.exampleValue : [properties.exampleValue];
    }
    else {
        apiPropertyOptions.example = properties.exampleValue;
    }
    apiPropertyOptions.minimum = properties.minimum;
    apiPropertyOptions.maximum = properties.maximum;
    if ((properties.isResponse === false || properties.isResponse === undefined) && properties.multipleOf !== undefined) {
        apiPropertyOptions.multipleOf = properties.multipleOf;
    }
    return apiPropertyOptions;
}
function buildDecorators(properties, apiPropertyOptions) {
    const decorators = [ApiProperty(apiPropertyOptions)];
    decorators.push(...buildResponseDecorators(properties), ...buildRequestDecorators(properties), ...buildFormatDecorators(properties), ...buildTransformDecorators(properties), ...buildNumberValidationDecorators(properties));
    return decorators;
}
function buildFormatDecorators(properties) {
    const decorators = [];
    const isArray = properties.isArray ?? false;
    if (properties.isResponse === undefined || !properties.isResponse) {
        switch (properties.format) {
            case EApiPropertyNumberType.DOUBLE: {
                decorators.push(IsNumber({}, { each: isArray }));
                break;
            }
            case EApiPropertyNumberType.INTEGER: {
                decorators.push(IsInt({ each: isArray }));
                break;
            }
            default: {
                throw new Error(`ApiPropertyNumber error: Format is not valid for number property: ${String(properties.format)}`);
            }
        }
        decorators.push(Type(() => Number));
    }
    return decorators;
}
function buildNumberValidationDecorators(properties) {
    const decorators = [];
    const isArray = properties.isArray ?? false;
    if ((properties.isResponse === false || properties.isResponse === undefined) && properties.multipleOf !== undefined) {
        decorators.push(IsDivisibleBy(properties.multipleOf, { each: isArray }), Min(properties.minimum, { each: isArray }), Max(properties.maximum, { each: isArray }));
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
            decorators.push(Transform(({ value }) => value.map(Number), { toClassOnly: true }));
        }
        else {
            decorators.push(Transform(({ value }) => Number(value), { toClassOnly: true }));
        }
    }
    return decorators;
}
function getFormat(properties) {
    switch (properties.format) {
        case EApiPropertyNumberType.DOUBLE: {
            return EApiPropertyNumberType.DOUBLE;
        }
        case EApiPropertyNumberType.INTEGER: {
            return properties.maximum <= NUMBER_CONSTANT.MAX_INTEGER && properties.maximum >= NUMBER_CONSTANT.MIN_INTEGER ? "int32" : "int64";
        }
        default: {
            throw new Error("ApiPropertyNumber error: Format is not defined");
        }
    }
}
function getType(properties) {
    switch (properties.format) {
        case EApiPropertyNumberType.DOUBLE: {
            return EApiPropertyDataType.NUMBER;
        }
        case EApiPropertyNumberType.INTEGER: {
            return EApiPropertyDataType.INTEGER;
        }
    }
}
function validateOptions(properties) {
    const errors = [];
    if (properties.minimum > properties.maximum) {
        errors.push("'minimum' is greater than maximum");
    }
    if (properties.multipleOf !== undefined) {
        if (Array.isArray(properties.exampleValue)) {
            for (const example of properties.exampleValue) {
                if (!isInt(example / properties.multipleOf)) {
                    errors.push("'exampleValue' is not a multiple of 'multipleOf' value: " + String(example));
                }
            }
        }
        else if (properties.exampleValue !== undefined && !isInt(properties.exampleValue / properties.multipleOf)) {
            errors.push("'exampleValue' is not a multiple of 'multipleOf' value: " + String(properties.exampleValue));
        }
    }
    if (Array.isArray(properties.exampleValue)) {
        for (const example of properties.exampleValue) {
            if (example < properties.minimum) {
                errors.push("'exampleValue' is less than 'minimum': " + String(example));
            }
        }
    }
    else if (properties.exampleValue !== undefined && properties.exampleValue < properties.minimum) {
        errors.push("'exampleValue' is less than 'minimum': " + String(properties.exampleValue));
    }
    if (Array.isArray(properties.exampleValue)) {
        for (const example of properties.exampleValue) {
            if (example > properties.maximum) {
                errors.push("'exampleValue' is greater than 'maximum': " + String(example));
            }
        }
    }
    else if (properties.exampleValue !== undefined && properties.exampleValue > properties.maximum) {
        errors.push("'exampleValue' is greater than 'maximum': " + String(properties.exampleValue));
    }
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
        throw new Error(`ApiPropertyNumber error: ${errors.join("\n")}`);
    }
}
//# sourceMappingURL=number.decorator.js.map