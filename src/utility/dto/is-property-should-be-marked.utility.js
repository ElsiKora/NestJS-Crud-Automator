import { EApiDtoType, EApiPropertyDescribeType, EApiRouteType } from "../../enum";
import { DtoIsPropertyExposedForGuard } from "./is-property-exposed-for-guard.utility";
export function DtoIsPropertyShouldBeMarked(method, dtoType, propertyName, propertyMetadata, isPrimary, currentGuard) {
    const isDateField = ["createdAt", "receivedAt", "updatedAt"].includes(propertyName);
    if (method === EApiRouteType.CREATE && dtoType === EApiDtoType.BODY && isDateField) {
        return false;
    }
    const properties = propertyMetadata.properties?.[method];
    if (properties?.[dtoType]?.isEnabled === false) {
        return false;
    }
    if (!DtoIsPropertyExposedForGuard(method, propertyMetadata, dtoType, currentGuard)) {
        return false;
    }
    if (dtoType === EApiDtoType.QUERY && propertyMetadata.type === EApiPropertyDescribeType.OBJECT) {
        return false;
    }
    if (dtoType === EApiDtoType.REQUEST && isPrimary) {
        return true;
    }
    if ((dtoType === EApiDtoType.QUERY || dtoType === EApiDtoType.BODY) && !isPrimary) {
        return true;
    }
    return dtoType !== EApiDtoType.REQUEST && dtoType !== EApiDtoType.QUERY && dtoType !== EApiDtoType.BODY;
}
//# sourceMappingURL=is-property-should-be-marked.utility.js.map