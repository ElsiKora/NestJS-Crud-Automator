/* eslint-disable @elsikora/sonar/void-use */
import type { IApiGetListResponseResult } from "@interface/decorator/api";
import type { TApiFunctionCreateProperties, TApiFunctionDeleteCriteria, TApiFunctionGetListProperties, TApiFunctionGetManyProperties, TApiFunctionGetProperties, TApiFunctionUpdateCriteria, TApiFunctionUpdateProperties } from "@type/decorator/api/function";
import type { EntityManager } from "typeorm";

export class ApiServiceBase<E> {
	create(properties: TApiFunctionCreateProperties<E>, eventManager?: EntityManager): Promise<E> {
		void properties;
		void eventManager;

		return Promise.resolve({} as E);
	}

	delete(criteria: TApiFunctionDeleteCriteria<E>, eventManager?: EntityManager): Promise<void> {
		void criteria;
		void eventManager;

		return Promise.resolve();
	}

	// eslint-disable-next-line @elsikora/sonar/no-identical-functions
	get(properties: TApiFunctionGetProperties<E>, eventManager?: EntityManager): Promise<E> {
		void properties;
		void eventManager;

		return Promise.resolve({} as E);
	}

	getList(properties: TApiFunctionGetListProperties<E>, eventManager?: EntityManager): Promise<IApiGetListResponseResult<E>> {
		void properties;
		void eventManager;

		return Promise.resolve({ items: [], total: 0 } as unknown as IApiGetListResponseResult<E>);
	}

	getMany(properties: TApiFunctionGetManyProperties<E>, eventManager?: EntityManager): Promise<Array<E>> {
		void properties;
		void eventManager;

		return Promise.resolve([]);
	}

	update(criteria: TApiFunctionUpdateCriteria<E>, properties: TApiFunctionUpdateProperties<E>, eventManager?: EntityManager): Promise<E> {
		void criteria;
		void properties;
		void eventManager;

		return Promise.resolve({} as E);
	}
}
