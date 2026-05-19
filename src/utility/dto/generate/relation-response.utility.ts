import type { IApiEntity } from "@interface/entity";
import type { Type } from "@nestjs/common";

import { ApiPropertyUUID } from "@decorator/api/property/uuid.decorator";
import { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import { CamelCaseString } from "@utility/camel-case-string.utility";
import { CapitalizeString } from "@utility/capitalize-string.utility";

/**
 * Creates a simple relationship DTO containing only an ID field.
 * Used for representing related entities in API responses with minimal information.
 * @param {IApiEntity<E>} entity - The entity metadata
 * @param {EApiRouteType} method - The API route type (CREATE, DELETE, GET, etc.)
 * @param {EApiDtoType} dtoType - The type of DTO (REQUEST, RESPONSE, etc.)
 * @param {string} propertyName - The name of the relation property
 * @param {{ relationDescription?: string }} [options] - Optional relation metadata used for the nested identifier schema
 * @param {string} [options.relationDescription] - Relation-aware description to use for the nested id field.
 * @returns {Type<unknown>} A generated DTO class for relation representation
 * @template E - The entity type
 */
export function DtoGenerateRelationResponse<E>(entity: IApiEntity<E>, method: EApiRouteType, dtoType: EApiDtoType, propertyName: string, options: { relationDescription?: string } = {}): Type<unknown> {
	const entityName: string = (entity.name ?? "").trim();
	const relationDescriptionCandidate: string | undefined = options.relationDescription?.trim();
	let relationDescription: string = propertyName;

	if (relationDescriptionCandidate) {
		relationDescription = relationDescriptionCandidate;
	}

	const shouldPrefixOwnerName: boolean = !!entityName && !relationDescription.toLocaleLowerCase().startsWith(`${entityName.toLocaleLowerCase()} `);

	const identifierEntity: IApiEntity<E> = {
		...entity,
		name: shouldPrefixOwnerName ? `${entityName} ${relationDescription}` : relationDescription,
	};

	class GeneratedRelationDTO {
		@ApiPropertyUUID({ entity: identifierEntity, isResponse: true })
		id!: string;
	}

	Object.defineProperty(GeneratedRelationDTO, "name", { value: `${String(entity.name)}${CamelCaseString(method)}${CamelCaseString(dtoType)}${CapitalizeString(propertyName)}DTO` });

	return GeneratedRelationDTO;
}
