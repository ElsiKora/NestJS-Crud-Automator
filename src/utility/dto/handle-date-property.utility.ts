import { EApiPropertyDateType } from "../../enum";

export const DtoHandleDateProperty = (propertyName: string, dateType: EApiPropertyDateType): Array<{ name: string; type: EApiPropertyDateType }> => {
	const baseTypes: Partial<Record<EApiPropertyDateType, { from: EApiPropertyDateType; to: EApiPropertyDateType }>> = {
		[EApiPropertyDateType.CREATED]: { from: EApiPropertyDateType.CREATED_AT_FROM, to: EApiPropertyDateType.CREATED_AT_TO },
		[EApiPropertyDateType.UPDATED]: { from: EApiPropertyDateType.UPDATED_AT_FROM, to: EApiPropertyDateType.UPDATED_AT_TO },
	};

	return baseTypes[dateType]
		? [
				{ name: `${propertyName}From`, type: baseTypes[dateType].from },
				{ name: `${propertyName}To`, type: baseTypes[dateType].to },
			]
		: [{ name: propertyName, type: dateType }];
};
