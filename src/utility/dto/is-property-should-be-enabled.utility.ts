import { EApiDtoType, EApiRouteType } from "../../enum";

import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeProperties } from "../../type";

export const DtoIsPropertyShouldBeMarked = (method: EApiRouteType, dtoType: EApiDtoType, propertyName: string, propertyMetadata: TApiPropertyDescribeProperties, isPrimary: boolean): boolean => {
	const isDateField: boolean = ["createdAt", "receivedAt", "updatedAt"].includes(propertyName);

	if (method === EApiRouteType.CREATE && dtoType === EApiDtoType.BODY && isDateField) {
		return false;
	}

	const properties: Record<EApiDtoType, TApiPropertyDescribeDtoProperties> | undefined = propertyMetadata.properties?.[method] as Record<EApiDtoType, TApiPropertyDescribeDtoProperties> | undefined;

	if (properties?.[dtoType]?.enabled === false) {
		return false;
	}

	if (dtoType === EApiDtoType.REQUEST && isPrimary) {
		return true;
	}

	if (dtoType === EApiDtoType.QUERY && !isPrimary) {
		return true;
	}

	if (dtoType !== EApiDtoType.REQUEST && dtoType !== EApiDtoType.QUERY) {
		return true;
	}

	return false;
};
