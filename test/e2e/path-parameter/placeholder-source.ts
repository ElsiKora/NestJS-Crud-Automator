import { HttpStatus, Inject, Injectable, Param, RequestMethod } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Column, Entity, PrimaryColumn, Repository } from "typeorm";

import { ApiController, ApiControllerSecurable, ApiPropertyDate, ApiPropertyDescribe, ApiPropertyNumber, ApiPropertyString, ApiPropertyUUID, ApiRouteCustom, ApiService, ApiServiceBase, EApiAuthenticationType, EApiAuthorizationMode, EApiDtoType, EApiPolicyEffect, EApiPolicySourceType, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType } from "../../../src/index";

export const E2E_PATH_PARAMETER_PLACEHOLDER_SOURCE_ALLOWED_UUID: string = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const E2E_PATH_PARAMETER_PLACEHOLDER_SOURCE_DENIED_UUID: string = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

// Every path value a handler of the placeholder source routes has read, in order.
export const E2E_PATH_PARAMETER_PLACEHOLDER_SOURCE_HANDLER_TRACE: Array<string> = [];

@Entity("e2e_path_parameter_placeholder_source_items")
export class E2ePathParameterPlaceholderSourceItemEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "label", exampleValue: "Label", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	public label!: string;

	@Column({ nullable: true, type: "int" })
	@ApiPropertyDescribe({ description: "section number", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: 1_000_000, minimum: 0, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER })
	public sectionNumber!: null | number;
}

@Injectable()
@ApiService({ entity: E2ePathParameterPlaceholderSourceItemEntity })
export class E2ePathParameterPlaceholderSourceItemService extends ApiServiceBase<E2ePathParameterPlaceholderSourceItemEntity> {
	@InjectRepository(E2ePathParameterPlaceholderSourceItemEntity)
	public readonly repository!: Repository<E2ePathParameterPlaceholderSourceItemEntity>;
}

/**
 * Authenticates a request as the principal named after the IAM namespace of its route, whose one document denies one value of that route.
 */
@Injectable()
export class E2ePathParameterPlaceholderSourceGuard {
	public canActivate(context: { switchToHttp: () => { getRequest: () => { url: string; user?: unknown } } }): boolean {
		const request: { url: string; user?: unknown } = context.switchToHttp().getRequest();
		request.user = { id: /\/path-parameter\/placeholder-source\/([\w-]+)/.exec(request.url)?.[1] ?? "anonymous", roles: [] };

		return true;
	}
}

/**
 * Builds the policy document that allows a namespace and denies one value of its resource path.
 * @param {string} namespace - IAM namespace of the route.
 * @param {string} denied - The path value the policy denies.
 * @returns {Record<string, unknown>} The document.
 */
function buildDocument(namespace: string, denied: string): Record<string, unknown> {
	return {
		document: {
			Statement: [
				{ Action: [`${namespace}:*`], Effect: EApiPolicyEffect.ALLOW, Resource: ["*"] },
				{ Action: [`${namespace}:*`], Effect: EApiPolicyEffect.DENY, Resource: [`${namespace}/${denied}`] },
			],
			Version: "2012-10-17",
		},
		id: namespace,
		namespace,
		sourceType: EApiPolicySourceType.DATABASE,
		version: "1",
	};
}

// The principal of each route is attached to the document of its namespace.
export const E2E_PATH_PARAMETER_PLACEHOLDER_SOURCE_DOCUMENTS: Array<Record<string, unknown>> = [buildDocument("pps-uuid", E2E_PATH_PARAMETER_PLACEHOLDER_SOURCE_DENIED_UUID), buildDocument("pps-int", "16"), buildDocument("pps-string", "Denied")];

// The key of a section whose entity is built at runtime, so no column can be copied: only its UUID is described.
export class E2ePathParameterPlaceholderSourceUuidDto {
	@ApiPropertyUUID({ description: "section id", entity: { name: "ConfigSection" }, isRequired: true } as never)
	public id!: string;
}

export class E2ePathParameterPlaceholderSourceIntegerDto {
	@ApiPropertyNumber({ description: "section number", entity: { name: "ConfigSection" }, exampleValue: 1, format: EApiPropertyNumberType.INTEGER, isRequired: true, maximum: 1_000_000, minimum: 0, multipleOf: 1 } as never)
	public id!: number;
}

export class E2ePathParameterPlaceholderSourceStringDto {
	@ApiPropertyString({ description: "section name", entity: { name: "ConfigSection" }, exampleValue: "General", format: EApiPropertyStringType.STRING, isRequired: true, maxLength: 64, minLength: 1, pattern: "/^[A-Za-z]+$/" } as never)
	public id!: string;
}

