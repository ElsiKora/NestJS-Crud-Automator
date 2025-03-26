import type { Type } from "@nestjs/common";

import type { IApiEntity } from "../../interface";

import { ApiPropertyUUID } from "../../decorator/api/property/uuid.decorator";
import { EApiDtoType, EApiRouteType } from "../../enum";
import { CamelCaseString } from "../camel-case-string.utility";
import { CapitalizeString } from "../capitalize-string.utility";

/**
 * Creates a simple relationship DTO containing only an ID field.
 * Used for representing related entities in API responses with minimal information.
 * @param {IApiEntity<E>} entity - The entity metadata
 * @param {EApiRouteType} method - The API route type (CREATE, DELETE, GET, etc.)
 * @param {EApiDtoType} dtoType - The type of DTO (REQUEST, RESPONSE, etc.)
 * @param {string} propertyName - The name of the relation property
 * @returns {Type<unknown>} A generated DTO class for relation representation
 * @template E - The entity type
 */
export function DtoGenerateRelationResponse<E>(entity: IApiEntity<E>, method: EApiRouteType, dtoType: EApiDtoType, propertyName: string): Type<unknown> {
	class GeneratedRelationDTO {
		@ApiPropertyUUID({ entity, isResponse: true })
		id!: string;
	}

	Object.defineProperty(GeneratedRelationDTO, "name", { value: `${String(entity.name)}${CamelCaseString(method)}${CamelCaseString(dtoType)}${CapitalizeString(propertyName)}DTO` });

	return GeneratedRelationDTO;
}
