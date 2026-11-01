import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerTableInheritancePlan, IApiControllerTableInheritanceVariant } from "@interface/class/api/controller/table-inheritance";
import type { IApiControllerProperties } from "@interface/decorator/api";
import type { IApiEntity, IApiEntityColumn } from "@interface/entity";
import type { Type } from "@nestjs/common";
import type { ColumnMetadataArgs } from "typeorm/metadata-args/ColumnMetadataArgs";
import type { DiscriminatorValueMetadataArgs } from "typeorm/metadata-args/DiscriminatorValueMetadataArgs";
import type { InheritanceMetadataArgs } from "typeorm/metadata-args/InheritanceMetadataArgs";
import type { TableMetadataArgs } from "typeorm/metadata-args/TableMetadataArgs";

import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import { CamelCaseString } from "@utility/camel-case-string.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { getMetadataArgsStorage } from "typeorm";

const TABLE_INHERITANCE_NUMERIC_COLUMN_TYPES: ReadonlySet<string> = new Set<string>(["bigint", "dec", "decimal", "double", "double precision", "fixed", "float", "float4", "float8", "int", "int2", "int4", "int8", "integer", "mediumint", "money", "number", "numeric", "real", "smallint", "tinyint", "unsigned big int"]);
const OPEN_API_COMPONENT_NAME_PATTERN: RegExp = /^[\w.-]+$/;

export class ApiControllerTableInheritancePlanCompiler {
	/**
	 * Fails startup when a child entity was loaded after the controller was decorated,
	 * because that variant would be missing from Swagger and response serialization.
	 * Runs from the controller constructor: Nest resolves constructor and property dependencies first,
	 * so the data source has loaded its entities, and Swagger has not been generated yet.
	 * @param {string} controllerName - Controller class name.
	 * @param {IApiControllerTableInheritancePlan | undefined} plan - Variants compiled at decoration time.
	 * @returns {void}
	 */
	public static assertChildEntitiesLoaded(controllerName: string, plan: IApiControllerTableInheritancePlan | undefined): void {
		if (!plan) {
			return;
		}

		const missingChildEntities: Array<string> = this.findChildEntities(plan.rootEntity)
			.filter((child: Type<unknown>): boolean => !plan.childEntities.includes(child))
			.map((child: Type<unknown>): string => child.name)
			.toSorted((left: string, right: string): number => (left < right ? -1 : 1));

		if (missingChildEntities.length > 0) {
			throw ErrorException(`Controller ${controllerName} was decorated before child entities ${missingChildEntities.join(", ")} were loaded. Import the child entity files before the controller so every variant reaches Swagger and response serialization.`);
		}
	}

	/**
	 * Compiles the response variants of a single-table-inheritance root from TypeORM metadata.
	 * @template E - Entity type owned by the controller.
	 * @param {IApiControllerProperties<E>} properties - Controller configuration.
	 * @param {IApiEntity<E>} entityMetadata - Root entity metadata.
	 * @returns {IApiControllerTableInheritancePlan | undefined} Compiled plan, or undefined when no generated read response can be polymorphic.
	 */
	public static compile<E extends IApiBaseEntity>(properties: IApiControllerProperties<E>, entityMetadata: IApiEntity<E>): IApiControllerTableInheritancePlan | undefined {
		const root: Type<unknown> | undefined = this.isConstructor(properties.entity) ? properties.entity : undefined;
		const inheritance: InheritanceMetadataArgs | undefined = root ? getMetadataArgsStorage().inheritances.find(({ target }: InheritanceMetadataArgs): boolean => target === root) : undefined;
		const hasGeneratedReadResponse: boolean = [EApiRouteType.GET, EApiRouteType.GET_LIST].some((method: EApiRouteType): boolean => properties.routes[method]?.generation?.isEnabled !== false && !properties.routes[method]?.dto?.[EApiDtoType.RESPONSE]);

		if (!root || inheritance?.pattern !== "STI" || !hasGeneratedReadResponse) {
			return undefined;
		}

		const childEntities: Array<Type<unknown>> = this.findChildEntities(root);
		const discriminatorPropertyName: string = inheritance.column?.name ?? "type";

		if (childEntities.length === 0) {
			return { childEntities, discriminatorPropertyName, rootEntity: root, variants: [] };
		}

		const discriminatorColumn: IApiEntityColumn<E> | undefined = entityMetadata.columns.find((column: IApiEntityColumn<E>): boolean => column.name === discriminatorPropertyName);

		if (!discriminatorColumn?.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY]) {
			throw ErrorException(`Table inheritance root ${root.name} must declare and describe its discriminator column "${discriminatorPropertyName}"`);
		}

