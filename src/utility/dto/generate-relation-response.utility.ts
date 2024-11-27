import { ApiPropertyUUID } from "../../decorator/api/property/uuid.decorator";

import { EApiDtoType, EApiRouteType } from "../../enum";
import { CapitalizeString } from "../capitalize-string.utility";

import type { IApiEntity } from "../../interface";

import type { Type } from "@nestjs/common";

export function DtoGenerateRelationResponse<E>(entity: IApiEntity<E>, method: EApiRouteType, dtoType: EApiDtoType, propertyName: string): Type<unknown> {
	class GeneratedRelationDTO {
		@ApiPropertyUUID({ entity, isResponse: true })
		id!: string;
	}

	Object.defineProperty(GeneratedRelationDTO, "name", { value: `${entity.name}${CapitalizeString(method)}${CapitalizeString(dtoType)}${CapitalizeString(propertyName)}DTO` });

	return GeneratedRelationDTO;
}
