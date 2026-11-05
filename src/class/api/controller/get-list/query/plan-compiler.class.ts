import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type {
	IApiControllerGetListQueryOperator,
	IApiControllerGetListQueryPlan,
	IApiControllerGetListQueryPlanCondition,
	IApiControllerGetListQueryPlanFilter,
	IApiControllerGetListQueryPlanFilterField,
	IApiControllerGetListQueryPlanFilterRelation,
	IApiControllerGetListQueryPlanFilterRelationCondition,
	IApiControllerGetListQueryPlanFilterRelationHop,
	IApiControllerGetListQueryPlanOrder,
	IApiControllerGetListQueryPlanOrderEntry,
	IApiControllerGetListQueryPlanOrderField,
	IApiControllerGetListQueryRelationFilterPath,
} from "@interface/class/api/controller/get-list/query";
import type { IApiControllerGetListQueryPlanPagination } from "@interface/class/api/controller/get-list/query/plan/pagination.interface";
import type { IApiControllerPropertiesRouteGetListQueryFilter, IApiControllerPropertiesRouteGetListQueryFilterLink, IApiControllerPropertiesRouteGetListQueryOrder, IApiControllerPropertiesRouteGetListQueryOrderEntry, IApiControllerPropertiesRouteGetListQueryPagination } from "@interface/decorator/api";
import type { IApiControllerPropertiesRouteGetListResponseDtoConfig } from "@interface/decorator/api/controller/properties/route";
import type { IApiEntity, IApiEntityColumn } from "@interface/entity";
import type { CanActivate, Type } from "@nestjs/common";
import type { TApiEntityReference } from "@type/api-entity-reference.type";
import type { TMetadataStorageTarget } from "@type/class";
import type { TApiControllerGetListQueryCompiledOrderField } from "@type/class/api/controller/get-list/compiled/order-field.type";
import type { TApiControllerGetListQueryCompiledOrder } from "@type/class/api/controller/get-list/compiled/order.type";
import type { TApiControllerGetListQueryCompiledPlan } from "@type/class/api/controller/get-list/compiled/plan.type";
import type { TApiControllerGetListQueryOrderField, TApiControllerPropertiesRoute } from "@type/decorator/api/controller";
import type { TApiControllerGetListQueryRequestTarget } from "@type/decorator/api/controller/get-list/query/request-target.type";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeDtoQueryGetListProperties, TApiPropertyDescribeProperties } from "@type/decorator/api/property";
import type { TManualDtoPropertyMetadata } from "@type/utility/dto/manual-property-metadata.type";
import type { TTypeOrmColumnMetadataArguments, TTypeOrmEntityListenerMetadataArguments, TTypeOrmMetadataArgumentsStorage } from "@type/utility/typeorm";
import type { ObjectLiteral } from "typeorm";

import { createHash } from "node:crypto";

