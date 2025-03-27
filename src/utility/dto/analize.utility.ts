import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TMetadata } from "@type/class";

import { MetadataStorage } from "@class/metadata-storage.class";

/**
 * Analyzes entity metadata using the MetadataStorage singleton class.
 * Currently only retrieves metadata but doesn't perform further operations.
 * @param {IApiBaseEntity} entity - The entity to analyze metadata for
 * @returns {void}
 */
export function analyzeEntityMetadata(entity: IApiBaseEntity): void {
	const storage: MetadataStorage = MetadataStorage.getInstance();

	const bankMetadata: TMetadata | undefined = storage.getMetadata(entity.name ?? "UnknownResource");

	// eslint-disable-next-line @elsikora/sonar/void-use
	void bankMetadata;
}
