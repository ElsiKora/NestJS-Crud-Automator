var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { PickType } from "@nestjs/swagger";
import { ApiPropertyNumber } from "src/decorator/api/property/number.decorator";
import { ApiPropertyObject } from "src/decorator/api/property/object.decorator";
import LIST_DTO_CONSTANT from "../../constant/dto/list.constant";
import { EApiPropertyNumberType } from "../../enum";
export function DtoGenerateGetListResponse(resourceClass, responseResourceClass, name) {
    class ApiListGetResponse extends PickType(resourceClass, []) {
        count;
        currentPage;
        items;
        totalCount;
        totalPages;
    }
    __decorate([
        ApiPropertyNumber({
            description: "Total number of items on page",
            entity: resourceClass,
            exampleValue: LIST_DTO_CONSTANT.MINIMUM_LIST_LENGTH,
            format: EApiPropertyNumberType.INTEGER,
            isResponse: true,
            maximum: LIST_DTO_CONSTANT.MAXIMUM_LIST_LENGTH,
            minimum: LIST_DTO_CONSTANT.MINIMUM_LIST_LENGTH,
            multipleOf: 1,
        }),
        __metadata("design:type", Number)
    ], ApiListGetResponse.prototype, "count", void 0);
    __decorate([
        ApiPropertyNumber({
            description: "Current page number",
            entity: resourceClass,
            exampleValue: LIST_DTO_CONSTANT.MINIMUM_LIST_PAGES_COUNT,
            format: EApiPropertyNumberType.INTEGER,
            isResponse: true,
            maximum: LIST_DTO_CONSTANT.MAXIMUM_LIST_PAGES_COUNT,
            minimum: LIST_DTO_CONSTANT.MINIMUM_LIST_PAGES_COUNT,
            multipleOf: 1,
        }),
        __metadata("design:type", Number)
    ], ApiListGetResponse.prototype, "currentPage", void 0);
    __decorate([
        ApiPropertyObject({
            entity: resourceClass,
            isArray: true,
            isResponse: true,
            isUniqueItems: true,
            maxItems: LIST_DTO_CONSTANT.MAXIMUM_LIST_LENGTH,
            minItems: LIST_DTO_CONSTANT.MINIMUM_LIST_LENGTH,
            type: responseResourceClass,
        }),
        __metadata("design:type", Array)
    ], ApiListGetResponse.prototype, "items", void 0);
    __decorate([
        ApiPropertyNumber({
            description: "Total number of items",
            entity: resourceClass,
            exampleValue: LIST_DTO_CONSTANT.MINIMUM_LIST_LENGTH,
            format: EApiPropertyNumberType.INTEGER,
            isResponse: true,
            maximum: LIST_DTO_CONSTANT.MAXIMUM_LIST_LENGTH,
            minimum: LIST_DTO_CONSTANT.MINIMUM_LIST_LENGTH,
            multipleOf: 1,
        }),
        __metadata("design:type", Number)
    ], ApiListGetResponse.prototype, "totalCount", void 0);
    __decorate([
        ApiPropertyNumber({
            description: "Total number of pages",
            entity: resourceClass,
            exampleValue: LIST_DTO_CONSTANT.MINIMUM_LIST_PAGES_COUNT,
            format: EApiPropertyNumberType.INTEGER,
            isResponse: true,
            maximum: LIST_DTO_CONSTANT.MAXIMUM_LIST_PAGES_COUNT,
            minimum: LIST_DTO_CONSTANT.MINIMUM_LIST_PAGES_COUNT,
            multipleOf: 1,
        }),
        __metadata("design:type", Number)
    ], ApiListGetResponse.prototype, "totalPages", void 0);
    Object.defineProperty(ApiListGetResponse, "name", {
        value: name,
    });
    return ApiListGetResponse;
}
//# sourceMappingURL=generate-get-list-response.utility.js.map