import type { Type } from "@nestjs/common";

import type { IApiEntity } from "../../interface";

import { ApiPropertyUUID } from "../../decorator/api/property/uuid.decorator";
import { EApiDtoType, EApiRouteType } from "../../enum";
import { CamelCaseString } from "../camel-case-string.utility";
import { CapitalizeString } from "../capitalize-string.utility";

export function DtoGenerateRelationResponse<E>(entity: IApiEntity<E>, method: EApiRouteType, dtoType: EApiDtoType, propertyName: string): Type<unknown> {
	class GeneratedRelationDTO {
		@ApiPropertyUUID({ entity, isResponse: true })
		id!: string;
	}

	Object.defineProperty(GeneratedRelationDTO, "name", { value: `${String(entity.name)}${CamelCaseString(method)}${CamelCaseString(dtoType)}${CapitalizeString(propertyName)}DTO` });

	return GeneratedRelationDTO;
}
