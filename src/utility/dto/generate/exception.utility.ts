import { STATUS_CODES } from "node:http";

import { ExceptionDetailsForeignKeyViolationDTO, ExceptionDetailsInvalidReferenceDTO, ExceptionDetailsToManyUpdateKeyDTO, ExceptionDetailsUniqueViolationDTO } from "@class/utility/dto/exception/details";
import { CORRELATION_ID_CONSTANT } from "@constant/correlation-id.constant";
import { DATE_CONSTANT } from "@constant/date.constant";
import { NUMBER_CONSTANT } from "@constant/number.constant";
import { ApiPropertyEnum } from "@decorator/api/property/enum.decorator";
import { ApiPropertyNumber } from "@decorator/api/property/number.decorator";
import { ApiPropertyObject } from "@decorator/api/property/object.decorator";
import { EApiPropertyDataType, EApiPropertyNumberType } from "@enum/decorator/api";
import { EApiExceptionDetailsType } from "@enum/utility/exception-details-type.enum";
import { HttpStatus, type Type } from "@nestjs/common";
import { ApiExtraModels, ApiProperty, type ApiPropertyOptions } from "@nestjs/swagger";
import { CamelCaseString } from "@utility/camel-case-string.utility";
import { DtoSetGeneratedName } from "@utility/dto/set-generated-name.utility";

// The correlation fields come from these two optional components, so no status requires them
const CORRELATION_FIELD_NOTE: string = "sent when CorrelationIDResponseBodyInterceptor or CorrelationIDResponseBodyExceptionFilter handles the error";

// A generated UUID or the client ID, which CorrelationIDReadHeader accepts by the same pattern
const CORRELATION_ID_PROPERTY_OPTIONS: ApiPropertyOptions = {
	description: `Correlation identifier, ${CORRELATION_FIELD_NOTE}`,
	example: "550e8400-e29b-41d4-a716-446655440000",
	maxLength: CORRELATION_ID_CONSTANT.MAXIMUM_LENGTH,
	minLength: CORRELATION_ID_CONSTANT.MINIMUM_LENGTH,
	// eslint-disable-next-line @elsikora/typescript/naming-convention
	nullable: false,
	pattern: CORRELATION_ID_CONSTANT.PATTERN.source,
	// eslint-disable-next-line @elsikora/typescript/naming-convention
	readOnly: true,
	// eslint-disable-next-line @elsikora/typescript/naming-convention
	required: false,
	type: EApiPropertyDataType.STRING,
};

// Free text, or the list of messages a ValidationPipe answers
const ERROR_MESSAGE_PROPERTY_OPTIONS: ApiPropertyOptions = {
	description: "Error message",
	example: "Error message",
	// eslint-disable-next-line @elsikora/typescript/naming-convention
	nullable: false,
	oneOf: [{ type: EApiPropertyDataType.STRING }, { items: { type: EApiPropertyDataType.STRING }, type: "array" }],
	// eslint-disable-next-line @elsikora/typescript/naming-convention
	readOnly: true,
	// eslint-disable-next-line @elsikora/typescript/naming-convention
	required: true,
};

const exceptionDtoCache: Map<HttpStatus, Type<unknown>> = new Map<HttpStatus, Type<unknown>>();

/**
 * Statuses that can arise before CorrelationIDResponseBodyInterceptor runs: the body parser (`400`, `413`, `415`), guards (`401`, `403`, `429`), and a failing guard (`500`).
 * Their body carries `error` only when the exception that raised it does or CorrelationIDResponseBodyExceptionFilter is registered.
 */
const PRE_INTERCEPTOR_EXCEPTION_STATUSES: ReadonlySet<HttpStatus> = new Set<HttpStatus>([HttpStatus.BAD_REQUEST, HttpStatus.FORBIDDEN, HttpStatus.INTERNAL_SERVER_ERROR, HttpStatus.PAYLOAD_TOO_LARGE, HttpStatus.TOO_MANY_REQUESTS, HttpStatus.UNAUTHORIZED, HttpStatus.UNSUPPORTED_MEDIA_TYPE]);

const EXCEPTION_FILTER_FIELD_NOTE: string = "sent when the exception sets it or CorrelationIDResponseBodyExceptionFilter is registered";

/**
 * Details variants each status can carry on the wire, keyed by the details `type` discriminator.
 * Only the package's own database and relation reference failures attach details.
 */
const EXCEPTION_DETAILS_BY_STATUS: ReadonlyMap<HttpStatus, Readonly<Partial<Record<EApiExceptionDetailsType, Type<unknown>>>>> = new Map<HttpStatus, Readonly<Partial<Record<EApiExceptionDetailsType, Type<unknown>>>>>([
	[
		HttpStatus.BAD_REQUEST,
		{
			[EApiExceptionDetailsType.FOREIGN_KEY_VIOLATION]: ExceptionDetailsForeignKeyViolationDTO,
			[EApiExceptionDetailsType.INVALID_REFERENCE]: ExceptionDetailsInvalidReferenceDTO,
			[EApiExceptionDetailsType.TO_MANY_UPDATE_KEY]: ExceptionDetailsToManyUpdateKeyDTO,
		},
	],
	[
		HttpStatus.CONFLICT,
		{
			[EApiExceptionDetailsType.UNIQUE_VIOLATION]: ExceptionDetailsUniqueViolationDTO,
		},
	],
]);

