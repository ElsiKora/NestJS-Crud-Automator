import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiFunctionContext, IApiFunctionStepContext } from "@interface/class/api/function";
import type { EntityManager } from "typeorm";

export type TApiFunctionContextStorageEntry<E extends IApiBaseEntity> = { context: { eventManager?: EntityManager }; kind: "transaction" } | { context: IApiFunctionContext<E>; kind: "function" } | { context: IApiFunctionStepContext<E>; kind: "step" };