		const columnOptions: ColumnMetadataArgs["options"] = { ...inheritance.column, ...this.findDiscriminatorColumn(root, discriminatorPropertyName)?.options };

		if (columnOptions.select === false) {
			throw ErrorException(`Table inheritance root ${root.name} must select its discriminator column "${discriminatorPropertyName}", remove select: false`);
		}

		const reflectedType: unknown = Reflect.getMetadata("design:type", root.prototype as object, discriminatorPropertyName);

		if (this.isNumericColumnType(columnOptions.type ?? reflectedType)) {
			throw ErrorException(`Table inheritance root ${root.name} must store its discriminator column "${discriminatorPropertyName}" as a string, generated polymorphic responses support string discriminator values only`);
		}

		const storableValues: ReadonlyArray<unknown> | undefined = this.resolveStorableValues(columnOptions.enum);
		const variants: Array<IApiControllerTableInheritanceVariant> = [];

		for (const candidate of [root, ...childEntities]) {
			const isLeaf: boolean = candidate !== root && !childEntities.some((child: Type<unknown>): boolean => child.prototype instanceof candidate);
			const discriminatorValue: unknown = this.resolveDiscriminatorValue(candidate);
			const isStorable: boolean = !storableValues || storableValues.includes(discriminatorValue);

			if (isLeaf && !isStorable) {
				throw ErrorException(`Child entity ${candidate.name} discriminator value is not in the "${discriminatorPropertyName}" column enum of ${root.name}`);
			}

			if (isStorable) {
				if (typeof discriminatorValue !== "string" || discriminatorValue === "") {
					throw ErrorException(`Generated polymorphic responses require a non-empty string discriminator value on ${candidate.name}`);
				}

				variants.push({ discriminatorValue, entity: candidate, entityMetadata: GenerateEntityInformation<unknown>(candidate) });
			}
		}

		const sortedVariants: Array<IApiControllerTableInheritanceVariant> = variants.toSorted((left: IApiControllerTableInheritanceVariant, right: IApiControllerTableInheritanceVariant): number => (left.discriminatorValue < right.discriminatorValue ? -1 : 1));

		this.assertVariantNames(root, String(entityMetadata.name), sortedVariants);