/**
 * Creates the exception DTO that describes the error body of one HTTP status.
 * The body carries error, message, and statusCode, and correlationID and timestamp when CorrelationIDResponseBodyInterceptor or CorrelationIDResponseBodyExceptionFilter handles the error, so no status requires those two.
 * Statuses with package details (`400`, `409`) also describe the discriminated `details` object with the variants of that status.
 * Statuses that can arise before the interceptor (`400`, `401`, `403`, `413`, `415`, `429`, `500`) require only message and statusCode; the others also require error.
 * @param {HttpStatus} httpStatus - The HTTP status code for the exception
 * @returns {Type<unknown>} A generated DTO class for the exception
 */
export function DtoGenerateException(httpStatus: HttpStatus): Type<unknown> {
	const cached: Type<unknown> | undefined = exceptionDtoCache.get(httpStatus);

	if (cached) {
		return cached;
	}

	const errorName: string = HttpStatus[httpStatus];
	const errorText: string = STATUS_CODES[httpStatus] ?? "Error";
	const isPreInterceptorStatus: boolean = PRE_INTERCEPTOR_EXCEPTION_STATUSES.has(httpStatus);

	const detailsMapping: Readonly<Partial<Record<EApiExceptionDetailsType, Type<unknown>>>> | undefined = EXCEPTION_DETAILS_BY_STATUS.get(httpStatus);
	const detailsTypes: Array<Type<unknown>> = detailsMapping ? Object.values(detailsMapping) : [];

	// Free text: the status text, or a string the thrown exception sets
	const errorNameOptions: ApiPropertyOptions = {
		description: isPreInterceptorStatus ? `Error name, ${EXCEPTION_FILTER_FIELD_NOTE}` : "Error name",
		example: errorText,
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		nullable: false,
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		readOnly: true,
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		required: !isPreInterceptorStatus,
		type: EApiPropertyDataType.STRING,
	};

	class GeneratedErrorDTO {
		@ApiProperty(CORRELATION_ID_PROPERTY_OPTIONS)
		correlationID!: string;

		@buildDetailsDecorator(detailsMapping)
		details?: Record<string, unknown>;

		@ApiProperty(errorNameOptions)
		error: string = errorText;

		@ApiProperty(ERROR_MESSAGE_PROPERTY_OPTIONS)
		message: Array<string> | string = "Error message";

		@ApiPropertyEnum({
			description: "status code",
			entity: { name: "Error" },
			enum: HttpStatus,
			enumName: "EHttpStatus",
			exampleValue: httpStatus,
			isRequired: true,
			isResponse: true,
		})
		statusCode: HttpStatus = httpStatus;

		@ApiPropertyNumber({
			description: `timestamp, ${CORRELATION_FIELD_NOTE}`,
			entity: { name: "Error" },
			exampleValue: Date.now(),
			format: EApiPropertyNumberType.INTEGER,
			isRequired: false,
			isResponse: true,
			maximum: DATE_CONSTANT.MAXIMUM_UNIX_TIME,
			minimum: DATE_CONSTANT.MINIMUM_UNIX_TIME,
			multipleOf: NUMBER_CONSTANT.ONE,
		})
		timestamp!: number;
	}

	if (detailsTypes.length > 0) {
		// Register discriminator DTOs so Swagger includes their schemas in components.schemas
		ApiExtraModels(...detailsTypes)(GeneratedErrorDTO);
	}

	DtoSetGeneratedName(GeneratedErrorDTO, `Exception${CamelCaseString(errorName)}DTO`, `HTTP status ${String(httpStatus)}`);

	exceptionDtoCache.set(httpStatus, GeneratedErrorDTO);

	return GeneratedErrorDTO;
}

/**
 * Builds the decorator of the discriminated `details` property of one status.
 * Statuses without package details leave the property out of the schema.
 * @param {Readonly<Partial<Record<EApiExceptionDetailsType, Type<unknown>>>> | undefined} detailsMapping - Details variants of the status, keyed by `details.type`.
 * @returns {PropertyDecorator} The details property decorator, or one that declares nothing.
 */
function buildDetailsDecorator(detailsMapping: Readonly<Partial<Record<EApiExceptionDetailsType, Type<unknown>>>> | undefined): PropertyDecorator {
	if (!detailsMapping) {
		return (): void => {
			// No details on this status
		};
	}

	return ApiPropertyObject({
		description: "details",
		discriminator: {
			mapping: detailsMapping as Record<string, Type<unknown>>,
			propertyName: "type",
			shouldKeepDiscriminatorProperty: true,
		},
		entity: { name: "Error" },
		isRequired: false,
		isResponse: true,
		type: Object.values(detailsMapping),
	});
}