class E2ePathParameterPlaceholderSourceDateDto {
	@ApiPropertyDate({ description: "section date", entity: { name: "ConfigSection" }, format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.CREATED_AT, isRequired: true } as never)
	public id!: Date;
}

class E2ePathParameterPlaceholderSourceResponseDto {
	@ApiProperty()
	public id!: string;
}

const NO_GENERATED_ROUTES: never = Object.fromEntries([EApiRouteType.CREATE, EApiRouteType.DELETE, EApiRouteType.GET, EApiRouteType.GET_LIST, EApiRouteType.PARTIAL_UPDATE, EApiRouteType.UPDATE].map((routeType: EApiRouteType) => [routeType, { generation: { isEnabled: false } }])) as never;

/**
 * Builds a securable IAM controller with the custom route `:id/policy`, whose resource path names the path parameter.
 * @param {string} namespace - IAM namespace, resource path prefix and last segment of the controller path.
 * @param {new () => unknown} dto - PARAMETERS DTO of the route.
 * @param {string} [queryPath] - Column the `resource.id` field maps the placeholder to, of the type the DTO describes: a path value is checked against the column its placeholder reads.
 * @returns {new () => unknown} The controller.
 */
function buildController(namespace: string, dto: new () => unknown, queryPath: string = "id"): new () => unknown {
	class PlaceholderSourceController {
		@Inject(E2ePathParameterPlaceholderSourceItemService)
		public readonly service!: E2ePathParameterPlaceholderSourceItemService;

		@ApiRouteCustom({
			documentation: { description: "Reads the policy of a section", summary: "Reads the policy of a section" },
			dto: { [EApiDtoType.PARAMETERS]: dto },
			resource: { action: "policy", entity: E2ePathParameterPlaceholderSourceItemEntity },
			response: { errors: {}, serialization: { isEnabled: false }, status: HttpStatus.OK, type: E2ePathParameterPlaceholderSourceResponseDto },
			route: { method: RequestMethod.GET, path: ":id/policy" },
			security: { authentication: { guard: E2ePathParameterPlaceholderSourceGuard, type: EApiAuthenticationType.USER } },
		} as never)
		public async read(@Param("id") id: unknown): Promise<Record<string, unknown>> {
			E2E_PATH_PARAMETER_PLACEHOLDER_SOURCE_HANDLER_TRACE.push(String(id));

			return { id: String(id), rows: await this.service.repository.count() };
		}
	}

	const name: string = `E2ePathParameterPlaceholderSource${namespace.replaceAll(/(?:^|-)(\w)/g, (_match: string, letter: string): string => letter.toUpperCase())}`;

	Object.defineProperty(PlaceholderSourceController, "name", { value: name });
	ApiController<E2ePathParameterPlaceholderSourceItemEntity>({
		authorization: {
			defaultMode: EApiAuthorizationMode.IAM,
			policyNamespace: namespace,
			resourceDefinition: { entity: E2ePathParameterPlaceholderSourceItemEntity, fields: [{ isFilterable: true, path: "resource.id", queryPath }], namespace, resourcePath: `${namespace}/{id}`, resourceType: namespace },
		},
		entity: E2ePathParameterPlaceholderSourceItemEntity,
		name,
		path: `path-parameter/placeholder-source/${namespace}`,
		routes: NO_GENERATED_ROUTES,
	} as never)(PlaceholderSourceController as never);
	ApiControllerSecurable()(PlaceholderSourceController);

	return PlaceholderSourceController;
}

export const E2ePathParameterPlaceholderSourceUuidController: new () => unknown = buildController("pps-uuid", E2ePathParameterPlaceholderSourceUuidDto);
export const E2ePathParameterPlaceholderSourceIntegerController: new () => unknown = buildController("pps-int", E2ePathParameterPlaceholderSourceIntegerDto, "sectionNumber");
export const E2ePathParameterPlaceholderSourceStringController: new () => unknown = buildController("pps-string", E2ePathParameterPlaceholderSourceStringDto, "label");

/**
 * Builds a controller whose resource path placeholder is described by `ApiPropertyDate`, which has no single text a policy could compare.
 * @returns {new () => unknown} The controller, which fails at startup.
 */
export function E2ePathParameterPlaceholderSourceBuildDateController(): new () => unknown {
	return buildController("pps-date", E2ePathParameterPlaceholderSourceDateDto);
}
