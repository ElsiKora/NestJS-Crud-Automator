var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ApiPropertyUUID } from "../../decorator/api/property/uuid.decorator";
import { CamelCaseString } from "../camel-case-string.utility";
import { CapitalizeString } from "../capitalize-string.utility";
export function DtoGenerateRelationResponse(entity, method, dtoType, propertyName) {
    class GeneratedRelationDTO {
        id;
    }
    __decorate([
        ApiPropertyUUID({ entity, isResponse: true }),
        __metadata("design:type", String)
    ], GeneratedRelationDTO.prototype, "id", void 0);
    Object.defineProperty(GeneratedRelationDTO, "name", { value: `${String(entity.name)}${CamelCaseString(method)}${CamelCaseString(dtoType)}${CapitalizeString(propertyName)}DTO` });
    return GeneratedRelationDTO;
}
//# sourceMappingURL=generate-relation-response.utility.js.map