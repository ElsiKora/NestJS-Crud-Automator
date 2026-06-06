/* eslint-disable @elsikora/sonar/void-use */
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiFunctionContext, IApiFunctionStepContext } from "@interface/class/api/function";
import type { IApiGetListResponseResult } from "@interface/decorator/api";
import type { TApiFunctionCreateProperties, TApiFunctionDeleteCriteria, TApiFunctionGetListProperties, TApiFunctionGetManyProperties, TApiFunctionGetProperties, TApiFunctionUpdateCriteria, TApiFunctionUpdateProperties } from "@type/decorator/api/function";

import { ApiFunctionContextStorage } from "@class/api/function/context-storage.class";
import { ErrorException } from "@utility/error/exception.utility";

/**
 * Base class for services providing CRUD operations.
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/api-reference/classes#apiservicebase | API Reference - ApiServiceBase}
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/core-concepts/services | Core Concepts - Services}
 */
export class ApiServiceBase<E> {
	create(properties: TApiFunctionCreateProperties<E>): Promise<E> {
		void properties;

		return Promise.resolve({} as E);
	}

	delete(criteria: Array<TApiFunctionDeleteCriteria<E>> | TApiFunctionDeleteCriteria<E>): Promise<void> {
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

	update(criteria: Array<TApiFunctionUpdateCriteria<E>> | TApiFunctionUpdateCriteria<E>, properties: TApiFunctionUpdateProperties<E>): Promise<E> {
		void criteria;
		void properties;

		return Promise.resolve({} as E);
	}

	protected getApiFunctionContext<T extends IApiBaseEntity>(): IApiFunctionContext<T> {
		const context: IApiFunctionContext<T> | undefined = ApiFunctionContextStorage.get<T>();

		if (!context && ApiFunctionContextStorage.getStep<T>()) {
			throw ErrorException("Api function context is not available inside a decorated ApiFunctionStep execution");
		}

		if (!context) {
			throw ErrorException("Api function context is not available outside a decorated ApiFunction execution");
		}

		return context;
	}

	protected getApiFunctionStepContext<T extends IApiBaseEntity>(): IApiFunctionStepContext<T> {
		const context: IApiFunctionStepContext<T> | undefined = ApiFunctionContextStorage.getStep<T>();

		if (!context) {
			throw ErrorException("Api function step context is not available outside a decorated ApiFunctionStep execution");
		}

		return context;
	}
}
