import type { THasPairedCustomSuffixesFieldsOperationConfig } from "../../type";

import { EHasPairedCustomSuffixesFieldsArgumentType } from "../../enum";
import { EFilterOperation } from "../../enum/filter-operation.enum";

const DEFAULT_OPERATION_CONFIGS: Record<EFilterOperation, THasPairedCustomSuffixesFieldsOperationConfig> = {
	[EFilterOperation.BETWEEN]: {
		argumentType: EHasPairedCustomSuffixesFieldsArgumentType.ARRAY,
		// eslint-disable-next-line @elsikora/typescript/no-magic-numbers
		exactLength: 2,
	},
	[EFilterOperation.CONT]: {
		argumentType: EHasPairedCustomSuffixesFieldsArgumentType.SINGLE,
	},
	[EFilterOperation.CONTL]: {
		argumentType: EHasPairedCustomSuffixesFieldsArgumentType.SINGLE,
	},
	[EFilterOperation.ENDS]: {
		argumentType: EHasPairedCustomSuffixesFieldsArgumentType.SINGLE,
	},
	[EFilterOperation.ENDSL]: {
		argumentType: EHasPairedCustomSuffixesFieldsArgumentType.SINGLE,
	},
	[EFilterOperation.EQ]: {
		argumentType: EHasPairedCustomSuffixesFieldsArgumentType.SINGLE,
	},
	[EFilterOperation.EQL]: {
		argumentType: EHasPairedCustomSuffixesFieldsArgumentType.SINGLE,
	},
	[EFilterOperation.EXCL]: {
		argumentType: EHasPairedCustomSuffixesFieldsArgumentType.ARRAY,
	},
	[EFilterOperation.EXCLL]: {
		argumentType: EHasPairedCustomSuffixesFieldsArgumentType.ARRAY,
	},
	[EFilterOperation.GT]: {
		argumentType: EHasPairedCustomSuffixesFieldsArgumentType.SINGLE,
	},
	[EFilterOperation.GTE]: {
		argumentType: EHasPairedCustomSuffixesFieldsArgumentType.SINGLE,
	},
	[EFilterOperation.IN]: {
		argumentType: EHasPairedCustomSuffixesFieldsArgumentType.ARRAY,
		minLength: 1,
	},
	[EFilterOperation.INL]: {
		argumentType: EHasPairedCustomSuffixesFieldsArgumentType.ARRAY,
		minLength: 1,
	},
	[EFilterOperation.ISNULL]: {
		argumentType: EHasPairedCustomSuffixesFieldsArgumentType.NULL,
	},
	[EFilterOperation.LT]: {
		argumentType: EHasPairedCustomSuffixesFieldsArgumentType.SINGLE,
	},
	[EFilterOperation.LTE]: {
		argumentType: EHasPairedCustomSuffixesFieldsArgumentType.SINGLE,
	},
	[EFilterOperation.NE]: {
		argumentType: EHasPairedCustomSuffixesFieldsArgumentType.SINGLE,
	},
	[EFilterOperation.NEL]: {
		argumentType: EHasPairedCustomSuffixesFieldsArgumentType.SINGLE,
	},
	[EFilterOperation.NOTIN]: {
		argumentType: EHasPairedCustomSuffixesFieldsArgumentType.ARRAY,
		minLength: 1,
	},
	[EFilterOperation.NOTINL]: {
		argumentType: EHasPairedCustomSuffixesFieldsArgumentType.ARRAY,
		minLength: 1,
	},
	[EFilterOperation.NOTNULL]: {
		argumentType: EHasPairedCustomSuffixesFieldsArgumentType.NULL,
	},
	[EFilterOperation.STARTS]: {
		argumentType: EHasPairedCustomSuffixesFieldsArgumentType.SINGLE,
	},
	[EFilterOperation.STARTSL]: {
		argumentType: EHasPairedCustomSuffixesFieldsArgumentType.SINGLE,
	},
};

export const VALIDATOR_HAS_PAIRED_CUSTOM_SUFFIXES_FIELDS_CONSTANT: {
	readonly DEFAULT_OPERATION_CONFIGS: Record<EFilterOperation, THasPairedCustomSuffixesFieldsOperationConfig>;
} = {
	DEFAULT_OPERATION_CONFIGS,
} as const;
