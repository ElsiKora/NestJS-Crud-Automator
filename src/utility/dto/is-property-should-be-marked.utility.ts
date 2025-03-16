import type { Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";

import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeProperties } from "../../type";

import { EApiDtoType, EApiPropertyDescribeType, EApiRouteType } from "../../enum";

import { DtoIsPropertyExposedForGuard } from "./is-property-exposed-for-guard.utility";

export function DtoIsPropertyShouldBeMarked(method: EApiRouteType, dtoType: EApiDtoType, propertyName: string, propertyMetadata: TApiPropertyDescribeProperties, isPrimary: boolean, currentGuard?: Type<IAuthGuard>): boolean {
	const isDateField: boolean = ["createdAt", "receivedAt", "updatedAt"].includes(propertyName);

	if (method === EApiRouteType.CREATE && dtoType === EApiDtoType.BODY && isDateField) {
		return false;
	}

	const properties: Record<EApiDtoType, TApiPropertyDescribeDtoProperties> | undefined = propertyMetadata.properties?.[method] as Record<EApiDtoType, TApiPropertyDescribeDtoProperties> | undefined;

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
