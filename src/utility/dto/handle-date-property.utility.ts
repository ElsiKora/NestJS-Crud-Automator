import { EApiPropertyDateIdentifier } from "@enum/decorator/api";

/**
 * Helper utility for handling date-related properties in DTOs.
 * Converts standard date fields (createdAt, updatedAt, receivedAt) into range queries
 * with from/to variants for filtering.
 * @param {string} propertyName - The original property name
 * @param {EApiPropertyDateIdentifier} identifier - The date field identifier
 * @returns {Array<{ identifier: EApiPropertyDateIdentifier; name: string }>} Array of date field variants with their identifiers
 */
export const DtoHandleDateProperty = (propertyName: string, identifier: EApiPropertyDateIdentifier): Array<{ identifier: EApiPropertyDateIdentifier; name: string }> => {
	const baseTypes: Partial<Record<EApiPropertyDateIdentifier, { from: EApiPropertyDateIdentifier; to: EApiPropertyDateIdentifier }>> = {
		[EApiPropertyDateIdentifier.CREATED_AT]: { from: EApiPropertyDateIdentifier.CREATED_AT_FROM, to: EApiPropertyDateIdentifier.CREATED_AT_TO },
		[EApiPropertyDateIdentifier.RECEIVED_AT]: { from: EApiPropertyDateIdentifier.RECEIVED_AT_FROM, to: EApiPropertyDateIdentifier.RECEIVED_AT_TO },
		[EApiPropertyDateIdentifier.UPDATED_AT]: { from: EApiPropertyDateIdentifier.UPDATED_AT_FROM, to: EApiPropertyDateIdentifier.UPDATED_AT_TO },
	};

	return baseTypes[identifier]
		? [
				{ identifier: baseTypes[identifier].from, name: `${propertyName}From` },
				{ identifier: baseTypes[identifier].to, name: `${propertyName}To` },
			]
		: [{ identifier, name: propertyName }];
};
