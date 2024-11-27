import { EApiPropertyDateIdentifier } from "../../enum";

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
