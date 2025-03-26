import type { EHasPairedCustomSuffixesFieldsArgumentType } from "@enum/validator";

export type THasPairedCustomSuffixesFieldsOperationConfig = {
	argumentType: EHasPairedCustomSuffixesFieldsArgumentType;
	exactLength?: number;
	maxLength?: number;
	minLength?: number;
};
