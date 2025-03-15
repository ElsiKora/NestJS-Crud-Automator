import { applyDecorators } from "@nestjs/common";
import { ApiProperty, ApiResponseProperty } from "@nestjs/swagger";
import { Exclude, Expose, Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, ArrayNotEmpty, IsArray, IsDate, IsEmail, IsIP, IsLowercase, IsOptional, IsString, IsUppercase, IsUrl, IsUUID, Length, Matches, Validate } from "class-validator";
import { STRING_PROPERTY_API_INTERFACE_CONSTANT } from "../../../constant";
import { EApiPropertyDataType, EApiPropertyStringType } from "../../../enum";
import { IsRegularExpression } from "../../../validator";
export function ApiPropertyString(properties) {
    validateOptions(properties);
    const apiPropertyOptions = buildApiPropertyOptions(properties);
    const decorators = buildDecorators(properties, apiPropertyOptions);
    return applyDecorators(...decorators);
}
function buildApiPropertyOptions(properties) {
    const apiPropertyOptions = {
        description: `${String(properties.entity.name)} ${properties.description ?? ""}`,
        nullable: properties.isNullable,
        type: EApiPropertyDataType.STRING,
    };
    apiPropertyOptions.required = properties.isResponse === false || properties.isResponse === undefined ? properties.isRequired : false;
    if (properties.isArray === true) {
        apiPropertyOptions.isArray = true;
        apiPropertyOptions.minItems = properties.minItems;
        apiPropertyOptions.maxItems = properties.maxItems;
        apiPropertyOptions.uniqueItems = properties.isUniqueItems;
        apiPropertyOptions.items = {
            maxLength: properties.maxLength,
            minLength: properties.minLength,
        };
        apiPropertyOptions.example = Array.isArray(properties.exampleValue) ? properties.exampleValue : [properties.exampleValue];
    }
    else {
        apiPropertyOptions.maxLength = properties.maxLength;
        apiPropertyOptions.minLength = properties.minLength;
        apiPropertyOptions.example = properties.exampleValue;
    }
    apiPropertyOptions.format = properties.format;
    apiPropertyOptions.pattern = properties.pattern.slice(1, -1);
    return apiPropertyOptions;
}
function buildDecorators(properties, apiPropertyOptions) {
    const decorators = [ApiProperty(apiPropertyOptions)];
    decorators.push(...buildResponseDecorators(properties), ...buildRequestDecorators(properties), ...buildFormatDecorators(properties), ...buildStringValidationDecorators(properties));
    return decorators;
}
function buildFormatDecorators(properties) {
    const decorators = [];
    const isArray = properties.isArray ?? false;
    if (properties.isResponse === undefined || !properties.isResponse) {
        switch (properties.format) {
            case EApiPropertyStringType.DATE: {
                decorators.push(IsDate({ each: isArray }), Type(() => Date));
                break;
            }
            case EApiPropertyStringType.EMAIL: {
                decorators.push(IsEmail({}, { each: isArray }));
                break;
            }
            case EApiPropertyStringType.IP: {
                decorators.push(IsIP(STRING_PROPERTY_API_INTERFACE_CONSTANT.IP_VERSION, { each: isArray }));
                break;
            }
            case EApiPropertyStringType.LOWERCASE_STRING: {
                decorators.push(IsString({ each: isArray }), IsLowercase({ each: isArray }));
                break;
            }
            case EApiPropertyStringType.REGEXP: {
                decorators.push(Validate(IsRegularExpression, {
                    each: isArray,
                    message: `${String(properties.description)} must be valid regular expression string`,
                }), Matches(new RegExp(properties.pattern.slice(1, -1)), { each: isArray }), Type(() => RegExp));
                break;
            }
            case EApiPropertyStringType.STRING: {
                decorators.push(IsString({ each: isArray }));
                break;
            }
            case EApiPropertyStringType.UPPERCASE_STRING: {
                decorators.push(IsString({ each: isArray }), IsUppercase({ each: isArray }));
                break;
            }
            case EApiPropertyStringType.URL: {
                decorators.push(IsUrl({
                    protocols: ["https", "http"],
                    require_host: true,
                    require_protocol: true,
                }, { each: isArray }));
                break;
            }
            case EApiPropertyStringType.UUID: {
                decorators.push(IsUUID("all", { each: isArray }));
                break;
            }
            default: {
                throw new Error(`ApiPropertyString error: Format is not valid for string property: ${String(properties.format)}`);
            }
        }
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
function buildStringValidationDecorators(properties) {
    const decorators = [];
    const isArray = properties.isArray ?? false;
    if (properties.isResponse === false || properties.isResponse === undefined) {
        Matches(new RegExp(properties.pattern.slice(1, -1)), { each: isArray });
        Length(properties.minLength, properties.maxLength, { each: isArray });
    }
    return decorators;
}
function validateOptions(properties) {
    const errors = [];
    if ((!properties.isResponse && (!properties.exampleValue || !properties.pattern)) || (properties.exampleValue && properties.pattern)) {
        const matches = /^\/(.*?)\/([gimuy]*)$/.exec(properties.pattern);
        if (matches) {
            const pattern = matches[STRING_PROPERTY_API_INTERFACE_CONSTANT.REGEX_PATTERN_INDEX];
            const flags = matches[STRING_PROPERTY_API_INTERFACE_CONSTANT.REGEX_FLAGS_INDEX];
            const regex = new RegExp(pattern, flags);
            if (Array.isArray(properties.exampleValue)) {
                for (const example of properties.exampleValue) {
                    if (!regex.test(example)) {
                        errors.push("RegExp 'pattern' does not match example string: " + example);
                    }
                }
            }
            else if (!regex.test(properties.exampleValue)) {
                errors.push("RegExp 'pattern' does not match 'example' string: " + properties.exampleValue);
            }
        }
        else {
            errors.push("Invalid RegExp 'pattern' format: " + properties.pattern);
        }
    }
    if (properties.minLength > properties.maxLength) {
        errors.push("'minLength' is greater than 'maxLength'");
    }
    if (properties.minLength < 0) {
        errors.push("'minLength' is less than 0");
    }
    if (properties.maxLength < 0) {
        errors.push("'maxLength' is less than 0");
    }
    if (Array.isArray(properties.exampleValue)) {
        for (const example of properties.exampleValue) {
            if (example.length < properties.minLength) {
                errors.push("Example length is less than 'minLength': " + example);
            }
        }
    }
    else if (properties.exampleValue.length < properties.minLength) {
        errors.push("Example length is less than 'minLength': " + properties.exampleValue);
    }
    if (Array.isArray(properties.exampleValue)) {
        for (const example of properties.exampleValue) {
            if (example.length > properties.maxLength) {
                errors.push("Example length is greater than 'maxLength': " + example);
            }
        }
    }
    else if (properties.exampleValue.length > properties.maxLength) {
        errors.push("Example length is greater than 'maxLength': " + properties.exampleValue);
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
        throw new Error(`ApiPropertyString error: ${errors.join("\n")}`);
    }
}
//# sourceMappingURL=string.decorator.js.map