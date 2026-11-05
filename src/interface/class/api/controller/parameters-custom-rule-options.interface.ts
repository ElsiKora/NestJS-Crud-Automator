import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationResourceDefinition } from "@interface/class/api/authorization";
import type { IApiControllerPropertiesPathScope } from "@interface/decorator/api/controller/properties/path-scope";
import type { Type } from "@nestjs/common";

export interface IApiControllerParametersCustomRuleOptions {
	controller: Type<unknown>;
	dto: Type<unknown> | undefined;
	/** Whether each path parameter must be held by a property with a column type, `ApiPropertyCopy` or an `ApiProperty*` decorator: a HOOKS route, whose policy has no resource path rule to lean on. */
	isColumnTypeRequired?: boolean;
	methodName: string;
	/** Path parameters of the whole route path: global prefix, `RouterModule` path, controller path, and route path. */
	pathParameters: ReadonlyArray<string>;
	/** Path scope of the controller, which binds a path parameter to the column an IAM placeholder of its name reads. */
	pathScope?: IApiControllerPropertiesPathScope<IApiBaseEntity>;
	/** IAM resource definition of the controller; undefined for a HOOKS route. Each placeholder that a path parameter fills names the column the parameter is checked against. */
	resourceDefinition?: IApiAuthorizationResourceDefinition<IApiBaseEntity>;
	/** IAM resource path of the controller; undefined for a HOOKS route, whose policy reads the path values without one. */
	resourcePath?: string;
}
