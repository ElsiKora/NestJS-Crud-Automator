import type { IApiGetListResponseResult } from "../../interface";

import type { TApiFunctionCreateProperties, TApiFunctionGetListProperties, TApiFunctionGetProperties, TApiFunctionUpdateProperties } from "../../type";

import type { FindOptionsRelations } from "typeorm";

export class BaseApiService<E> {
	create(_properties: TApiFunctionCreateProperties<E>): Promise<E> {
		return null as any;
	}

	delete(_id: string): Promise<void> {
		return null as any;
	}

	get(_id: string, _properties?: TApiFunctionGetProperties<E>, _relations?: FindOptionsRelations<E>): Promise<E> {
		return null as any;
	}

	getList(_properties: TApiFunctionGetListProperties<E>, _relations?: FindOptionsRelations<E>): Promise<IApiGetListResponseResult<E>> {
		return null as any;
	}

	update(_id: string, _properties: TApiFunctionUpdateProperties<E>): Promise<E> {
		return null as any;
	}
}
