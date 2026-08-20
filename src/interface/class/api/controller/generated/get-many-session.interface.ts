import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiFunctionGetManyProperties } from "@type/decorator/api/function";

export interface IApiControllerGeneratedGetManySession {
	baseProperties: TApiFunctionGetManyProperties<IApiBaseEntity>;
	state: {
		candidateProperties?: TApiFunctionGetManyProperties<IApiBaseEntity>;
		isCandidateWhereScoped?: boolean;
		isPrepared: boolean;
	};
	windowWhere?: TApiFunctionGetManyProperties<IApiBaseEntity>["where"];
}
