/* eslint-disable @elsikora/sonar/void-use */
import type { IApiGetListResponseResult } from "../../interface";
import type { TApiFunctionGetManyProperties, TApiFunctionUpdateCriteria } from "../../type";
import type { TApiFunctionCreateProperties, TApiFunctionDeleteCriteria, TApiFunctionGetListProperties, TApiFunctionGetProperties, TApiFunctionUpdateProperties } from "../../type";

export class ApiServiceBase<E> {
	create(properties: TApiFunctionCreateProperties<E>): Promise<E> {
		void properties;

		return Promise.resolve({} as E);
	}

	delete(criteria: TApiFunctionDeleteCriteria<E>): Promise<void> {
		void criteria;

		return Promise.resolve();
	}

	// eslint-disable-next-line @elsikora/sonar/no-identical-functions
	get(properties: TApiFunctionGetProperties<E>): Promise<E> {
		void properties;

		return Promise.resolve({} as E);
	}

	getList(properties: TApiFunctionGetListProperties<E>): Promise<IApiGetListResponseResult<E>> {
		void properties;

		return Promise.resolve({ items: [], total: 0 } as unknown as IApiGetListResponseResult<E>);
	}

	getMany(properties: TApiFunctionGetManyProperties<E>): Promise<Array<E>> {
		void properties;

		return Promise.resolve([]);
	}

	update(criteria: TApiFunctionUpdateCriteria<E>, properties: TApiFunctionUpdateProperties<E>): Promise<E> {
		void criteria;
		void properties;

		return Promise.resolve({} as E);
	}
}
