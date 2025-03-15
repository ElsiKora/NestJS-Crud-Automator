import { applyDecorators } from "@nestjs/common";
import { ApiProperty, ApiResponseProperty } from "@nestjs/swagger";
import { Exclude, Expose, Transform } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, ArrayNotEmpty, IsArray, IsDate, IsOptional } from "class-validator";
import { EApiPropertyDataType, EApiPropertyDateIdentifier, EApiPropertyDateType } from "../../../enum";
export function ApiPropertyDate(properties) {
    validateOptions(properties);
    const apiPropertyOptions = buildApiPropertyOptions(properties);
    const decorators = buildDecorators(properties, apiPropertyOptions);
    return applyDecorators(...decorators);
}
function buildApiPropertyOptions(properties) {
    const example = getExample(properties.format);
    const apiPropertyOptions = {
        description: `${String(properties.entity.name)} ${getDescription(properties.identifier)}`,
        nullable: properties.isNullable,
        type: EApiPropertyDataType.STRING,
    };
    apiPropertyOptions.required = properties.isResponse === false || properties.isResponse === undefined ? properties.isRequired : false;
    if (properties.isArray) {
        apiPropertyOptions.isArray = true;
        apiPropertyOptions.minItems = properties.minItems;
        apiPropertyOptions.maxItems = properties.maxItems;
        apiPropertyOptions.uniqueItems = properties.isUniqueItems;
        apiPropertyOptions.items = {
            maxLength: example.length,
            minLength: example.length,
        };
        apiPropertyOptions.example = [example];
    }
    else {
        apiPropertyOptions.minLength = example.length;
        apiPropertyOptions.maxLength = example.length;
        apiPropertyOptions.example = example;
    }
    apiPropertyOptions.pattern = getPattern(properties.format);
    apiPropertyOptions.format = properties.format;
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
    if (!properties.isResponse) {
        decorators.push(IsDate({ each: isArray }));
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
                if (!Array.isArray(value)) {
                    const singleValue = value;
                    return singleValue ? [new Date(singleValue)] : [];
                }
                return value.map((dateString) => (dateString ? new Date(dateString) : undefined));
            }, { toClassOnly: true }));
        }
        else {
            decorators.push(Transform(({ value }) => (value ? new Date(value) : undefined), { toClassOnly: true }));
        }
    }
    return decorators;
}
function getDescription(identifier) {
    switch (identifier) {
        case EApiPropertyDateIdentifier.CREATED_AT: {
            return "creation date";
        }
        case EApiPropertyDateIdentifier.CREATED_AT_FROM: {
            return "createdAt from";
        }
        case EApiPropertyDateIdentifier.CREATED_AT_TO: {
            return "createdAt to";
        }
        case EApiPropertyDateIdentifier.DATE: {
            return "date";
        }
        case EApiPropertyDateIdentifier.EXPIRES_IN: {
            return "expiration date";
        }
        case EApiPropertyDateIdentifier.RECEIVED_AT: {
            return "receivedAt date";
        }
        case EApiPropertyDateIdentifier.RECEIVED_AT_FROM: {
            return "receivedAt from";
        }
        case EApiPropertyDateIdentifier.RECEIVED_AT_TO: {
            return "receivedAt to";
        }
        case EApiPropertyDateIdentifier.REFRESH_IN: {
            return "refresh date";
        }
        case EApiPropertyDateIdentifier.UPDATED_AT: {
            return "last update date";
        }
        case EApiPropertyDateIdentifier.UPDATED_AT_FROM: {
            return "updatedAt from";
        }
        case EApiPropertyDateIdentifier.UPDATED_AT_TO: {
            return "updatedAt to";
        }
    }
}
function getExample(format) {
    const startOfYearUTCDate = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1, 0, 0, 0, 0));
    switch (format) {
        case EApiPropertyDateType.DATE: {
            return startOfYearUTCDate.toISOString().split("T")[0];
        }
        case EApiPropertyDateType.DATE_TIME: {
            return startOfYearUTCDate.toISOString();
        }
        case EApiPropertyDateType.TIME: {
            return startOfYearUTCDate.toISOString().split("T")[1].split(".")[0];
        }
    }
}
function getPattern(format) {
    switch (format) {
        case EApiPropertyDateType.DATE: {
            return "^[0-9]{4}-[0-9]{2}-[0-9]{2}$";
        }
        case EApiPropertyDateType.DATE_TIME: {
            return "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z$";
        }
        case EApiPropertyDateType.TIME: {
            return "^[0-9]{2}:[0-9]{2}:[0-9]{2}$";
        }
    }
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
        throw new Error(`ApiPropertyDate error: ${errors.join("\n")}`);
    }
}
//# sourceMappingURL=date.decorator.js.map