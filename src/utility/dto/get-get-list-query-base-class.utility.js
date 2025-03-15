var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Validate } from "class-validator";
import { GET_LIST_QUERY_DTO_FACTORY_CONSTANT } from "../../constant";
import { ApiPropertyEnum } from "../../decorator/api/property/enum.decorator";
import { ApiPropertyNumber } from "../../decorator/api/property/number.decorator";
import { EApiPropertyNumberType, EFilterOrderDirection } from "../../enum";
import { AllOrNoneOfListedProperties } from "../../validator";
import { FilterOrderByFromEntity } from "../api/filter-order-by-from-entity.utility";
import { CapitalizeString } from "../capitalize-string.utility";
export function DtoGetGetListQueryBaseClass(entity, entityMetadata, method, dtoType) {
    class BaseQueryDTO {
        limit;
        orderBy;
        orderDirection;
        page;
        object() {
            return this;
        }
    }
    __decorate([
        ApiPropertyNumber({
            description: "Items per page",
            entity: entityMetadata,
            exampleValue: GET_LIST_QUERY_DTO_FACTORY_CONSTANT.MINIMUM_LIST_LENGTH,
            format: EApiPropertyNumberType.INTEGER,
            isRequired: true,
            maximum: GET_LIST_QUERY_DTO_FACTORY_CONSTANT.MAXIMUM_LIST_LENGTH,
            minimum: GET_LIST_QUERY_DTO_FACTORY_CONSTANT.MINIMUM_LIST_LENGTH,
        }),
        __metadata("design:type", Number)
    ], BaseQueryDTO.prototype, "limit", void 0);
    __decorate([
        ApiPropertyEnum({
            description: "order by field",
            entity: entityMetadata,
            enum: FilterOrderByFromEntity(entity, entityMetadata, method, dtoType),
            enumName: `E${CapitalizeString(entityMetadata.name ?? "UnknownResource")}FilterOrderBy`,
            isRequired: false,
        }),
        __metadata("design:type", String)
    ], BaseQueryDTO.prototype, "orderBy", void 0);
    __decorate([
        ApiPropertyEnum({
            description: "order direction",
            entity: entityMetadata,
            enum: EFilterOrderDirection,
            enumName: "EFilterOrderDirection",
            isRequired: false,
        }),
        __metadata("design:type", String)
    ], BaseQueryDTO.prototype, "orderDirection", void 0);
    __decorate([
        ApiPropertyNumber({
            description: "Page to return",
            entity: entityMetadata,
            exampleValue: GET_LIST_QUERY_DTO_FACTORY_CONSTANT.MINIMUM_LIST_PAGES_COUNT,
            format: EApiPropertyNumberType.INTEGER,
            isRequired: true,
            maximum: GET_LIST_QUERY_DTO_FACTORY_CONSTANT.MAXIMUM_LIST_PAGES_COUNT,
            minimum: GET_LIST_QUERY_DTO_FACTORY_CONSTANT.MINIMUM_LIST_PAGES_COUNT,
        }),
        __metadata("design:type", Number)
    ], BaseQueryDTO.prototype, "page", void 0);
    __decorate([
        Validate(AllOrNoneOfListedProperties, ["orderBy", "orderDirection"]),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", Object)
    ], BaseQueryDTO.prototype, "object", null);
    return BaseQueryDTO;
}
//# sourceMappingURL=get-get-list-query-base-class.utility.js.map