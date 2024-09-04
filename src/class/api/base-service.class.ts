import type { IApiGetListResponseResult } from "../../interface";
import type { TApiFunctionCreateProperties, TApiFunctionGetListProperties, TApiFunctionGetProperties, TApiFunctionUpdateProperties } from "../../type";
import type { FindOptionsRelations } from "typeorm";

export class BaseApiService<E> {
	create(properties: TApiFunctionCreateProperties<E>): Promise<E> {
		void properties;

		return Promise.resolve({} as E);
	}

	delete(id: string): Promise<void> {
		void id;

		return Promise.resolve();
	}

	get(id: string, properties?: TApiFunctionGetProperties<E>, relations?: FindOptionsRelations<E>): Promise<E> {
		void id;
		void properties;
		void relations;

		return Promise.resolve({} as E);
	}

	getList(properties: TApiFunctionGetListProperties<E>, relations?: FindOptionsRelations<E>): Promise<IApiGetListResponseResult<E>> {
		void properties;
		void relations;

		return Promise.resolve({ items: [], total: 0 } as unknown as IApiGetListResponseResult<E>);
	}

	update(id: string, properties: TApiFunctionUpdateProperties<E>): Promise<E> {
		void id;
		void properties;

		return Promise.resolve({} as E);
	}
}
