import type { EApiFunctionType } from "@enum/decorator/api";

export interface IApiFunctionSubscriberFilter {
	action?: string;
	type: EApiFunctionType;
}
