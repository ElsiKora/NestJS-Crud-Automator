import {EApiDtoType, EApiRouteType} from "../../enum";
import type { TApiPropertyDescribeProperties } from "../../type";

import type { TApiPropertyDescribeDtoProperties } from "../../type";

import type { Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";
import {
    TApiPropertyDescribeDtoGuardProperties
} from "../../type/decorator/api/property/describe/dto/guard-properties.type";

export function DtoIsPropertyExposedForGuard(method: EApiRouteType, propertyMetadata: TApiPropertyDescribeProperties, dtoType: EApiDtoType, currentGuard?: Type<IAuthGuard>): boolean {

	const properties: Record<EApiDtoType, TApiPropertyDescribeDtoProperties> | undefined = propertyMetadata.properties?.[method] as Record<EApiDtoType, TApiPropertyDescribeDtoProperties> | undefined;


	if (!properties?.[dtoType]?.guard || !currentGuard) {
		return true;
	}
	console.log("CHECKING GUARD", properties?.[dtoType]?.guard, currentGuard, propertyMetadata);
	const { guards, isInverse = false }: TApiPropertyDescribeDtoGuardProperties = properties?.[dtoType]?.guard;
	const guardArray: Array<Type<IAuthGuard>> = Array.isArray(guards) ? guards : [guards];
	const isGuardMatch: boolean = guardArray.includes(currentGuard);

	console.log("GUARD RESULT", isGuardMatch, isInverse);
	return isInverse ? !isGuardMatch : isGuardMatch;
}
