import type { FindOptionsRelations } from "typeorm";

import type { EApiControllerLoadRelationsStrategy } from "../../../../../../enum";

export type TApiControllerPropertiesRouteBaseRequestRelations<E> = {
	loadRelations: boolean;
	relationsLoadStrategy: EApiControllerLoadRelationsStrategy;
	servicesLoadStrategy: EApiControllerLoadRelationsStrategy;
} & (
	| {
			forceAllServicesToBeSpecified?: boolean;
			servicesLoadStrategy: EApiControllerLoadRelationsStrategy.AUTO;
	  }
	| {
			relationsServices: Partial<Record<keyof FindOptionsRelations<E>, string>>;
			servicesLoadStrategy: EApiControllerLoadRelationsStrategy.MANUAL;
	  }
) &
	(
		| {
				relationsLoadStrategy: EApiControllerLoadRelationsStrategy.AUTO;
		  }
		| {
				relationsLoadStrategy: EApiControllerLoadRelationsStrategy.MANUAL;
				relationsToLoad: Array<keyof FindOptionsRelations<E>>;
		  }
	);
