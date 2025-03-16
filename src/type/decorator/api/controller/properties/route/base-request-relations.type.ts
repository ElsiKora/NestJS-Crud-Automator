import type { FindOptionsRelations } from "typeorm";

import type { EApiControllerLoadRelationsStrategy } from "../../../../../../enum";

export type TApiControllerPropertiesRouteBaseRequestRelations<E> = {
	relationsLoadStrategy: EApiControllerLoadRelationsStrategy;
	servicesLoadStrategy: EApiControllerLoadRelationsStrategy;
	shouldLoadRelations: boolean;
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
				relationsServices: Partial<Record<keyof FindOptionsRelations<E>, string>>;
				servicesLoadStrategy: EApiControllerLoadRelationsStrategy.MANUAL;
		  }
		| {
				servicesLoadStrategy: EApiControllerLoadRelationsStrategy.AUTO;
				shouldForceAllServicesToBeSpecified?: boolean;
		  }
	);
