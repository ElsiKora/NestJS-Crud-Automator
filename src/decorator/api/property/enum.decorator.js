import { applyDecorators } from "@nestjs/common";
import { ApiProperty, ApiResponseProperty } from "@nestjs/swagger";
import { Exclude, Expose } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, ArrayNotEmpty, IsArray, IsEnum, IsOptional } from "class-validator";
export function ApiPropertyEnum(properties) {
    validateOptions(properties);
    const apiPropertyOptions = buildApiPropertyOptions(properties);
    const decorators = buildDecorators(properties, apiPropertyOptions);
    return applyDecorators(...decorators);
}
function buildApiPropertyOptions(properties) {
    const apiPropertyOptions = {
        description: `${String(properties.entity.name)} ${properties.description ?? ""}`,
        nullable: properties.isNullable,
    };
    apiPropertyOptions.required = properties.isResponse === false || properties.isResponse === undefined ? properties.isRequired : false;
    if (properties.isArray === true) {
        apiPropertyOptions.isArray = true;
        apiPropertyOptions.minItems = properties.minItems;
        apiPropertyOptions.maxItems = properties.maxItems;
        apiPropertyOptions.uniqueItems = properties.isUniqueItems;
        if (properties.exampleValue) {
            apiPropertyOptions.example = Array.isArray(properties.exampleValue) ? properties.exampleValue : [properties.exampleValue];
        }
        else {
            apiPropertyOptions.example = [Object.values(properties.enum)[0]];
        }
    }
    else if (properties.exampleValue) {
        apiPropertyOptions.example = properties.exampleValue;
    }
    else {
        apiPropertyOptions.example = Object.values(properties.enum)[0];
    }
    apiPropertyOptions.enum = properties.enum;
    return apiPropertyOptions;
}
function buildDecorators(properties, apiPropertyOptions) {
    const decorators = [ApiProperty(apiPropertyOptions)];
    decorators.push(...buildResponseDecorators(properties), ...buildRequestDecorators(properties), ...buildFormatDecorators(properties));
    return decorators;
}
function buildFormatDecorators(properties) {
    const decorators = [];
    const isArray = properties.isArray ?? false;
    decorators.push(IsEnum(properties.enum, { each: isArray }));
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
    if (properties.exampleValue && !Object.values(properties.enum).includes(properties.exampleValue)) {
        errors.push("'exampleValue' is not in 'enum'");
    }
    if (errors.length > 0) {
        throw new Error(`ApiPropertyEnum error: ${errors.join("\n")}`);
    }
}
//# sourceMappingURL=enum.decorator.js.map