		return { childEntities, discriminatorPropertyName, rootEntity: root, variants: sortedVariants };
	}

	/**
	 * Rejects discriminator values whose DTO name suffix is empty, repeated, not a valid OpenAPI component name,
	 * or turns a GET_LIST variant into the name of the list wrapper.
	 * @param {Type<unknown>} root - Table inheritance root class.
	 * @param {string} rootName - Root entity name that prefixes every generated DTO name.
	 * @param {ReadonlyArray<IApiControllerTableInheritanceVariant>} variants - Variants sorted by discriminator value.
	 * @returns {void}
	 */
	private static assertVariantNames(root: Type<unknown>, rootName: string, variants: ReadonlyArray<IApiControllerTableInheritanceVariant>): void {
		const listNamePrefix: string = `${rootName}${CamelCaseString(EApiRouteType.GET_LIST)}${CamelCaseString(EApiDtoType.RESPONSE)}`;
		const suffixOwners: Map<string, string> = new Map<string, string>();

		for (const { discriminatorValue } of variants) {
			const suffix: string = CamelCaseString(discriminatorValue);
			const owner: string | undefined = suffixOwners.get(suffix);

			if (suffix === "" || owner !== undefined) {
				throw ErrorException(`Discriminator values of ${root.name} must produce unique non-empty DTO name suffixes, "${discriminatorValue}" conflicts with "${owner ?? ""}"`);
			}

			if (!OPEN_API_COMPONENT_NAME_PATTERN.test(suffix)) {
				throw ErrorException(`Discriminator value "${discriminatorValue}" of ${root.name} produces the DTO name suffix "${suffix}", which is not a valid OpenAPI component name`);
			}

			if (`${listNamePrefix}${suffix}DTO` === `${listNamePrefix}ItemsDTO`) {
				throw ErrorException(`Discriminator value "${discriminatorValue}" of ${root.name} produces the DTO name ${listNamePrefix}ItemsDTO, which is the generated GET_LIST wrapper name`);
			}

			suffixOwners.set(suffix, discriminatorValue);
		}
	}

	/**
	 * Lists the `@ChildEntity` classes that extend the root, in TypeORM registration order.
	 * @param {Type<unknown>} root - Table inheritance root class.
	 * @returns {Array<Type<unknown>>} Child entity classes known to TypeORM so far.
	 */
	private static findChildEntities(root: Type<unknown>): Array<Type<unknown>> {
		return getMetadataArgsStorage()
			.tables.map(({ target, type }: TableMetadataArgs): Type<unknown> | undefined => (type === "entity-child" && this.isConstructor(target) && target.prototype instanceof root ? target : undefined))
			.filter((target: Type<unknown> | undefined): target is Type<unknown> => target !== undefined);
	}

	/**
	 * Finds the column declaration of the discriminator on the root or one of its ancestors.
	 * @param {Type<unknown>} root - Table inheritance root class.
	 * @param {string} discriminatorPropertyName - Discriminator property name.
	 * @returns {ColumnMetadataArgs | undefined} Column declaration, or undefined when only the inheritance options declare it.
	 */
	private static findDiscriminatorColumn(root: Type<unknown>, discriminatorPropertyName: string): ColumnMetadataArgs | undefined {
		return getMetadataArgsStorage().columns.find(({ propertyName, target }: ColumnMetadataArgs): boolean => propertyName === discriminatorPropertyName && this.isConstructor(target) && (target === root || root.prototype instanceof target));
	}

	/**
	 * Narrows a TypeORM metadata target to a class.
	 * TypeORM types targets as `Function | string`, and an abstract class has no construct signature at runtime either way.
	 * @param {unknown} target - Metadata target.
	 * @returns {boolean} Whether the target is a class.
	 */
	private static isConstructor(target: unknown): target is Type<unknown> {
		return typeof target === "function";
	}

	/**
	 * Tells whether a TypeORM column type stores numbers.
	 * @param {unknown} columnType - Column type option, or the reflected property type when the option is omitted.
	 * @returns {boolean} Whether the column stores numbers.
	 */
	private static isNumericColumnType(columnType: unknown): boolean {
		if (typeof columnType === "function") {
			return columnType === Number;
		}

		return typeof columnType === "string" && TABLE_INHERITANCE_NUMERIC_COLUMN_TYPES.has(columnType.toLowerCase());
	}

	/**
	 * Resolves the discriminator value TypeORM stores for an entity class.
	 * @param {Type<unknown>} entity - Root or child entity class.
	 * @returns {unknown} The `@ChildEntity` value, or the class name that TypeORM uses without one.
	 */
	private static resolveDiscriminatorValue(entity: Type<unknown>): unknown {
		const discriminatorValue: DiscriminatorValueMetadataArgs | undefined = getMetadataArgsStorage().discriminatorValues.find(({ target }: DiscriminatorValueMetadataArgs): boolean => target === entity);

		return discriminatorValue ? discriminatorValue.value : entity.name;
	}

	/**
	 * Resolves the values an enum discriminator column can store.
	 * @param {ColumnMetadataArgs["options"]["enum"]} columnEnum - Enum option of the discriminator column.
	 * @returns {ReadonlyArray<unknown> | undefined} Storable values, or undefined when the column has no enum.
	 */
	private static resolveStorableValues(columnEnum: ColumnMetadataArgs["options"]["enum"]): ReadonlyArray<unknown> | undefined {
		if (!columnEnum) {
			return undefined;
		}

		if (Array.isArray(columnEnum)) {
			return columnEnum;
		}

		// A numeric TypeScript enum also maps each value back to its key, and those reverse keys are not storable values.
		return Object.entries(columnEnum)
			.filter(([key]: [string, unknown]): boolean => Number.isNaN(Number(key)))
			.map(([, value]: [string, unknown]): unknown => value);
	}
}
