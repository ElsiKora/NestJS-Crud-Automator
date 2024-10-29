import type { EApiControllerLoadRelationsStrategy } from "../../../../../../enum";

import type { FindOptionsRelations } from "typeorm";

export type TApiControllerPropertiesRouteBaseRequestRelations<E> = {
	loadRelations: boolean;
	relationsLoadStrategy: EApiControllerLoadRelationsStrategy;
	servicesLoadStrategy: EApiControllerLoadRelationsStrategy;
} & (
	| {
			relationsLoadStrategy: EApiControllerLoadRelationsStrategy.AUTO;
	  }
	| {
			relationsLoadStrategy: EApiControllerLoadRelationsStrategy.MANUAL;
			relationsToLoad: Array<keyof FindOptionsRelations<E>>;
	  }
) &
	(
		| {
				forceAllServicesToBeSpecified?: boolean;
				servicesLoadStrategy: EApiControllerLoadRelationsStrategy.AUTO;
		  }
		| {
				relationsServices: Partial<Record<keyof FindOptionsRelations<E>, string>>;
				servicesLoadStrategy: EApiControllerLoadRelationsStrategy.MANUAL;
		  }
	);
