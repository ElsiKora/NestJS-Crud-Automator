var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { HttpStatus } from "@nestjs/common";
import { DATE_CONSTANT, EXCEPTION_DTO_CONSTANT, NUMBER_CONSTANT } from "../../constant";
import { ApiPropertyEnum } from "../../decorator/api/property/enum.decorator";
import { ApiPropertyNumber } from "../../decorator/api/property/number.decorator";
import { ApiPropertyString } from "../../decorator/api/property/string.decorator";
import { ApiPropertyUUID } from "../../decorator/api/property/uuid.decorator";
import { EApiPropertyNumberType, EApiPropertyStringType } from "../../enum";
import { CamelCaseString } from "../camel-case-string.utility";
export function DtoGenerateException(httpStatus) {
    const errorName = HttpStatus[httpStatus];
    class GeneratedErrorDTO {
        correlationID;
        error = CamelCaseString(errorName);
        message = "Error message";
        statusCode = httpStatus;
        timestamp;
    }
    __decorate([
        ApiPropertyUUID({ entity: { name: "Correlation" }, isResponse: true }),
        __metadata("design:type", String)
    ], GeneratedErrorDTO.prototype, "correlationID", void 0);
    __decorate([
        ApiPropertyString({
            description: "name",
            entity: { name: "Error" },
            exampleValue: CamelCaseString(errorName),
            format: EApiPropertyStringType.STRING,
            isResponse: true,
            maxLength: EXCEPTION_DTO_CONSTANT.MAXIMUM_ERROR_LENGTH,
            minLength: EXCEPTION_DTO_CONSTANT.MINIMUM_ERROR_LENGTH,
            pattern: "/^[a-zA-Z_ ]{3,64}$/",
        }),
        __metadata("design:type", String)
    ], GeneratedErrorDTO.prototype, "error", void 0);
    __decorate([
        ApiPropertyString({
            description: "message",
            entity: { name: "Error" },
            exampleValue: "Error message",
            format: EApiPropertyStringType.STRING,
            isResponse: true,
            maxLength: EXCEPTION_DTO_CONSTANT.MAXIMUM_ERROR_MESSAGE_LENGTH,
            minLength: EXCEPTION_DTO_CONSTANT.MINIMUM_ERROR_MESSAGE_LENGTH,
            pattern: "/^[a-zA-Z_ ]{3,64}$/",
        }),
        __metadata("design:type", String)
    ], GeneratedErrorDTO.prototype, "message", void 0);
    __decorate([
        ApiPropertyEnum({
            description: "status code",
            entity: { name: "Error" },
            enum: HttpStatus,
            enumName: "EHttpStatus",
            exampleValue: httpStatus,
            isResponse: true,
        }),
        __metadata("design:type", Number)
    ], GeneratedErrorDTO.prototype, "statusCode", void 0);
    __decorate([
        ApiPropertyNumber({
            description: "timestamp",
            entity: { name: "Error" },
            exampleValue: Date.now(),
            format: EApiPropertyNumberType.INTEGER,
            isResponse: true,
            maximum: DATE_CONSTANT.MAXIMUM_UNIX_TIME,
            minimum: DATE_CONSTANT.MINIMUM_UNIX_TIME,
            multipleOf: NUMBER_CONSTANT.ONE,
        }),
        __metadata("design:type", Number)
    ], GeneratedErrorDTO.prototype, "timestamp", void 0);
    Object.defineProperty(GeneratedErrorDTO, "name", { value: `Exception${CamelCaseString(errorName)}DTO` });
    return GeneratedErrorDTO;
}
//# sourceMappingURL=generate-exception.utility.js.map