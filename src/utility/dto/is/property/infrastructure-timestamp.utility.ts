import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { DTO_UTILITY_CONSTANT } from "@constant/utility/dto/constant";
import { EApiPropertyDescribeType } from "@enum/decorator/api";

/**
 * Determines whether date metadata represents a server-owned infrastructure timestamp.
 * @param {TApiPropertyDescribeProperties} propertyMetadata - Metadata describing the property
 * @returns {boolean} True for created, received, and updated infrastructure timestamps
 */
export function DtoIsPropertyInfrastructureTimestamp(propertyMetadata: TApiPropertyDescribeProperties): boolean {
	if (propertyMetadata.type !== EApiPropertyDescribeType.DATE) {
		return false;
	}

	return DTO_UTILITY_CONSTANT.INFRASTRUCTURE_TIMESTAMP_IDENTIFIERS.includes(propertyMetadata.identifier);
}
