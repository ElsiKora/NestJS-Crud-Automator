import type { EApiPropertyDateIdentifier, EApiPropertyDateType } from "../../../../enum";

import type { TApiPropertyBaseProperties } from "./base";

export type TApiPropertyDateProperties = {
	format: EApiPropertyDateType;
	identifier: EApiPropertyDateIdentifier;
} & TApiPropertyBaseProperties;
