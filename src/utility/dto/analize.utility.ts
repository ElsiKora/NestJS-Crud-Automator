import type { IApiBaseEntity } from "../../interface";
import type { TMetadata } from "../../type";

import { MetadataStorage } from "../../class";

export function analyzeEntityMetadata(entity: IApiBaseEntity): void {
	const storage: MetadataStorage = MetadataStorage.getInstance();

	const bankMetadata: TMetadata | undefined = storage.getMetadata(entity.name ?? "UnknownResource");

	// eslint-disable-next-line @elsikora/sonar/void-use
	void bankMetadata;
}
