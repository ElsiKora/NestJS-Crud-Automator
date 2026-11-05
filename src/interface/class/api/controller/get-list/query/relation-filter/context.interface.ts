import type { IApiControllerGetListQueryPlan } from "@interface/class/api/controller/get-list/query/plan";
import type { ObjectLiteral, Repository } from "typeorm";

/**
 * What compiling the relation filters of a request reads.
 */
export interface IApiControllerGetListQueryRelationFilterContext {
	/** Compiled query plan of the route. */
	plan: IApiControllerGetListQueryPlan;
	/** Repository of the route entity. */
	repository: Repository<ObjectLiteral>;
	/** Controller and route named in an error. */
	source: string;
}
