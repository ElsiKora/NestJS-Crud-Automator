import type { IApiEntity } from "@interface/entity";
import type { Type } from "@nestjs/common";

import { ApiPropertyUUID } from "@decorator/api/property/uuid.decorator";
import { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import { CamelCaseString } from "@utility/camel-case-string.utility";
import { DtoSchemaNameGetSegment } from "@utility/dto/schema-name/get-segment.utility";
import { DtoSetGeneratedName } from "@utility/dto/set-generated-name.utility";

/**
 * Creates a simple relationship DTO containing only an ID field.
 * Used for representing related entities in API responses with minimal information.
 * @param {IApiEntity<E>} entity - The entity metadata
 * @param {EApiRouteType} method - The API route type (CREATE, DELETE, GET, etc.)
 * @param {EApiDtoType} dtoType - The type of DTO (REQUEST, RESPONSE, etc.)
 * @param {string} propertyName - The name of the relation property
 * @param {{ dtoNameBase?: string; dtoPropertyName?: string; hostDtoName?: string; relationDescription?: string }} [options] - Optional relation metadata used for the nested identifier schema
 * @param {string} [options.dtoNameBase] - Name of the parent DTO without the `DTO` suffix; the relation DTO is named `<dtoNameBase><Property>DTO`. Defaults to `<Entity><Method><DtoType>` outside a controller route.
 * @param {string} [options.dtoPropertyName] - Name of the parent DTO property that holds the relation, when it differs from `propertyName`; it is the `<Property>` of the name.
 * @param {string} [options.hostDtoName] - Class name of the parent DTO for errors and origins, when it is not `<dtoNameBase>DTO`, as with a hand-written DTO.
 * @param {string} [options.relationDescription] - Relation-aware description to use for the nested id field.
 * @returns {Type<unknown>} A generated DTO class for relation representation
 * @template E - The entity type
 */
export function DtoGenerateRelationResponse<E>(entity: IApiEntity<E>, method: EApiRouteType, dtoType: EApiDtoType, propertyName: string, options: { dtoNameBase?: string; dtoPropertyName?: string; hostDtoName?: string; relationDescription?: string } = {}): Type<unknown> {
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

	const dtoNameBase: string = options.dtoNameBase ?? `${String(entity.name)}${CamelCaseString(method)}${CamelCaseString(dtoType)}`;

	const dtoPropertyName: string = options.dtoPropertyName ?? propertyName;

	const hostDtoName: string = options.hostDtoName ?? `${dtoNameBase}DTO`;

	DtoSetGeneratedName(GeneratedRelationDTO, `${dtoNameBase}${DtoSchemaNameGetSegment(dtoPropertyName, hostDtoName)}DTO`, `relation property ${dtoPropertyName} in ${hostDtoName}`);

	return GeneratedRelationDTO;
}
