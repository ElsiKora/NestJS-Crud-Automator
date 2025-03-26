import type { EApiControllerLoadRelationsStrategy } from "@enum/decorator/api";
import type { FindOptionsRelations } from "typeorm";

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
