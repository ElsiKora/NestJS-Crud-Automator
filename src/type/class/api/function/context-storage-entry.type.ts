import type { ApiFunctionTransactionRegistry } from "@class/api/function/transaction/registry.class";
import type { EApiFunctionContextStorageKind } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiFunctionContext, IApiFunctionStepContext } from "@interface/class/api/function";
import type { EntityManager, QueryRunner } from "typeorm";

export type TApiFunctionContextStorageEntry<E extends IApiBaseEntity> = ({ context: { eventManager?: EntityManager }; kind: EApiFunctionContextStorageKind.TRANSACTION } | { context: IApiFunctionContext<E>; kind: EApiFunctionContextStorageKind.FUNCTION } | { context: IApiFunctionStepContext<E>; kind: EApiFunctionContextStorageKind.STEP }) & {
	transaction?: {
		entityManager: EntityManager;
		queryRunner: QueryRunner;
		registry: ApiFunctionTransactionRegistry;
	};
};