import { ApiControllerGetListQueryRelationFilterPath } from "@class/api/controller/get-list/query/relation-filter";
import { API_CONTROLLER_CURSOR_TOKEN_MAX_LENGTH } from "@constant/api-controller-cursor.constant";
import { PROPERTY_DATE_DECORATOR_API_CONSTANT, PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { FILTER_OPERATOR_REGISTRY_CONSTANT, FILTER_RELATION_CONSTANT } from "@constant/filter";
import { UNSAFE_OBJECT_PROPERTY_NAMES_CONSTANT } from "@constant/safe-object-property-names.constant";
import { SWAGGER_METADATA_CONSTANT } from "@constant/swagger";
import { DTO_GENERATE_CONSTANT } from "@constant/utility/dto/generate.constant";
import { EApiControllerGetListQueryFilterMissingBehavior, EApiControllerGetListQueryPaginationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiDtoType, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { EFilterOperand, EFilterOperation, EFilterOrderDirection } from "@enum/filter";
import { EManualDtoPropertyMetadataDecorator } from "@enum/utility/manual-dto-property-metadata-decorator.enum";
import { ApiControllerGetListIsHiddenColumn } from "@utility/api/controller/get-list/is-hidden-column.utility";
import { ApiControllerGetListQueryResolveCursorOrderFields } from "@utility/api/controller/get-list/query/resolve-cursor-order-fields.utility";
import { ApiControllerGetListResponsePublishedFields } from "@utility/api/controller/get-list/response-published-fields.utility";
import { ApiControllerGetListTransformGetRelationTarget } from "@utility/api/controller/get-list/transform/get-relation-target.utility";
import { ApiControllerGetSchemaPrefix } from "@utility/api/controller/get/schema-prefix.utility";
import { FilterOrderByFromEntity } from "@utility/api/filter-order-by-from-entity.utility";
import { DtoGenerateGetListQueryProperties } from "@utility/dto/generate/get-list/query-properties.utility";
import { DtoGetDecoratorConfig } from "@utility/dto/get/decorator-config.utility";
import { DtoIsPropertyExposedInListResponse } from "@utility/dto/is/property/exposed/in-list-response.utility";
import { DtoIsPropertyShouldBeMarked } from "@utility/dto/is/property/should-be-marked.utility";
import { GetManualDtoPropertyMetadata } from "@utility/dto/manual/property-metadata/get.utility";
import { EnumIsValue } from "@utility/enum/is-value.utility";
import { EnumValues } from "@utility/enum/values.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { GenerateRelationEntityInformation } from "@utility/generate-relation-entity-information.utility";
import { GetClassHierarchy } from "@utility/get/class-hierarchy.utility";
import { IsDateFormatValue } from "@utility/is/date-format-value.utility";
import { ResolveMetadataTarget } from "@utility/resolve/metadata-target.utility";
import { getMetadataArgsStorage } from "typeorm";

type TListResponseDto = IApiControllerPropertiesRouteGetListResponseDtoConfig | Type<unknown>;

const CURSOR_RESPONSE_PROPERTY_COUNT: number = 3;
const CURSOR_MAXIMUM_ARRAY_INDEX_PROPERTY: number = 4_294_967_294;
const CURSOR_BIGINT_COLUMN_TYPES: ReadonlySet<string> = new Set<string>(["bigint", "int8"]);
const CURSOR_BOOLEAN_COLUMN_TYPES: ReadonlySet<string> = new Set<string>(["bool", "boolean", "boolean-constructor"]);
const CURSOR_ENUM_INTEGER_COLUMN_TYPES: ReadonlySet<string> = new Set<string>(["int", "int2", "int4", "integer", "smallint"]);
const CURSOR_INTEGER_COLUMN_TYPES: ReadonlySet<string> = new Set<string>([...CURSOR_ENUM_INTEGER_COLUMN_TYPES, "number-constructor"]);
const CURSOR_NON_PERSISTED_COLUMN_MODES: ReadonlySet<string> = new Set<string>(["array", "treeChildrenCount", "virtual", "virtual-property"]);
const CURSOR_TIMESTAMP_MAXIMUM_PRECISION: number = 3;
const CURSOR_UUID_COLUMN_TYPES: ReadonlySet<string> = new Set<string>(["uuid"]);
// A link name is the first segment of the query names of its fields.
const FILTER_LINK_NAME_PATTERN: RegExp = /^[A-Za-z_]\w*$/u;

export class ApiControllerGetListQueryPlanCompiler {
	/**
	 * Fails startup when the generated QUERY DTO of a PAGE route publishes a filter group on a column its manual list response hides. The controller calls this once every class is loaded.
	 * A typed plan publishes its enabled fields and a legacy filter every query field, so the error names the config that stops the column being filterable.
	 * @template E - Entity type
	 * @param {Type<unknown>} controller - Controller class, which the error names.
	 * @param {IApiEntity<E>} entityMetadata - Entity metadata.
	 * @param {TApiControllerPropertiesRoute<E, EApiRouteType.GET_LIST>} routeConfig - GET_LIST route configuration.
	 * @param {IApiControllerGetListQueryPlan} [queryPlan] - Compiled query plan of the route, if any.
	 * @returns {void}
	 * @throws {Error} Naming the controller, the route and the field.
	 */
	public static assertFilterFieldsPublished<E>(controller: Type<unknown>, entityMetadata: IApiEntity<E>, routeConfig: TApiControllerPropertiesRoute<E, EApiRouteType.GET_LIST>, queryPlan?: IApiControllerGetListQueryPlan): void {
		const responseDto: TListResponseDto | undefined = routeConfig.dto?.[EApiDtoType.RESPONSE];
		const queryTarget: TApiControllerGetListQueryRequestTarget<E> | undefined = routeConfig.request?.[EApiControllerRequestTarget.QUERY];

		// A manual QUERY DTO publishes its own filters, and a CURSOR plan leaves out what its response does not publish while it compiles.
		if (!responseDto || routeConfig.dto?.[EApiDtoType.QUERY] || queryTarget?.pagination?.mode === EApiControllerGetListQueryPaginationMode.CURSOR) {
			return;
		}

		const currentGuard: Type<CanActivate> | undefined = routeConfig.security?.authentication?.guard;
		const publishedFields: ReadonlySet<string> = ApiControllerGetListResponsePublishedFields(responseDto);
		const markedProperties: Array<{ isPrimary: boolean; metadata: TApiPropertyDescribeProperties; name: keyof E }> = [];

		for (const column of entityMetadata.columns) {
			const metadata: TApiPropertyDescribeProperties | undefined = this.getPropertyMetadata(column);

			if (metadata && DtoIsPropertyShouldBeMarked(EApiRouteType.GET_LIST, EApiDtoType.QUERY, String(column.name), metadata, column.isPrimary, currentGuard)) {
				markedProperties.push({ isPrimary: column.isPrimary, metadata, name: column.name });
			}
		}

		for (const { name } of DtoGenerateGetListQueryProperties(entityMetadata, markedProperties, currentGuard, queryPlan)) {
			// A declared relation path answers for its own leaf while it compiles; what the route publishes names no column of another entity.
			if (queryPlan?.filter.fields[name]?.relationFilter?.isDeclaredReach) {
				continue;
			}

			if (ApiControllerGetListIsHiddenColumn(entityMetadata, name, currentGuard, publishedFields)) {
				throw ErrorException(`${this.describeHiddenFilterField(controller, entityMetadata, name, currentGuard, publishedFields)}. Set request.query.filter.fields["${name}"] to { isEnabled: false }, leave it out of a REJECT filter allowlist, or set properties.getList.query.isEnabled: false on its @ApiPropertyDescribe`);
			}
		}
	}

	/**
	 * Fails startup when a PAGE route's manual list response cannot be read, or when its typed order enables a field the response does not publish. The controller calls this once every class is loaded.
	 * An entry that disables a field needs no published field, since no client may order by it.
	 * @template E - Entity type
	 * @param {Type<unknown>} controller - Controller class, which the error names.
	 * @param {ObjectLiteral} entity - Entity class.
	 * @param {IApiEntity<E>} entityMetadata - Entity metadata.
	 * @param {TApiControllerPropertiesRoute<E, EApiRouteType.GET_LIST>} routeConfig - GET_LIST route configuration.
	 * @returns {void}
	 * @throws {Error} Naming the controller, the route and the cause.
	 */
	public static assertOrderFieldsPublished<E>(controller: Type<unknown>, entity: ObjectLiteral, entityMetadata: IApiEntity<E>, routeConfig: TApiControllerPropertiesRoute<E, EApiRouteType.GET_LIST>): void {
		const responseDto: IApiControllerPropertiesRouteGetListResponseDtoConfig | Type<unknown> | undefined = routeConfig.dto?.[EApiDtoType.RESPONSE];
		const queryTarget: TApiControllerGetListQueryRequestTarget<E> | undefined = routeConfig.request?.[EApiControllerRequestTarget.QUERY];

		if (!responseDto || queryTarget?.pagination?.mode === EApiControllerGetListQueryPaginationMode.CURSOR) {
			return;
		}

		let publishedFields: ReadonlySet<string>;

		try {
			publishedFields = ApiControllerGetListResponsePublishedFields(responseDto);
		} catch (error) {
			throw ErrorException(`Controller "${controller.name}" route "${EApiRouteType.GET_LIST}": the manual GET_LIST response DTO cannot be read: ${error instanceof Error ? error.message : String(error)}`);
		}

		const serverBaseline: Readonly<Record<string, TApiControllerGetListQueryCompiledOrderField>> = this.buildServerOrderBaseline(entity, entityMetadata, false);

		for (const [path, field] of Object.entries(queryTarget?.order?.fields ?? {})) {
			if ((field as TApiControllerGetListQueryOrderField | undefined)?.isEnabled !== false && !publishedFields.has(path)) {
				throw ErrorException(this.describeUnorderableOrderField(controller, entityMetadata, serverBaseline, path, routeConfig.security?.authentication?.guard, publishedFields));
			}
		}
	}

	public static compile<E extends IApiBaseEntity>(controller: Type<unknown>, entity: ObjectLiteral, entityMetadata: IApiEntity<E>, routeConfig: TApiControllerPropertiesRoute<E, EApiRouteType.GET_LIST>): IApiControllerGetListQueryPlan | undefined {
		const queryTarget: TApiControllerGetListQueryRequestTarget<E> | undefined = routeConfig.request?.[EApiControllerRequestTarget.QUERY];

		if (!queryTarget?.filter && !queryTarget?.order && !queryTarget?.pagination) {
			return undefined;
		}

		if (routeConfig.dto?.[EApiDtoType.QUERY]) {
			throw ErrorException("Generated GET_LIST query configuration cannot be combined with a manual QUERY DTO");
		}

		const currentGuard: Type<CanActivate> | undefined = routeConfig.security?.authentication?.guard;
		const pagination: IApiControllerGetListQueryPlanPagination<EApiControllerGetListQueryPaginationMode> = this.compilePagination(queryTarget.pagination);
		const isCursor: boolean = pagination.mode === EApiControllerGetListQueryPaginationMode.CURSOR;
		const serverOrderBaseline: Readonly<Record<string, TApiControllerGetListQueryCompiledOrderField>> = this.buildServerOrderBaseline(entity, entityMetadata, isCursor);
		const responseDto: IApiControllerPropertiesRouteGetListResponseDtoConfig | Type<unknown> | undefined = routeConfig.dto?.[EApiDtoType.RESPONSE];
		// CURSOR proves its item class while the plan compiles, so only its names are read; a PAGE response is read once the classes exist, see assertOrderFieldsPublished and assertFilterFieldsPublished.
		const publishedFields: ReadonlySet<string> | undefined = isCursor && responseDto ? this.readCursorPublishedFields(responseDto) : undefined;
		const filterCandidates: Readonly<Record<string, IApiControllerGetListQueryPlanFilterField>> = this.buildFilterBaseline(entity, entityMetadata, currentGuard, isCursor);
		// A column the list response hides is never filterable, so a client cannot infer its values from which rows match.
		const hiddenFilterPaths: ReadonlySet<string> = new Set<string>(Object.keys(filterCandidates).filter((path: string): boolean => ApiControllerGetListIsHiddenColumn(entityMetadata, path, currentGuard, publishedFields)));
		const filterBaseline: Readonly<Record<string, IApiControllerGetListQueryPlanFilterField>> = Object.freeze(Object.fromEntries(Object.entries(filterCandidates).filter(([path]: [string, IApiControllerGetListQueryPlanFilterField]): boolean => !hiddenFilterPaths.has(path))));
		const describeHiddenFilterField: (path: string) => string = (path: string): string => this.describeHiddenFilterField(controller, entityMetadata, path, currentGuard, publishedFields);
		const orderBaseline: Readonly<Record<string, TApiControllerGetListQueryCompiledOrderField>> = this.buildOrderBaseline(entity, entityMetadata, serverOrderBaseline, isCursor, currentGuard, publishedFields);
		const describeUnorderableField: (path: string) => string = (path: string): string => this.describeUnorderableOrderField(controller, entityMetadata, serverOrderBaseline, path, currentGuard, publishedFields);
		const isHiddenOrderField: (path: string) => boolean = (path: string): boolean => serverOrderBaseline[path] !== undefined && ApiControllerGetListIsHiddenColumn(entityMetadata, path, currentGuard, publishedFields);
		const filter: IApiControllerGetListQueryPlanFilter = queryTarget.filter ? this.compileFilter(queryTarget.filter, filterBaseline, isCursor, controller, hiddenFilterPaths, describeHiddenFilterField, entity, currentGuard) : Object.freeze({ fields: filterBaseline, isLegacy: !isCursor, ...(isCursor ? { unlistedFields: EApiControllerGetListQueryUnlistedFields.INHERIT } : {}) });
		const order: TApiControllerGetListQueryCompiledOrder = queryTarget.order ? this.compileOrder(queryTarget.order, orderBaseline, serverOrderBaseline, isCursor, describeUnorderableField, isHiddenOrderField) : Object.freeze({ fields: orderBaseline, isLegacy: true, serverFields: serverOrderBaseline });
		const cursorFields: ReadonlyArray<string> = isCursor ? ApiControllerGetListQueryResolveCursorOrderFields(order) : Object.freeze([]);

		if (isCursor) {
			this.validateCursorPlan(controller, entity, entityMetadata, order, cursorFields, routeConfig);
			this.validateCursorTableInheritanceVariants(controller, entityMetadata, cursorFields, routeConfig);
		}

		const normalizedOrder: Record<string, unknown> = {
			fields: Object.values(order.fields).map((field: TApiControllerGetListQueryCompiledOrderField) => ({
				isEnabled: field.isEnabled,
				...(isCursor ? { metadata: this.createCursorOrderFieldFingerprint(field) } : {}),
				path: field.path,
			})),
			isLegacy: order.isLegacy,
			unlistedFields: order.unlistedFields,
		};

		if (queryTarget.order?.defaultOrder !== undefined) {
			normalizedOrder.defaultOrder = order.defaultOrder;
		}

		if (queryTarget.order?.tieBreakers !== undefined) {
			normalizedOrder.tieBreakers = order.tieBreakers;
		}

		if (isCursor) {
			normalizedOrder.effectiveFields = cursorFields.map((path: string): Record<string, unknown> => {
				const field: TApiControllerGetListQueryCompiledOrderField | undefined = order.serverFields[path];

				if (!field) {
					throw ErrorException(`CURSOR GET_LIST order field "${path}" is unavailable`);
				}

				return {
					metadata: this.createCursorOrderFieldFingerprint(field),
					path,
					storage: {
						hasTransformer: field.hasTransformer,
						isArray: field.isColumnArray,
						isSelected: field.isSelected,
						isUnsigned: field.isUnsigned,
						mode: field.columnMode,
						precision: field.precision,
						scale: field.scale,
						type: field.columnType,
					},
				};
			});
		}

		const normalizedPlan: Record<string, unknown> = {
			filter: {
				fields: Object.values(filter.fields).map((field: IApiControllerGetListQueryPlanFilterField) => ({
					allowedOperations: field.allowedOperations,
					defaultCondition: field.defaultCondition,
					isEnabled: field.isEnabled,
					maxValues: field.maxValues,
					...(isCursor ? { metadata: this.createFieldFingerprint(field) } : {}),
					missingBehavior: field.missingBehavior,
					path: field.path,
					relationFilter: field.relationFilter ? this.createRelationFilterFingerprint(field.relationFilter) : undefined,
				})),
				isLegacy: filter.isLegacy,
				unlistedFields: filter.unlistedFields,
			},
			order: normalizedOrder,
		};

		if (isCursor) {
			normalizedPlan.pagination = pagination;
		}
		const signature: string = createHash("sha256").update(JSON.stringify(normalizedPlan)).digest("hex");
		const controllerName: string = controller.name;
		const schemaName: string = `${ApiControllerGetSchemaPrefix(controller)}GetListQuery${signature}DTO`;

		if (!isCursor) {
			const pageFields: Readonly<Record<string, IApiControllerGetListQueryPlanOrderField>> = Object.freeze(Object.fromEntries(Object.entries(order.fields).map(([path, field]: [string, TApiControllerGetListQueryCompiledOrderField]): [string, IApiControllerGetListQueryPlanOrderField] => [path, Object.freeze({ isEnabled: field.isEnabled, path: field.path })])));
			const pageOrderProperties: Record<string, unknown> = {};

			for (const [key, value] of Object.entries(order)) {
				if (key === "serverFields") {
					continue;
				}

				pageOrderProperties[key] = key === "fields" ? pageFields : value;
			}

			if (responseDto) {
				pageOrderProperties.resolvePublishedFields = (): ReadonlySet<string> => ApiControllerGetListResponsePublishedFields(responseDto);
			}

			const pageOrder: IApiControllerGetListQueryPlanOrder = Object.freeze(pageOrderProperties) as unknown as IApiControllerGetListQueryPlanOrder;

			return Object.freeze({ controllerName, filter, order: pageOrder, schemaName, signature });
		}

		const plan: TApiControllerGetListQueryCompiledPlan<EApiControllerGetListQueryPaginationMode.CURSOR> = Object.freeze({
			controllerName,
			filter,
			order,
			pagination: pagination as IApiControllerGetListQueryPlanPagination<EApiControllerGetListQueryPaginationMode.CURSOR>,
			schemaName,
			signature,
		});

		return plan;
	}

	/**
	 * Fails when a field of a link takes a query name that a key of `fields` uses.
	 * @param {string} name - Name of the link.
	 * @param {unknown} rawLink - The link as configured.
	 * @param {Record<string, unknown>} configuredFields - The `fields` of the filter.
	 * @param {Type<unknown>} controller - Controller class, which an error names.
	 */
	private static assertFilterLinkQueryNames(name: string, rawLink: unknown, configuredFields: Record<string, unknown>, controller: Type<unknown>): void {
		const context: string = `Controller "${controller.name}" route "${EApiRouteType.GET_LIST}": GET_LIST filter link "${name}"`;

		for (const fieldPath of Object.keys(this.requireRecord(this.requireRecord(rawLink, context).fields, `${context} fields`))) {
			if (Object.hasOwn(configuredFields, `${name}.${fieldPath}`)) {
				throw ErrorException(`Controller "${controller.name}" route "${EApiRouteType.GET_LIST}": GET_LIST filter field "${name}.${fieldPath}": both a key of fields and a field of link "${name}" use this query name`);
			}
		}
	}

	private static buildFilterBaseline<E>(entity: ObjectLiteral, entityMetadata: IApiEntity<E>, currentGuard: Type<CanActivate> | undefined, isCursor: boolean): Readonly<Record<string, IApiControllerGetListQueryPlanFilterField>> {
		const fields: Record<string, IApiControllerGetListQueryPlanFilterField> = {};

		for (const column of entityMetadata.columns) {
			const metadata: TApiPropertyDescribeProperties | undefined = this.getPropertyMetadata(column);
			const path: string = String(column.name);

			if (!metadata || metadata.type === EApiPropertyDescribeType.OBJECT) {
				continue;
			}

			if (metadata.type !== EApiPropertyDescribeType.RELATION) {
				// Direct scalar filter eligibility is independent of identity status; ordinary DTO visibility and guard checks still apply.
				if (!DtoIsPropertyShouldBeMarked(EApiRouteType.GET_LIST, EApiDtoType.QUERY, path, metadata, false, currentGuard)) {
					continue;
				}

				fields[path] = this.createFilterField(path, metadata, this.isColumnNullable(entity, path, metadata), column.type);

				continue;
			}

			const relationTarget: IApiBaseEntity | undefined = ApiControllerGetListTransformGetRelationTarget(entityMetadata, path, currentGuard);

			if (!relationTarget) {
				continue;
			}

			const relationMetadata: IApiEntity<unknown> | undefined = GenerateRelationEntityInformation(relationTarget);

			if (!relationMetadata) continue;

			for (const relationColumn of relationMetadata.columns) {
				const nestedMetadata: TApiPropertyDescribeProperties | undefined = this.getPropertyMetadata(relationColumn);
				const nestedName: string = String(relationColumn.name);

				if (!nestedMetadata || nestedMetadata.type === EApiPropertyDescribeType.OBJECT || nestedMetadata.type === EApiPropertyDescribeType.RELATION) {
					continue;
				}

				if (!DtoIsPropertyShouldBeMarked(EApiRouteType.GET_LIST, EApiDtoType.QUERY, nestedName, nestedMetadata, false, currentGuard)) {
					continue;
				}

				const nestedPath: string = `${path}.${nestedName}`;

				fields[nestedPath] = this.createFilterField(nestedPath, nestedMetadata, this.isColumnNullable(relationTarget, nestedName, nestedMetadata), relationColumn.type);
			}
		}

		return Object.freeze(this.sortRecord(fields, isCursor));
	}

	private static buildOrderBaseline<E>(entity: ObjectLiteral, entityMetadata: IApiEntity<E>, serverBaseline: Readonly<Record<string, TApiControllerGetListQueryCompiledOrderField>>, isCursor: boolean, currentGuard: Type<CanActivate> | undefined, publishedFields: ReadonlySet<string> | undefined): Readonly<Record<string, TApiControllerGetListQueryCompiledOrderField>> {
		const fields: Record<string, TApiControllerGetListQueryCompiledOrderField> = {};
		const orderFields: Record<string, keyof E> = FilterOrderByFromEntity(entity, entityMetadata, EApiRouteType.GET_LIST, EApiDtoType.QUERY, undefined, currentGuard, publishedFields);

		for (const path of Object.values(orderFields)
			.map(String)
			.toSorted((left: string, right: string): number => this.compareStrings(left, right, isCursor))) {
			const field: TApiControllerGetListQueryCompiledOrderField | undefined = serverBaseline[path];

			if (field) {
				fields[path] = field;
			}
		}

		return Object.freeze(fields);
	}

	private static buildServerOrderBaseline<E>(entity: ObjectLiteral, entityMetadata: IApiEntity<E>, isCursor: boolean): Readonly<Record<string, TApiControllerGetListQueryCompiledOrderField>> {
		const fields: Record<string, TApiControllerGetListQueryCompiledOrderField> = {};

		for (const column of entityMetadata.columns) {
			const metadata: TApiPropertyDescribeProperties | undefined = this.getPropertyMetadata(column);

			if (!column.relation && metadata && metadata.type !== EApiPropertyDescribeType.OBJECT && metadata.type !== EApiPropertyDescribeType.RELATION) {
				const path: string = String(column.name);
				const columnMetadata: TTypeOrmColumnMetadataArguments | undefined = this.findColumnMetadata(entity, path);

				fields[path] = this.createOrderField(path, metadata, this.isColumnNullable(entity, path, metadata), columnMetadata);
			}
		}

		return Object.freeze(this.sortRecord(fields, isCursor));
	}

	private static compareStrings(left: string, right: string, isCursor: boolean): number {
		if (!isCursor) {
			return left.localeCompare(right);
		}

		if (left < right) {
			return -1;
		}

		return left > right ? 1 : 0;
	}

	private static compileAllowedOperations(rawOperations: unknown, field: IApiControllerGetListQueryPlanFilterField, isCursor: boolean): ReadonlyArray<EFilterOperation> {
		if (!Array.isArray(rawOperations) || rawOperations.length === 0) {
			throw ErrorException(`Enabled GET_LIST filter field "${field.path}" requires non-empty allowedOperations`);
		}

		const operations: Array<EFilterOperation> = [];

		for (const rawOperation of rawOperations) {
			if (!EnumIsValue(EFilterOperation, rawOperation)) {
				throw ErrorException(`GET_LIST filter field "${field.path}" contains an unknown operation`);
			}

			const descriptor: IApiControllerGetListQueryOperator = FILTER_OPERATOR_REGISTRY_CONSTANT.OPERATORS[rawOperation];

			if (!descriptor.kinds.includes(field.type) || (descriptor.operand === EFilterOperand.NONE && !field.isNullable)) {
				throw ErrorException(`GET_LIST filter operation "${rawOperation}" is incompatible with field "${field.path}"`);
			}

			if (!operations.includes(rawOperation)) {
				operations.push(rawOperation);
			}
		}

		return Object.freeze(operations.toSorted((left: EFilterOperation, right: EFilterOperation): number => this.compareStrings(left, right, isCursor)));
	}

	private static compileDefaultCondition(rawCondition: unknown, field: IApiControllerGetListQueryPlanFilterField, allowedOperations: ReadonlyArray<EFilterOperation>, controller: Type<unknown>, label: string = "defaultCondition"): IApiControllerGetListQueryPlanCondition {
		const condition: Record<string, unknown> = this.requireRecord(rawCondition, `GET_LIST filter ${label} for "${field.path}"`);
		const operation: unknown = condition.operator;

		if (!EnumIsValue(EFilterOperation, operation) || !allowedOperations.includes(operation)) {
			throw ErrorException(`GET_LIST filter ${label} operation for "${field.path}" is not allowed`);
		}

		const operand: EFilterOperand = FILTER_OPERATOR_REGISTRY_CONSTANT.OPERATORS[operation].operand;

		if (operand === EFilterOperand.NONE) {
			this.requireExactKeys(condition, ["operator"], `GET_LIST filter ${label} for "${field.path}"`);

			return Object.freeze({ operation });
		}

		if (operand === EFilterOperand.VALUE) {
			this.requireExactKeys(condition, ["operator", "value"], `GET_LIST filter ${label} for "${field.path}"`);
			this.validateStaticValue(condition.value, field, controller, label);
			const value: unknown = this.copyStaticValue(condition.value, field);

			return Object.freeze({ operation, value });
		}

		this.requireExactKeys(condition, ["operator", "values"], `GET_LIST filter ${label} for "${field.path}"`);

		if (!Array.isArray(condition.values) || condition.values.length < FILTER_OPERATOR_REGISTRY_CONSTANT.VALUES_MINIMUM_OPERAND_COUNT || (operand === EFilterOperand.PAIR && condition.values.length !== FILTER_OPERATOR_REGISTRY_CONSTANT.PAIR_OPERAND_COUNT) || (operand === EFilterOperand.VALUES && condition.values.length > DTO_GENERATE_CONSTANT.MAXIMUM_FILTER_PROPERTIES)) {
			throw ErrorException(`GET_LIST filter ${label} for "${field.path}" has invalid operand cardinality`);
		}

		for (const value of condition.values as Array<unknown>) {
			this.validateStaticValue(value, field, controller, label);
		}

		const conditionValues: Array<unknown> = (condition.values as Array<unknown>).map((value: unknown): unknown => this.copyStaticValue(value, field));

		return Object.freeze({ operation, values: Object.freeze([...conditionValues]) });
	}

	private static compileFilter<E>(config: IApiControllerPropertiesRouteGetListQueryFilter<E>, baseline: Readonly<Record<string, IApiControllerGetListQueryPlanFilterField>>, isCursor: boolean, controller: Type<unknown>, hiddenPaths: ReadonlySet<string>, describeHiddenField: (path: string) => string, entity: ObjectLiteral, currentGuard: Type<CanActivate> | undefined): IApiControllerGetListQueryPlanFilter {
		const rawConfig: Record<string, unknown> = this.requireRecord(config, "GET_LIST filter");

		this.requireExactKeys(rawConfig, "links" in rawConfig ? ["fields", "links", "unlistedFields"] : ["fields", "unlistedFields"], "GET_LIST filter");
		this.validateUnlistedFields(config.unlistedFields, "filter");
		const configuredFields: Record<string, unknown> = this.requireRecord(config.fields, "GET_LIST filter fields");
		const fields: Record<string, IApiControllerGetListQueryPlanFilterField> = config.unlistedFields === EApiControllerGetListQueryUnlistedFields.INHERIT ? { ...baseline } : {};
		const links: Array<[string, unknown]> = Object.entries(config.links === undefined ? {} : this.requireRecord(config.links, "GET_LIST filter links")).toSorted(([left]: [string, unknown], [right]: [string, unknown]): number => this.compareStrings(left, right, isCursor));

		for (const [name, rawLink] of links) {
			this.assertFilterLinkQueryNames(name, rawLink, configuredFields, controller);
		}

		for (const [path, rawField] of Object.entries(configuredFields).toSorted(([left]: [string, unknown], [right]: [string, unknown]): number => this.compareStrings(left, right, isCursor))) {
			const baselineField: IApiControllerGetListQueryPlanFilterField | undefined = baseline[path];

			// Disabling a hidden column states what the plan already does; enabling it fails.
			if (hiddenPaths.has(path)) {
				const hiddenField: Record<string, unknown> = this.requireRecord(rawField, `GET_LIST filter field "${path}"`);

				if (hiddenField.isEnabled !== false) {
					throw ErrorException(describeHiddenField(path));
				}

				this.requireExactKeys(hiddenField, ["isEnabled"], `Disabled GET_LIST filter field "${path}"`);

				continue;
			}

			const isDeclaredReach: boolean = !baselineField && ApiControllerGetListQueryRelationFilterPath.isDeclaredReach(entity, path);

			if (isDeclaredReach || (baselineField && path.includes(".") && (rawField as Record<string, unknown> | undefined)?.relationConditions !== undefined)) {
				const context: string = `Controller "${controller.name}" route "${EApiRouteType.GET_LIST}": GET_LIST filter field "${path}"`;
				const relationField: IApiControllerGetListQueryPlanFilterField | undefined = this.compileRelationFilterField(path, rawField, ApiControllerGetListQueryRelationFilterPath.read(entity, path, context), isDeclaredReach, isCursor, controller, currentGuard);

				if (relationField) {
					fields[path] = relationField;
				}

				continue;
			}

			if (!baselineField) {
				throw ErrorException(`GET_LIST filter field "${path}" is not an enabled direct scalar or one-hop to-one scalar path`);
			}

			const field: Record<string, unknown> = this.requireRecord(rawField, `GET_LIST filter field "${path}"`);
			const isEnabled: unknown = field.isEnabled;

			if (isEnabled === false) {
				this.requireExactKeys(field, ["isEnabled"], `Disabled GET_LIST filter field "${path}"`);
				fields[path] = Object.freeze({ ...baselineField, allowedOperations: Object.freeze([]), isEnabled: false });

				continue;
			}

			if (isEnabled !== true) {
				throw ErrorException(`GET_LIST filter field "${path}" must declare isEnabled`);
			}

			this.requireAllowedKeys(field, ["allowedOperations", "defaultCondition", "isEnabled", "maxValues", "missingBehavior"], `GET_LIST filter field "${path}"`);
			fields[path] = this.compileFilterEntry(path, field, baselineField, isCursor, controller, false);
		}

		for (const [name, rawLink] of links) {
			this.compileFilterLink(name, rawLink, fields, isCursor, controller, entity, currentGuard);
		}

		return Object.freeze({
			fields: Object.freeze(this.sortRecord(fields, isCursor)),
			isLegacy: false,
			unlistedFields: config.unlistedFields,
		});
	}

	/**
	 * Compiles what every enabled filter entry holds, whether it compares a column of the row or crosses a relation.
	 * @param {string} path - Key of the entry.
	 * @param {Record<string, unknown>} field - The entry as configured.
	 * @param {IApiControllerGetListQueryPlanFilterField} baseField - The column the entry filters.
	 * @param {boolean} isCursor - Whether the route pages by cursor.
	 * @param {Type<unknown>} controller - Controller class, which an error names.
	 * @param {boolean} isExists - Whether the entry compiles to a subquery, which needs a cap on its values.
	 * @returns {IApiControllerGetListQueryPlanFilterField} The compiled entry.
	 */
	private static compileFilterEntry(path: string, field: Record<string, unknown>, baseField: IApiControllerGetListQueryPlanFilterField, isCursor: boolean, controller: Type<unknown>, isExists: boolean): IApiControllerGetListQueryPlanFilterField {
		const allowedOperations: ReadonlyArray<EFilterOperation> = this.compileAllowedOperations(field.allowedOperations, baseField, isCursor);
		const missingBehavior: unknown = field.missingBehavior ?? EApiControllerGetListQueryFilterMissingBehavior.OMIT;

		if (!EnumIsValue(EApiControllerGetListQueryFilterMissingBehavior, missingBehavior)) {
			throw ErrorException(`GET_LIST filter field "${path}" has an invalid missingBehavior`);
		}

		const maxValues: number | undefined = this.compileMaxValues(path, field.maxValues, allowedOperations, controller, isExists);
		let defaultCondition: IApiControllerGetListQueryPlanCondition | undefined;

		if (missingBehavior === EApiControllerGetListQueryFilterMissingBehavior.USE_DEFAULT) {
			defaultCondition = this.compileDefaultCondition(field.defaultCondition, baseField, allowedOperations, controller);

			if (maxValues !== undefined && FILTER_OPERATOR_REGISTRY_CONSTANT.OPERATORS[defaultCondition.operation].operand === EFilterOperand.VALUES && (defaultCondition.values?.length ?? 0) > maxValues) {
				throw ErrorException(`Controller "${controller.name}" route "${EApiRouteType.GET_LIST}": GET_LIST filter field "${path}" has a defaultCondition with more values than its maxValues of ${String(maxValues)}`);
			}
		} else if (field.defaultCondition !== undefined) {
			throw ErrorException(`GET_LIST filter field "${path}" can declare defaultCondition only with USE_DEFAULT`);
		}

		return Object.freeze({
			...baseField,
			allowedOperations,
			defaultCondition,
			isEnabled: true,
			...(maxValues === undefined ? {} : { maxValues }),
			missingBehavior,
		});
	}

	/**
	 * Compiles a declared link into the fields of the plan, under the name the developer wrote.
	 * @param {string} name - Name of the link.
	 * @param {unknown} rawLink - The link as configured.
	 * @param {Record<string, IApiControllerGetListQueryPlanFilterField>} fields - The fields of the plan, which this adds to.
	 * @param {boolean} isCursor - Whether the route pages by cursor.
	 * @param {Type<unknown>} controller - Controller class, which an error names.
	 * @param {ObjectLiteral} entity - Route entity class.
	 * @param {Type<CanActivate> | undefined} currentGuard - Guard of the route.
	 */
	private static compileFilterLink(name: string, rawLink: unknown, fields: Record<string, IApiControllerGetListQueryPlanFilterField>, isCursor: boolean, controller: Type<unknown>, entity: ObjectLiteral, currentGuard: Type<CanActivate> | undefined): void {
		const context: string = `Controller "${controller.name}" route "${EApiRouteType.GET_LIST}": GET_LIST filter link "${name}"`;
		const hierarchy: Array<new () => unknown> = GetClassHierarchy(ResolveMetadataTarget(entity));
		const storage: TTypeOrmMetadataArgumentsStorage = getMetadataArgsStorage();

		if (!FILTER_LINK_NAME_PATTERN.test(name) || UNSAFE_OBJECT_PROPERTY_NAMES_CONSTANT.has(name)) {
			throw ErrorException(`${context}: the name must be a plain identifier, as it starts the query names of the link`);
		}

		if ([...storage.filterColumns(hierarchy), ...storage.filterRelations(hierarchy), ...storage.filterEmbeddeds(hierarchy)].some((property: { propertyName: string }): boolean => property.propertyName === name)) {
			throw ErrorException(`${context}: the name equals a property of the route entity, so its query names could mean a path through that property; rename the link`);
		}

		const link: IApiControllerPropertiesRouteGetListQueryFilterLink = this.requireRecord(rawLink, context) as unknown as IApiControllerPropertiesRouteGetListQueryFilterLink;

		this.requireExactKeys(link as unknown as Record<string, unknown>, ["entity", "fields", "source", "target"], context);
		const linkFields: Array<[string, unknown]> = Object.entries(this.requireRecord(link.fields, `${context} fields`));

		if (linkFields.length === 0) {
			throw ErrorException(`${context}: declares no fields`);
		}

		for (const [fieldPath, rawField] of linkFields) {
			const path: string = `${name}.${fieldPath}`;
			const fieldContext: string = `Controller "${controller.name}" route "${EApiRouteType.GET_LIST}": GET_LIST filter field "${path}"`;

			const relationField: IApiControllerGetListQueryPlanFilterField | undefined = this.compileRelationFilterField(path, rawField, ApiControllerGetListQueryRelationFilterPath.readLink(entity, link, fieldPath, fieldContext), true, isCursor, controller, currentGuard);

			if (relationField) {
				fields[path] = relationField;
			}
		}
	}

	/**
	 * Compiles the cap of a field's membership operators.
	 * @param {string} path - Key of the field.
	 * @param {unknown} rawMaxValues - The cap as configured.
	 * @param {ReadonlyArray<EFilterOperation>} allowedOperations - The operations of the field.
	 * @param {Type<unknown>} controller - Controller class, which an error names.
	 * @param {boolean} isRequired - Whether a membership operator needs a declared cap.
	 * @returns {number | undefined} The cap, or undefined for the global limit.
	 */
	private static compileMaxValues(path: string, rawMaxValues: unknown, allowedOperations: ReadonlyArray<EFilterOperation>, controller: Type<unknown>, isRequired: boolean): number | undefined {
		const context: string = `Controller "${controller.name}" route "${EApiRouteType.GET_LIST}": GET_LIST filter field "${path}"`;
		const hasMembership: boolean = allowedOperations.some((operation: EFilterOperation): boolean => FILTER_OPERATOR_REGISTRY_CONSTANT.OPERATORS[operation].operand === EFilterOperand.VALUES);

		if (rawMaxValues === undefined) {
			if (isRequired && hasMembership) {
				throw ErrorException(`${context} crosses a relation with a membership operator, so it must declare maxValues`);
			}

			return undefined;
		}

		if (!hasMembership) {
			throw ErrorException(`${context} declares maxValues without a membership operator`);
		}

		if (typeof rawMaxValues !== "number" || !Number.isInteger(rawMaxValues) || rawMaxValues < FILTER_RELATION_CONSTANT.MINIMUM_VALUES || rawMaxValues > FILTER_RELATION_CONSTANT.MAXIMUM_VALUES) {
			throw ErrorException(`${context} must declare maxValues as an integer from ${String(FILTER_RELATION_CONSTANT.MINIMUM_VALUES)} to ${String(FILTER_RELATION_CONSTANT.MAXIMUM_VALUES)}`);
		}

		return rawMaxValues;
	}

	private static compileOrder<E>(config: IApiControllerPropertiesRouteGetListQueryOrder<E>, baseline: Readonly<Record<string, TApiControllerGetListQueryCompiledOrderField>>, serverBaseline: Readonly<Record<string, TApiControllerGetListQueryCompiledOrderField>>, isCursor: boolean, describeUnorderableField: (path: string) => string, isHiddenField: (path: string) => boolean): TApiControllerGetListQueryCompiledOrder {
		const rawConfig: Record<string, unknown> = this.requireRecord(config, "GET_LIST order");

		this.requireAllowedKeys(rawConfig, ["defaultOrder", "fields", "tieBreakers", "unlistedFields"], "GET_LIST order");
		this.validateUnlistedFields(config.unlistedFields, "order");
		const configuredFields: Record<string, unknown> = this.requireRecord(config.fields, "GET_LIST order fields");
		const fields: Record<string, TApiControllerGetListQueryCompiledOrderField> = config.unlistedFields === EApiControllerGetListQueryUnlistedFields.INHERIT ? { ...baseline } : {};

		for (const [path, rawField] of Object.entries(configuredFields).toSorted(([left]: [string, unknown], [right]: [string, unknown]): number => this.compareStrings(left, right, isCursor))) {
			const baselineField: TApiControllerGetListQueryCompiledOrderField | undefined = baseline[path];

			// Disabling a column the list response hides states what the plan already does; enabling it fails.
			if (!baselineField && isHiddenField(path)) {
				const hiddenField: Record<string, unknown> = this.requireRecord(rawField, `GET_LIST order field "${path}"`);

				if (hiddenField.isEnabled !== false) {
					throw ErrorException(describeUnorderableField(path));
				}

				this.requireExactKeys(hiddenField, ["isEnabled"], `Disabled GET_LIST order field "${path}"`);

				continue;
			}

			if (!baselineField) {
				throw ErrorException(describeUnorderableField(path));
			}

			const field: Record<string, unknown> = this.requireRecord(rawField, `GET_LIST order field "${path}"`);

			this.requireExactKeys(field, ["isEnabled"], `GET_LIST order field "${path}"`);

			if (field.isEnabled !== true && field.isEnabled !== false) {
				throw ErrorException(`GET_LIST order field "${path}" must declare isEnabled`);
			}

			fields[path] = Object.freeze({ ...baselineField, isEnabled: field.isEnabled });
		}
		const defaultOrder: ReadonlyArray<IApiControllerGetListQueryPlanOrderEntry> = this.compileOrderEntries(config.defaultOrder, serverBaseline, "defaultOrder");
		const tieBreakers: ReadonlyArray<IApiControllerGetListQueryPlanOrderEntry> = this.compileOrderEntries(config.tieBreakers, serverBaseline, "tieBreakers");

		for (const defaultEntry of defaultOrder) {
			const tieBreaker: IApiControllerGetListQueryPlanOrderEntry | undefined = tieBreakers.find((entry: IApiControllerGetListQueryPlanOrderEntry): boolean => entry.field === defaultEntry.field);

			if (tieBreaker && tieBreaker.direction !== defaultEntry.direction) {
				throw ErrorException(`GET_LIST order field "${defaultEntry.field}" has conflicting directions across defaultOrder and tieBreakers`);
			}
		}

		return Object.freeze({
			...(config.defaultOrder === undefined ? {} : { defaultOrder }),
			fields: Object.freeze(this.sortRecord(fields, isCursor)),
			isLegacy: false,
			serverFields: serverBaseline,
			...(config.tieBreakers === undefined ? {} : { tieBreakers }),
			unlistedFields: config.unlistedFields,
		});
	}

	private static compileOrderEntries<E>(rawEntries: ReadonlyArray<IApiControllerPropertiesRouteGetListQueryOrderEntry<E>> | undefined, baseline: Readonly<Record<string, TApiControllerGetListQueryCompiledOrderField>>, context: string): ReadonlyArray<IApiControllerGetListQueryPlanOrderEntry> {
		if (rawEntries === undefined) {
			return Object.freeze([]);
		}

		if (!Array.isArray(rawEntries)) {
			throw ErrorException(`GET_LIST order ${context} must be an array`);
		}

		const entries: Array<IApiControllerGetListQueryPlanOrderEntry> = [];
		const seenFields: Set<string> = new Set<string>();

		for (const [index, rawEntry] of rawEntries.entries()) {
			const entry: Record<string, unknown> = this.requireRecord(rawEntry, `GET_LIST order ${context}[${index}]`);
			this.requireExactKeys(entry, ["direction", "field"], `GET_LIST order ${context}[${index}]`);
			const field: unknown = entry.field;
			const direction: unknown = entry.direction;

			if (typeof field !== "string" || !baseline[field]) {
				throw ErrorException(`GET_LIST order ${context}[${index}] must target a described direct scalar entity field`);
			}

			if (direction !== EFilterOrderDirection.ASC && direction !== EFilterOrderDirection.DESC) {
				throw ErrorException(`GET_LIST order ${context}[${index}] has an invalid direction`);
			}

			if (seenFields.has(field)) {
				throw ErrorException(`GET_LIST order ${context} contains duplicate field "${field}"`);
			}

			seenFields.add(field);
			entries.push(Object.freeze({ direction, field }));
		}

		return Object.freeze(entries);
	}

	private static compilePagination(config: IApiControllerPropertiesRouteGetListQueryPagination<EApiControllerGetListQueryPaginationMode> | undefined): IApiControllerGetListQueryPlanPagination<EApiControllerGetListQueryPaginationMode> {
		if (config === undefined) {
			return Object.freeze({ mode: EApiControllerGetListQueryPaginationMode.PAGE });
		}

		const rawConfig: Record<string, unknown> = this.requireRecord(config, "GET_LIST pagination");

		this.requireExactKeys(rawConfig, ["mode"], "GET_LIST pagination");

		if (!EnumIsValue(EApiControllerGetListQueryPaginationMode, config.mode)) {
			throw ErrorException("GET_LIST pagination mode must be PAGE or CURSOR");
		}

		return Object.freeze({ mode: config.mode });
	}

	/**
	 * Compiles the fixed conditions of a relation filter field.
	 * @param {string} path - Key of the field.
	 * @param {unknown} rawConditions - The conditions as configured.
	 * @param {IApiControllerGetListQueryRelationFilterPath} relationPath - What the key names.
	 * @param {Type<unknown>} controller - Controller class, which an error names.
	 * @returns {ReadonlyArray<IApiControllerGetListQueryPlanFilterRelationCondition>} The compiled conditions.
	 */
	private static compileRelationConditions(path: string, rawConditions: unknown, relationPath: IApiControllerGetListQueryRelationFilterPath, controller: Type<unknown>): ReadonlyArray<IApiControllerGetListQueryPlanFilterRelationCondition> {
		const context: string = `Controller "${controller.name}" route "${EApiRouteType.GET_LIST}": GET_LIST filter field "${path}"`;

		if (rawConditions === undefined) {
			return Object.freeze([]);
		}

		if (!Array.isArray(rawConditions)) {
			throw ErrorException(`${context}: relationConditions must be an array`);
		}

		return Object.freeze(
			(rawConditions as Array<unknown>).map((rawCondition: unknown, index: number): IApiControllerGetListQueryPlanFilterRelationCondition => {
				const conditionContext: string = `${context}: relationConditions[${String(index)}]`;
				const { field, operator, relation, ...operand }: Record<string, unknown> = this.requireRecord(rawCondition, conditionContext);
				const lastRow: number = relationPath.rows.length - 1;
				const rowIndexes: Array<number> = relation === undefined ? [lastRow] : relationPath.rows.flatMap((row: { name: string }, candidate: number): Array<number> => (row.name === relation ? [candidate] : []));
				const [rowIndex]: Array<number> = rowIndexes;

				if (rowIndex === undefined || rowIndexes.length > 1) {
					throw ErrorException(`${conditionContext} names relation "${String(relation)}", which ${rowIndex === undefined ? "the path does not cross" : "the path crosses more than once"}`);
				}

				const row: { entity: TMetadataStorageTarget; name: string } = relationPath.rows[rowIndex] as { entity: TMetadataStorageTarget; name: string };
				const column: IApiEntityColumn<unknown> | undefined = typeof field === "string" ? GenerateRelationEntityInformation<unknown>(row.entity)?.columns.find((candidate: IApiEntityColumn<unknown>): boolean => String(candidate.name) === field) : undefined;
				const metadata: TApiPropertyDescribeProperties | undefined = column ? this.getPropertyMetadata(column) : undefined;
				const storage: TTypeOrmColumnMetadataArguments | undefined = typeof field === "string" ? this.findColumnMetadata(row.entity, field) : undefined;
				const reason: string | undefined = column && metadata ? this.getRelationColumnRefusal(metadata, storage) : `"${String(field)}" is no described column of entity "${row.entity.name}"`;

				if (reason !== undefined || !column || !metadata) {
					throw ErrorException(`${conditionContext}: ${String(reason)}`);
				}

				if (FILTER_RELATION_CONSTANT.ABSENCE_OPERATIONS.has(operator as EFilterOperation)) {
					throw ErrorException(`${conditionContext}: operation "${String(operator)}" asks about the absence of a value, and a relation filter means that a related row exists that matches`);
				}

				const compiled: IApiControllerGetListQueryPlanCondition = this.withRouteInError(conditionContext, (): IApiControllerGetListQueryPlanCondition => {
					const conditionField: IApiControllerGetListQueryPlanFilterField = this.createFilterField(`${path}: ${row.name}.${String(field)}`, metadata, this.isColumnNullable(row.entity, String(field), metadata), column.type);

					return this.compileDefaultCondition({ operator, ...operand }, conditionField, this.compileAllowedOperations([operator], conditionField, false), controller, "relationConditions value");
				});

				return Object.freeze({ ...compiled, field: String(field), rowIndex });
			}),
		);
	}

	/**
	 * Compiles a filter field that crosses a relation with a correlated subquery. The leaf answers for itself: it is a
	 * described scalar its own entity shows, whatever the relations before it show. Absence stops startup, because the
	 * field means that a related row exists that matches.
	 * @param {string} path - Query name of the field.
	 * @param {unknown} rawField - The entry as configured.
	 * @param {IApiControllerGetListQueryRelationFilterPath} relationPath - What the key names.
	 * @param {boolean} isDeclaredReach - Whether the key reaches past what a plan offers without a declaration.
	 * @param {boolean} isCursor - Whether the route pages by cursor.
	 * @param {Type<unknown>} controller - Controller class, which an error names.
	 * @param {Type<CanActivate> | undefined} currentGuard - Guard of the route.
	 * @returns {IApiControllerGetListQueryPlanFilterField | undefined} The field, or undefined for an entry that disables it, which needs no field: nothing offers the path without a declaration.
	 */
	private static compileRelationFilterField(path: string, rawField: unknown, relationPath: IApiControllerGetListQueryRelationFilterPath, isDeclaredReach: boolean, isCursor: boolean, controller: Type<unknown>, currentGuard: Type<CanActivate> | undefined): IApiControllerGetListQueryPlanFilterField | undefined {
		const context: string = `Controller "${controller.name}" route "${EApiRouteType.GET_LIST}": GET_LIST filter field "${path}"`;
		const field: Record<string, unknown> = this.requireRecord(rawField, context);
		const { leafEntity, leafProperty }: IApiControllerGetListQueryRelationFilterPath = relationPath;
		const column: IApiEntityColumn<unknown> | undefined = GenerateRelationEntityInformation<unknown>(leafEntity)?.columns.find((candidate: IApiEntityColumn<unknown>): boolean => String(candidate.name) === leafProperty);
		const metadata: TApiPropertyDescribeProperties | undefined = column ? this.getPropertyMetadata(column) : undefined;

		if (!column || !metadata) {
			throw ErrorException(`${context}: "${leafProperty}" is no described column of entity "${leafEntity.name}"`);
		}

		const storage: TTypeOrmColumnMetadataArguments | undefined = this.findColumnMetadata(leafEntity, leafProperty);
		const refusal: string | undefined = this.getRelationColumnRefusal(metadata, storage) ?? this.getRelationLeafHiddenReason(leafProperty, metadata, column, currentGuard);

		if (refusal !== undefined) {
			throw ErrorException(`${context}: "${leafProperty}" of entity "${leafEntity.name}" cannot be filtered: ${refusal}`);
		}

		if (field.isEnabled === false) {
			this.requireExactKeys(field, ["isEnabled"], `Disabled ${context}`);

			return undefined;
		}

		if (field.isEnabled !== true) {
			throw ErrorException(`${context} must declare isEnabled`);
		}

		this.requireAllowedKeys(field, ["allowedOperations", "defaultCondition", "isEnabled", "maxValues", "missingBehavior", "relationConditions"], context);
		const absence: EFilterOperation | undefined = Array.isArray(field.allowedOperations) ? (field.allowedOperations as Array<EFilterOperation>).find((operation: EFilterOperation): boolean => FILTER_RELATION_CONSTANT.ABSENCE_OPERATIONS.has(operation)) : undefined;

		if (absence !== undefined) {
			throw ErrorException(`${context}: operation "${absence}" asks about absence, and a relation filter means that a related row exists that matches, so it cannot mean the same`);
		}

		const base: IApiControllerGetListQueryPlanFilterField = this.createFilterField(path, metadata, this.isColumnNullable(leafEntity, leafProperty, metadata), column.type);
		const entry: IApiControllerGetListQueryPlanFilterField = this.withRouteInError(context, (): IApiControllerGetListQueryPlanFilterField => this.compileFilterEntry(path, field, base, isCursor, controller, true));

		const relationFilter: IApiControllerGetListQueryPlanFilterRelation = Object.freeze({
			conditions: this.compileRelationConditions(path, field.relationConditions, relationPath, controller),
			hops: Object.freeze([...relationPath.hops]),
			isDeclaredReach,
			leafEntity,
			leafProperty,
		});

		return Object.freeze({ ...entry, relationFilter });
	}

	/**
	 * Copies a validated defaultCondition value into the plan, so later changes to the configured value do not reach it.
	 * A UTC instant string on a date-time field becomes the Date it names, as a client value does.
	 * @param {unknown} value - Validated defaultCondition value
	 * @param {IApiControllerGetListQueryPlanFilterField} field - Field the condition filters
	 * @returns {unknown} The value the plan holds
	 */
	private static copyStaticValue(value: unknown, field: IApiControllerGetListQueryPlanFilterField): unknown {
		if (value instanceof Date) {
			return new Date(value);
		}

		const isDateTime: boolean = field.metadata.type === EApiPropertyDescribeType.DATE && field.metadata.format === EApiPropertyDateType.DATE_TIME;

		return isDateTime && typeof value === "string" ? new Date(value) : value;
	}

	private static createCursorOrderFieldFingerprint(field: TApiControllerGetListQueryCompiledOrderField): Record<string, unknown> {
		const fingerprint: Record<string, unknown> = { type: field.type };

		if ("format" in field.metadata) {
			fingerprint.format = field.metadata.format;
		}

		if ("enum" in field.metadata) {
			const values: ReadonlyArray<number | string> = EnumValues(field.metadata.enum);
			let enumKind: string = "mixed";

			if (values.every((value: number | string): boolean => typeof value === "number")) {
				enumKind = "number";
			} else if (values.every((value: number | string): boolean => typeof value === "string")) {
				enumKind = "string";
			}

			fingerprint.enumKind = enumKind;
		}

		return fingerprint;
	}

	private static createFieldFingerprint(field: IApiControllerGetListQueryPlanFilterField | TApiControllerGetListQueryCompiledOrderField): Record<string, unknown> {
		const metadata: Record<string, unknown> = field.metadata;

		const fingerprint: Record<string, unknown> = {
			isNullable: field.isNullable,
			type: field.type,
		};

		for (const key of ["format", "identifier", "isArray", "maximum", "maxLength", "minimum", "minLength", "multipleOf", "pattern"] as const) {
			if (key in metadata) {
				fingerprint[key] = metadata[key];
			}
		}

		if ("enum" in field.metadata) {
			fingerprint.enum = EnumValues(field.metadata.enum);
		}

		return fingerprint;
	}

	private static createFilterField(path: string, metadata: TApiPropertyDescribeProperties, isNullable: boolean, columnType: unknown): IApiControllerGetListQueryPlanFilterField {
		const allowedOperations: ReadonlyArray<EFilterOperation> = Object.freeze(
			Object.values(EFilterOperation).filter((operation: EFilterOperation): boolean => {
				const descriptor: IApiControllerGetListQueryOperator = FILTER_OPERATOR_REGISTRY_CONSTANT.OPERATORS[operation];

				return descriptor.kinds.includes(metadata.type) && (descriptor.operand !== EFilterOperand.NONE || isNullable);
			}),
		);
		const planMetadata: Readonly<TApiPropertyDescribeProperties> = this.createPlanMetadata(metadata);

		return Object.freeze({
			allowedOperations,
			columnType,
			isEnabled: true,
			isNullable,
			metadata: planMetadata,
			missingBehavior: EApiControllerGetListQueryFilterMissingBehavior.OMIT,
			path,
			type: metadata.type,
		});
	}

	private static createOrderField(path: string, metadata: TApiPropertyDescribeProperties, isNullable: boolean, columnMetadata: TTypeOrmColumnMetadataArguments | undefined): TApiControllerGetListQueryCompiledOrderField {
		return Object.freeze({
			columnMode: columnMetadata?.mode ?? "unknown",
			columnType: this.normalizeColumnType(columnMetadata),
			hasTransformer: columnMetadata?.options.transformer !== undefined,
			isColumnArray: columnMetadata?.options.array === true,
			isEnabled: true,
			isNullable,
			isSelected: columnMetadata?.options.select !== false,
			isUnsigned: columnMetadata?.options.unsigned === true,
			metadata: this.createPlanMetadata(metadata),
			path,
			...(columnMetadata?.options.precision === undefined ? {} : { precision: columnMetadata.options.precision }),
			...(columnMetadata?.options.scale === undefined ? {} : { scale: columnMetadata.options.scale }),
			type: metadata.type,
		});
	}

	private static createPlanMetadata(metadata: TApiPropertyDescribeProperties): Readonly<TApiPropertyDescribeProperties> {
		const planMetadata: TApiPropertyDescribeProperties = "enum" in metadata ? { ...metadata, enum: Object.freeze({ ...metadata.enum }) } : { ...metadata };

		return Object.freeze(planMetadata);
	}

	private static createRelationFilterFingerprint(relationFilter: IApiControllerGetListQueryPlanFilterRelation): Record<string, unknown> {
		return {
			conditions: relationFilter.conditions,
			hops: relationFilter.hops.map((hop: IApiControllerGetListQueryPlanFilterRelationHop): Record<string, unknown> => ({ entity: hop.entity.name, relation: hop.relation, source: hop.source, target: hop.target.name })),
			leaf: `${relationFilter.leafEntity.name}.${relationFilter.leafProperty}`,
		};
	}

	private static describeHiddenFilterField<E>(controller: Type<unknown>, entityMetadata: IApiEntity<E>, path: string, currentGuard: Type<CanActivate> | undefined, publishedFields: ReadonlySet<string> | undefined): string {
		const field: string = `Controller "${controller.name}" route "${EApiRouteType.GET_LIST}": GET_LIST filter field "${path}" is hidden from the list response, so no client may filter by it`;
		const [rootName, nestedName]: Array<string | undefined> = path.split(".");
		const column: IApiEntityColumn<E> | undefined = entityMetadata.columns.find((candidate: IApiEntityColumn<E>): boolean => String(candidate.name) === rootName);
		const metadata: TApiPropertyDescribeProperties | undefined = column ? this.getPropertyMetadata(column) : undefined;

		if (!column || !metadata) {
			return field;
		}

		const rootReason: string | undefined = this.getHiddenReason(String(column.name), metadata, column.isPrimary, column.isSelected !== false, currentGuard, publishedFields);

		if (rootReason !== undefined) {
			const relationPrefix: string = nestedName === undefined ? "" : `its relation "${String(rootName)}": `;

			return `${field}: ${relationPrefix}${rootReason}`;
		}

		if (nestedName === undefined || !column.relation?.target) {
			return field;
		}

		const nestedColumn: IApiEntityColumn<unknown> | undefined = GenerateRelationEntityInformation(column.relation.target)?.columns.find((candidate: IApiEntityColumn<unknown>): boolean => String(candidate.name) === nestedName);
		const nestedMetadata: TApiPropertyDescribeProperties | undefined = nestedColumn ? this.getPropertyMetadata(nestedColumn) : undefined;
		const nestedReason: string | undefined = nestedColumn && nestedMetadata ? this.getHiddenReason(nestedName, nestedMetadata, nestedColumn.isPrimary, nestedColumn.isSelected !== false, currentGuard) : undefined;

		return nestedReason === undefined ? field : `${field}: ${nestedReason}`;
	}

	private static describeUnorderableOrderField<E>(controller: Type<unknown>, entityMetadata: IApiEntity<E>, serverBaseline: Readonly<Record<string, TApiControllerGetListQueryCompiledOrderField>>, path: string, currentGuard: Type<CanActivate> | undefined, publishedFields: ReadonlySet<string> | undefined): string {
		const field: string = `Controller "${controller.name}" route "${EApiRouteType.GET_LIST}": GET_LIST order field "${path}"`;
		const column: IApiEntityColumn<E> | undefined = serverBaseline[path] ? entityMetadata.columns.find((candidate: IApiEntityColumn<E>): boolean => String(candidate.name) === path) : undefined;
		const metadata: TApiPropertyDescribeProperties | undefined = column ? this.getPropertyMetadata(column) : undefined;

		if (!column || !metadata) {
			return `${field} is not an enabled direct scalar path`;
		}

		return `${field} is not orderable: ${this.getUnorderableReason(path, metadata, column.isPrimary, column.isSelected !== false, currentGuard, publishedFields)}`;
	}

	// Reads the columns of the entity class and its parents, as TypeORM does: a property a parent declares keeps the parent's column.
	private static findColumnMetadata(entity: ObjectLiteral | TApiEntityReference, propertyName: string): TTypeOrmColumnMetadataArguments | undefined {
		return getMetadataArgsStorage()
			.filterColumns(GetClassHierarchy(ResolveMetadataTarget(entity)))
			.find((column: TTypeOrmColumnMetadataArguments): boolean => column.propertyName === propertyName);
	}

	// Names the first reason the list response hides a described column's value, the rule of ApiControllerGetListIsHiddenColumn, or nothing when it shows the value.
	private static getHiddenReason(path: string, metadata: TApiPropertyDescribeProperties, isPrimary: boolean, isSelected: boolean = true, currentGuard?: Type<CanActivate>, publishedFields?: ReadonlySet<string>): string | undefined {
		const response: TApiPropertyDescribeDtoProperties = DtoGetDecoratorConfig(EApiRouteType.GET_LIST, metadata, EApiDtoType.RESPONSE);

		if (!isSelected) {
			return "its column sets select: false, so TypeORM does not load it";
		}

		if (!DtoIsPropertyShouldBeMarked(EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, path, metadata, isPrimary, currentGuard) || response.isEnabled === false || response.isResponse !== true) {
			return "the GET_LIST response does not expose it for the route guard";
		}

		if (response.isExpose !== true) {
			return "it sets isExpose: false in the GET_LIST response";
		}

		if (publishedFields && !publishedFields.has(path)) {
			return "the manual GET_LIST response DTO does not publish it";
		}

		return undefined;
	}

	private static getPropertyMetadata<E>(column: IApiEntityColumn<E>): TApiPropertyDescribeProperties | undefined {
		return column.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY] as TApiPropertyDescribeProperties | undefined;
	}

	/**
	 * Names why a column cannot be read inside a relation filter subquery, which writes its values with no TypeORM value transformer.
	 * @param {TApiPropertyDescribeProperties} metadata - The described property.
	 * @param {TTypeOrmColumnMetadataArguments | undefined} storage - The TypeORM column.
	 * @returns {string | undefined} The reason, or undefined for a column it reads.
	 */
	private static getRelationColumnRefusal(metadata: TApiPropertyDescribeProperties, storage: TTypeOrmColumnMetadataArguments | undefined): string | undefined {
		if (metadata.type === EApiPropertyDescribeType.OBJECT || metadata.type === EApiPropertyDescribeType.RELATION) {
			return "it is not a scalar";
		}

		if (!storage || CURSOR_NON_PERSISTED_COLUMN_MODES.has(storage.mode)) {
			return "it is not a persisted column";
		}

		if (storage.options.array === true) {
			return "it holds a list";
		}

		return storage.options.transformer === undefined ? undefined : "it declares a value transformer, which a subquery does not apply";
	}

	/**
	 * Names why a route may not filter by the last column of a relation path, by what its own entity shows.
	 * @param {string} name - Property of the column.
	 * @param {TApiPropertyDescribeProperties} metadata - The described property.
	 * @param {IApiEntityColumn<unknown>} column - The entity column.
	 * @param {Type<CanActivate> | undefined} currentGuard - Guard of the route.
	 * @returns {string | undefined} The reason, or undefined for a column the route may filter by.
	 */
	private static getRelationLeafHiddenReason(name: string, metadata: TApiPropertyDescribeProperties, column: IApiEntityColumn<unknown>, currentGuard: Type<CanActivate> | undefined): string | undefined {
		if (!DtoIsPropertyShouldBeMarked(EApiRouteType.GET_LIST, EApiDtoType.QUERY, name, metadata, false, currentGuard)) {
			return "it is not enabled as a GET_LIST query field for the route guard";
		}

		return this.getHiddenReason(name, metadata, column.isPrimary, column.isSelected !== false, currentGuard);
	}

	// Follows the checks of FilterOrderByFromEntity in order, so the first one a described scalar column fails names the reason.
	private static getUnorderableReason(path: string, metadata: TApiPropertyDescribeProperties, isPrimary: boolean, isSelected: boolean = true, currentGuard: Type<CanActivate> | undefined, publishedFields: ReadonlySet<string> | undefined): string {
		const query: TApiPropertyDescribeDtoQueryGetListProperties | undefined = metadata.properties?.[EApiRouteType.GET_LIST]?.[EApiDtoType.QUERY];

		if (metadata.isAutoDtoEnabled === false) {
			return "it sets isAutoDtoEnabled: false";
		}

		if (query?.useAsOrderByFilter === false) {
			return "it sets useAsOrderByFilter: false";
		}

		if (!DtoIsPropertyShouldBeMarked(EApiRouteType.GET_LIST, EApiDtoType.QUERY, path, metadata, false, currentGuard)) {
			return "it is not enabled as a GET_LIST query field for the route guard";
		}

		return this.getHiddenReason(path, metadata, isPrimary, isSelected, currentGuard, publishedFields) ?? "its column type cannot be ordered";
	}

	private static hasAfterLoadListener(entity: ObjectLiteral | TApiEntityReference): boolean {
		return getMetadataArgsStorage()
			.filterListeners(GetClassHierarchy(entity))
			.some((listener: TTypeOrmEntityListenerMetadataArguments): boolean => listener.type === "after-load");
	}

	private static hasPropertyAccessor(entity: ObjectLiteral | TApiEntityReference | Type<unknown>, propertyName: string): boolean {
		if (typeof entity === "function") {
			try {
				const instance: object = Reflect.construct(entity, []) as object;
				const ownDescriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(instance, propertyName);

				if (ownDescriptor && !("value" in ownDescriptor)) {
					return true;
				}
			} catch {
				return true;
			}
		}

		let current: unknown = typeof entity === "function" ? Reflect.get(entity, "prototype") : undefined;

		while (current && typeof current === "object" && current !== Object.prototype) {
			const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(current, propertyName);

			if (descriptor && !("value" in descriptor)) {
				return true;
			}

			current = Object.getPrototypeOf(current) as unknown;
		}

		return false;
	}

	private static isColumnNullable(entity: ObjectLiteral | TApiEntityReference, propertyName: string, metadata: TApiPropertyDescribeProperties): boolean {
		return this.findColumnMetadata(entity, propertyName)?.options.nullable === true || metadata.isNullable === true;
	}

	private static isCursorEnvelopeStringMetadata(metadata: TManualDtoPropertyMetadata): boolean {
		if (metadata.decorator !== EManualDtoPropertyMetadataDecorator.STRING || !this.isManualRawResponseProperty(metadata, false, true)) {
			return false;
		}

		return metadata.properties.format === EApiPropertyStringType.STRING && metadata.properties.minLength === 1 && metadata.properties.maxLength === API_CONTROLLER_CURSOR_TOKEN_MAX_LENGTH && metadata.properties.pattern === "/^[A-Za-z0-9_-]+$/";
	}

	private static isManualRawResponseProperty(metadata: TManualDtoPropertyMetadata, isArray: boolean, isNullable: boolean): boolean {
		const properties: Record<string, unknown> = metadata.properties;
		const hasExpectedArrayShape: boolean = isArray ? properties.isArray === true : properties.isArray !== true;
		const hasExpectedNullability: boolean = isNullable ? properties.isNullable === true : properties.isNullable !== true;

		return hasExpectedArrayShape && hasExpectedNullability && properties.isRequired === true && properties.isResponse === true && properties.isExpose !== false;
	}

	private static isUnsafeCursorFieldName(fieldName: string): boolean {
		const numericName: number = Number(fieldName);

		return UNSAFE_OBJECT_PROPERTY_NAMES_CONSTANT.has(fieldName) || (Number.isInteger(numericName) && numericName >= 0 && numericName <= CURSOR_MAXIMUM_ARRAY_INDEX_PROPERTY && String(numericName) === fieldName);
	}

	private static normalizeColumnType(column: TTypeOrmColumnMetadataArguments | undefined): string {
		const columnType: unknown = column?.options.type;

		if (columnType === Boolean) {
			return "boolean-constructor";
		}

		if (columnType === Date) {
			return "date-constructor";
		}

		if (columnType === Number) {
			return "number-constructor";
		}

		if (columnType === String) {
			return "string-constructor";
		}

		return typeof columnType === "string" ? columnType.trim().toLowerCase() : "unknown";
	}

	// A wrapper with an unproven items property is left to the envelope proof of validateCursorCustomResponseDto, which reports it.
	private static readCursorPublishedFields(responseDto: IApiControllerPropertiesRouteGetListResponseDtoConfig | Type<unknown>): ReadonlySet<string> | undefined {
		if (typeof responseDto === "object") {
			return this.readDeclaredFields(responseDto.itemType);
		}

		const prototype: object = Reflect.get(responseDto, "prototype") as object;
		const itemsMetadata: TManualDtoPropertyMetadata | undefined = GetManualDtoPropertyMetadata(prototype).get("items");
		const itemType: unknown = itemsMetadata?.decorator === EManualDtoPropertyMetadataDecorator.OBJECT ? itemsMetadata.properties.type : undefined;

		if (typeof itemType === "function" && Reflect.get(itemType, "prototype") !== undefined && itemType !== Object) {
			return this.readDeclaredFields(itemType as Type<unknown>);
		}

		return itemsMetadata || Reflect.hasMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, prototype, "items") ? undefined : new Set<string>();
	}

	// Reads the names a class documents without evaluating a lazy type one of them may declare.
	private static readDeclaredFields(itemType: Type<unknown>): ReadonlySet<string> {
		const properties: unknown = Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES_ARRAY, Reflect.get(itemType, "prototype") as object);

		return new Set<string>((Array.isArray(properties) ? properties : []).filter((property: unknown): property is string => typeof property === "string" && property.startsWith(":")).map((property: string): string => property.slice(1)));
	}

	private static requireAllowedKeys(value: Record<string, unknown>, allowedKeys: ReadonlyArray<string>, context: string): void {
		const invalidKey: string | undefined = Object.keys(value).find((key: string): boolean => !allowedKeys.includes(key));

		if (invalidKey) {
			throw ErrorException(`${context} contains unsupported property "${invalidKey}"`);
		}
	}

	private static requireExactKeys(value: Record<string, unknown>, expectedKeys: ReadonlyArray<string>, context: string): void {
		const actualKeys: Array<string> = Object.keys(value).toSorted((left: string, right: string): number => left.localeCompare(right));
		const normalizedExpectedKeys: Array<string> = expectedKeys.toSorted((left: string, right: string): number => left.localeCompare(right));

		if (actualKeys.length !== normalizedExpectedKeys.length || actualKeys.some((key: string, index: number): boolean => key !== normalizedExpectedKeys[index])) {
			throw ErrorException(`${context} must contain exactly ${normalizedExpectedKeys.join(", ")}`);
		}
	}

	private static requireRecord(value: unknown, context: string): Record<string, unknown> {
		if (!value || typeof value !== "object" || Array.isArray(value)) {
			throw ErrorException(`${context} must be an object`);
		}

		return value as Record<string, unknown>;
	}

	private static sortRecord<T>(record: Record<string, T>, isCursor: boolean): Record<string, T> {
		return Object.fromEntries(Object.entries(record).toSorted(([left]: [string, T], [right]: [string, T]): number => this.compareStrings(left, right, isCursor)));
	}

	private static validateCursorCustomResponseDto<E>(routeConfig: TApiControllerPropertiesRoute<E, EApiRouteType.GET_LIST>, fields: ReadonlySet<string>, order: TApiControllerGetListQueryCompiledOrder): void {
		const responseDto: unknown = routeConfig.dto?.[EApiDtoType.RESPONSE];

		if (!responseDto) {
			return;
		}

		let itemType: Type<unknown> | undefined;

		if (typeof responseDto === "function") {
			const wrapperMetadata: Map<string | symbol, TManualDtoPropertyMetadata> = GetManualDtoPropertyMetadata(Reflect.get(responseDto, "prototype") as object);
			const itemsMetadata: TManualDtoPropertyMetadata | undefined = wrapperMetadata.get("items");
			const nextCursorMetadata: TManualDtoPropertyMetadata | undefined = wrapperMetadata.get("nextCursor");
			const previousCursorMetadata: TManualDtoPropertyMetadata | undefined = wrapperMetadata.get("previousCursor");

			if (
				wrapperMetadata.size !== CURSOR_RESPONSE_PROPERTY_COUNT ||
				itemsMetadata?.decorator !== EManualDtoPropertyMetadataDecorator.OBJECT ||
				nextCursorMetadata?.decorator !== EManualDtoPropertyMetadataDecorator.STRING ||
				previousCursorMetadata?.decorator !== EManualDtoPropertyMetadataDecorator.STRING ||
				!this.isManualRawResponseProperty(itemsMetadata, true, false) ||
				Array.isArray(itemsMetadata.properties.type) ||
				typeof itemsMetadata.properties.type !== "function" ||
				itemsMetadata.properties.type === Object ||
				!this.isCursorEnvelopeStringMetadata(nextCursorMetadata) ||
				!this.isCursorEnvelopeStringMetadata(previousCursorMetadata) ||
				this.hasPropertyAccessor(responseDto, "items") ||
				this.hasPropertyAccessor(responseDto, "nextCursor") ||
				this.hasPropertyAccessor(responseDto, "previousCursor")
			) {
				throw ErrorException("CURSOR GET_LIST custom response DTO must prove the flat raw cursor envelope through Automator property metadata");
			}

			itemType = itemsMetadata.properties.type as Type<unknown>;
		} else if (typeof responseDto === "object" && "itemType" in responseDto && typeof responseDto.itemType === "function") {
			itemType = responseDto.itemType as Type<unknown>;
		}

		if (!itemType) {
			throw ErrorException("CURSOR GET_LIST custom response DTO must expose a statically provable item type");
		}

		this.validateCursorItemDto(itemType, fields, order);
	}

	private static validateCursorItemDto(itemType: Type<unknown>, fields: ReadonlySet<string>, order: TApiControllerGetListQueryCompiledOrder): void {
		const itemMetadata: Map<string | symbol, TManualDtoPropertyMetadata> = GetManualDtoPropertyMetadata(Reflect.get(itemType, "prototype") as object);

		for (const fieldName of fields) {
			const field: TApiControllerGetListQueryCompiledOrderField | undefined = order.serverFields[fieldName];
			const metadata: TManualDtoPropertyMetadata | undefined = itemMetadata.get(fieldName);
			const fieldType: string | undefined = field?.type;
			const expectedDecorator: EManualDtoPropertyMetadataDecorator | undefined = field?.type !== EApiPropertyDescribeType.OBJECT && EnumIsValue(EManualDtoPropertyMetadataDecorator, fieldType) ? fieldType : undefined;
			const expectedFormat: unknown = field && "format" in field.metadata ? field.metadata.format : undefined;
			const actualFormat: unknown = metadata && "format" in metadata.properties ? metadata.properties.format : undefined;

			if (!field || !metadata || metadata.decorator !== expectedDecorator || !this.isManualRawResponseProperty(metadata, false, false) || actualFormat !== expectedFormat || this.hasPropertyAccessor(itemType, fieldName)) {
				throw ErrorException(`CURSOR GET_LIST custom item DTO must raw-expose protected field "${fieldName}" through compatible Automator property metadata`);
			}
		}
	}

	private static validateCursorPlan<E>(controller: Type<unknown>, entity: ObjectLiteral, entityMetadata: IApiEntity<E>, order: TApiControllerGetListQueryCompiledOrder, cursorFields: ReadonlyArray<string>, routeConfig: TApiControllerPropertiesRoute<E, EApiRouteType.GET_LIST>): void {
		const primaryFields: ReadonlySet<string> = new Set<string>(entityMetadata.columns.filter((column: IApiEntityColumn<E>): boolean => column.isPrimary).map((column: IApiEntityColumn<E>): string => String(column.name)));

		if (primaryFields.size === 0) {
			throw ErrorException("CURSOR GET_LIST requires a primary key");
		}

		if (order.isLegacy) {
			throw ErrorException("CURSOR GET_LIST requires explicit order configuration");
		}

		if (this.hasAfterLoadListener(entity)) {
			throw ErrorException("CURSOR GET_LIST entity cannot declare TypeORM after-load listeners");
		}

		const primaryFieldNames: string = [...primaryFields].join('", "');
		const tieBreakers: ReadonlyArray<IApiControllerGetListQueryPlanOrderEntry> = order.tieBreakers ?? [];
		const finalTieBreakers: ReadonlyArray<IApiControllerGetListQueryPlanOrderEntry> = tieBreakers.slice(-primaryFields.size);

		if (finalTieBreakers.length !== primaryFields.size || finalTieBreakers.some((entry: IApiControllerGetListQueryPlanOrderEntry): boolean => !primaryFields.has(entry.field))) {
			throw ErrorException(`CURSOR GET_LIST requires the complete primary key "${primaryFieldNames}" as the final explicit tie-breakers`);
		}

		if ((order.defaultOrder ?? []).some((entry: IApiControllerGetListQueryPlanOrderEntry): boolean => primaryFields.has(entry.field)) || tieBreakers.slice(0, -primaryFields.size).some((entry: IApiControllerGetListQueryPlanOrderEntry): boolean => primaryFields.has(entry.field)) || [...primaryFields].some((primaryField: string): boolean => order.fields[primaryField]?.isEnabled === true)) {
			throw ErrorException(`CURSOR GET_LIST primary key "${primaryFieldNames}" may appear only as the final tie-breakers`);
		}

		const potentialFields: Set<string> = new Set<string>(cursorFields);

		for (const fieldName of potentialFields) {
			const field: TApiControllerGetListQueryCompiledOrderField | undefined = order.serverFields[fieldName];

			if (this.isUnsafeCursorFieldName(fieldName)) {
				throw ErrorException(`CURSOR GET_LIST order field "${fieldName}" is not a safe stable object property name`);
			}

			if (!field || field.isNullable || ("isArray" in field.metadata && field.metadata.isArray === true)) {
				throw ErrorException(`CURSOR GET_LIST order field "${fieldName}" must be a described non-null direct scalar field`);
			}

			this.validateCursorStorageField(field);

			if (this.hasPropertyAccessor(entity, fieldName)) {
				throw ErrorException(`CURSOR GET_LIST order field "${fieldName}" must be a raw data property, not an accessor`);
			}

			this.validateCursorResponseExposure(controller, entityMetadata, fieldName);
		}

		this.validateCursorCustomResponseDto(routeConfig, potentialFields, order);
	}

	private static validateCursorResponseExposure<E>(controller: Type<unknown>, entityMetadata: IApiEntity<E>, fieldName: string): void {
		const column: IApiEntityColumn<E> | undefined = entityMetadata.columns.find((candidate: IApiEntityColumn<E>): boolean => String(candidate.name) === fieldName);
		const metadata: TApiPropertyDescribeProperties | undefined = column ? this.getPropertyMetadata(column) : undefined;

		if (!column || !metadata) {
			throw ErrorException(`Controller "${controller.name}" route "${EApiRouteType.GET_LIST}": CURSOR GET_LIST order field "${fieldName}" must be raw-exposed in the generated response`);
		}

		const effectiveResponse: TApiPropertyDescribeDtoProperties = DtoGetDecoratorConfig(EApiRouteType.GET_LIST, metadata, EApiDtoType.RESPONSE);

		if (effectiveResponse.guard || !DtoIsPropertyExposedInListResponse(fieldName, metadata, column.isPrimary)) {
			throw ErrorException(`Controller "${controller.name}" route "${EApiRouteType.GET_LIST}": CURSOR GET_LIST order field "${fieldName}" must be unconditionally raw-exposed in the generated response`);
		}
	}

	private static validateCursorStorageField(field: TApiControllerGetListQueryCompiledOrderField): void {
		// A date column may declare no type, as @CreateDateColumn does; the bootstrap check reads its storage from the driver.
		if ((field.columnType === "unknown" && (field.type !== EApiPropertyDescribeType.DATE || field.columnMode === "unknown")) || CURSOR_NON_PERSISTED_COLUMN_MODES.has(field.columnMode) || field.hasTransformer || field.isColumnArray || !field.isSelected) {
			throw ErrorException(`CURSOR GET_LIST order field "${field.path}" must be a selected persisted column without a transformer`);
		}

		if (field.isUnsigned) {
			throw ErrorException(`CURSOR GET_LIST order field "${field.path}" cannot use unsigned storage in PostgreSQL v1`);
		}

		if (field.type === EApiPropertyDescribeType.BOOLEAN) {
			if (!CURSOR_BOOLEAN_COLUMN_TYPES.has(field.columnType)) {
				throw ErrorException(`CURSOR GET_LIST boolean order field "${field.path}" requires PostgreSQL boolean storage`);
			}

			return;
		}

		if (field.type === EApiPropertyDescribeType.NUMBER) {
			if (!("format" in field.metadata) || field.metadata.format !== EApiPropertyNumberType.INTEGER) {
				throw ErrorException(`CURSOR GET_LIST numeric order field "${field.path}" supports only INTEGER metadata in PostgreSQL v1`);
			}

			if (!CURSOR_INTEGER_COLUMN_TYPES.has(field.columnType)) {
				throw ErrorException(`CURSOR GET_LIST integer order field "${field.path}" requires signed PostgreSQL int2/int4 storage`);
			}

			return;
		}

		if (field.type === EApiPropertyDescribeType.STRING) {
			const format: unknown = "format" in field.metadata ? field.metadata.format : undefined;

			if (format !== EApiPropertyStringType.BIGINT_STRING) {
				throw ErrorException(`CURSOR GET_LIST string order field "${field.path}" supports only BIGINT_STRING metadata in PostgreSQL v1`);
			}

			if (!CURSOR_BIGINT_COLUMN_TYPES.has(field.columnType)) {
				throw ErrorException(`CURSOR GET_LIST bigint-string order field "${field.path}" requires signed PostgreSQL int8 storage`);
			}

			return;
		}

		if (field.type === EApiPropertyDescribeType.ENUM) {
			const enumValues: ReadonlyArray<number | string> = EnumValues("enum" in field.metadata ? field.metadata.enum : {});

			if (enumValues.length === 0 || !enumValues.every((value: number | string): boolean => typeof value === "number" && Number.isSafeInteger(value))) {
				throw ErrorException(`CURSOR GET_LIST enum order field "${field.path}" requires safe numeric values in PostgreSQL v1`);
			}

			if (!CURSOR_ENUM_INTEGER_COLUMN_TYPES.has(field.columnType)) {
				throw ErrorException(`CURSOR GET_LIST enum order field "${field.path}" requires signed PostgreSQL int2/int4 storage`);
			}

			return;
		}

		if (field.type === EApiPropertyDescribeType.UUID) {
			if (!CURSOR_UUID_COLUMN_TYPES.has(field.columnType)) {
				throw ErrorException(`CURSOR GET_LIST UUID order field "${field.path}" requires native PostgreSQL UUID storage`);
			}

			return;
		}

		if (field.type === EApiPropertyDescribeType.DATE) {
			if (!("format" in field.metadata) || field.metadata.format !== EApiPropertyDateType.DATE_TIME) {
				throw ErrorException(`CURSOR GET_LIST date order field "${field.path}" supports only DATE_TIME metadata in PostgreSQL v1`);
			}

			if (typeof field.precision !== "number" || !Number.isInteger(field.precision) || field.precision < 0 || field.precision > CURSOR_TIMESTAMP_MAXIMUM_PRECISION) {
				throw ErrorException(`CURSOR GET_LIST date order field "${field.path}" requires a declared integer column precision from 0 to ${CURSOR_TIMESTAMP_MAXIMUM_PRECISION} so a JS Date round-trips exactly`);
			}

			return;
		}

		throw ErrorException(`CURSOR GET_LIST order field "${field.path}" is not supported by PostgreSQL CURSOR v1`);
	}

	/**
	 * Validates every table inheritance variant against the CURSOR order fields, because rows of any child are paged together.
	 * @template E - Entity type.
	 * @param {Type<unknown>} controller - Controller class, which a response exposure error names.
	 * @param {IApiEntity<E>} entityMetadata - Root entity metadata carrying the compiled table inheritance plan.
	 * @param {ReadonlyArray<string>} cursorFields - Order fields encoded in the cursor.
	 * @param {TApiControllerPropertiesRoute<E, EApiRouteType.GET_LIST>} routeConfig - GET_LIST route configuration.
	 * @returns {void}
	 */
	private static validateCursorTableInheritanceVariants<E>(controller: Type<unknown>, entityMetadata: IApiEntity<E>, cursorFields: ReadonlyArray<string>, routeConfig: TApiControllerPropertiesRoute<E, EApiRouteType.GET_LIST>): void {
		for (const variant of entityMetadata.tableInheritance?.variants ?? []) {
			if (this.hasAfterLoadListener(variant.entity)) {
				throw ErrorException(`CURSOR GET_LIST entity variant ${String(variant.entityMetadata.name)} cannot declare TypeORM after-load listeners`);
			}

			for (const fieldName of cursorFields) {
				if (this.hasPropertyAccessor(variant.entity, fieldName)) {
					throw ErrorException(`CURSOR GET_LIST order field "${fieldName}" must be a raw data property on entity variant ${String(variant.entityMetadata.name)}, not an accessor`);
				}

				if (!routeConfig.dto?.[EApiDtoType.RESPONSE]) {
					this.validateCursorResponseExposure(controller, variant.entityMetadata, fieldName);
				}
			}
		}
	}

	private static validateStaticValue(value: unknown, field: IApiControllerGetListQueryPlanFilterField, controller: Type<unknown>, label: string): void {
		let isValid: boolean;
		const fieldType: EApiPropertyDescribeType = field.type;

		if (fieldType === EApiPropertyDescribeType.OBJECT || fieldType === EApiPropertyDescribeType.RELATION) {
			throw ErrorException(`GET_LIST filter ${label} for "${field.path}" must target a scalar field`);
		}

		switch (fieldType) {
			case EApiPropertyDescribeType.BOOLEAN: {
				isValid = typeof value === "boolean";

				break;
			}

			case EApiPropertyDescribeType.DATE: {
				const dateFormat: EApiPropertyDateType = field.metadata.type === EApiPropertyDescribeType.DATE ? field.metadata.format : EApiPropertyDateType.DATE_TIME;
				const isDateTime: boolean = dateFormat === EApiPropertyDateType.DATE_TIME;

				// A Date is a server-side instant; text follows the published client form of the format.
				if ((isDateTime && value instanceof Date && !Number.isNaN(value.getTime())) || IsDateFormatValue(value, dateFormat)) {
					return;
				}

				throw ErrorException(`Controller "${controller.name}" route "${EApiRouteType.GET_LIST}": GET_LIST filter ${label} for "${field.path}" must be ${isDateTime ? "a Date or a UTC instant" : "text"} in ${PROPERTY_DATE_DECORATOR_API_CONSTANT.TEMPLATE[dateFormat]} format`);
			}

			case EApiPropertyDescribeType.ENUM: {
				const enumValues: ReadonlyArray<number | string> = EnumValues("enum" in field.metadata ? field.metadata.enum : {});

				isValid = (typeof value === "number" || typeof value === "string") && enumValues.includes(value);

				break;
			}

			case EApiPropertyDescribeType.NUMBER: {
				const isIntegerRequired: boolean = "format" in field.metadata && field.metadata.format === EApiPropertyNumberType.INTEGER;

				isValid = typeof value === "number" && Number.isFinite(value) && (!isIntegerRequired || Number.isInteger(value));

				break;
			}

			case EApiPropertyDescribeType.STRING: {
				isValid = typeof value === "string";

				break;
			}

			case EApiPropertyDescribeType.UUID: {
				isValid = typeof value === "string" && /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/iu.test(value);

				break;
			}
		}

		if (!isValid) {
			throw ErrorException(`GET_LIST filter ${label} for "${field.path}" has an invalid typed value`);
		}
	}

	private static validateUnlistedFields(value: EApiControllerGetListQueryUnlistedFields, section: string): void {
		if (!EnumIsValue(EApiControllerGetListQueryUnlistedFields, value)) {
			throw ErrorException(`GET_LIST ${section} requires unlistedFields INHERIT or REJECT`);
		}
	}

	/**
	 * Runs a rule shared with plain fields, whose error names only the field, so that its error also names the controller and the route.
	 * @param {string} context - What the error names first.
	 * @param {() => T} step - The rule.
	 * @returns {T} What the rule returns.
	 * @template T - What the rule returns.
	 */
	private static withRouteInError<T>(context: string, step: () => T): T {
		try {
			return step();
		} catch (error: unknown) {
			const message: string = (error as Error).message;

			throw message.includes(context) ? (error as Error) : ErrorException(`${context}: ${message.slice(message.indexOf("] ") + "] ".length)}`);
		}
	}
}
