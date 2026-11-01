import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerTableInheritancePlan, IApiControllerTableInheritanceVariant } from "@interface/class/api/controller/table-inheritance";
import type { IApiControllerProperties } from "@interface/decorator/api";
import type { IApiEntity, IApiEntityColumn } from "@interface/entity";
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
			// eslint-disable-next-line @elsikora/typescript/no-unsafe-function-type
			.filter((child: Function): boolean => !plan.childEntities.includes(child))
			// eslint-disable-next-line @elsikora/typescript/no-unsafe-function-type
			.map((child: Function): string => child.name)
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
		// eslint-disable-next-line @elsikora/typescript/no-unsafe-function-type
		const root: Function | undefined = typeof properties.entity === "function" ? properties.entity : undefined;
		const inheritance: InheritanceMetadataArgs | undefined = root ? getMetadataArgsStorage().inheritances.find(({ target }: InheritanceMetadataArgs): boolean => target === root) : undefined;
		const hasGeneratedReadResponse: boolean = [EApiRouteType.GET, EApiRouteType.GET_LIST].some((method: EApiRouteType): boolean => properties.routes[method]?.generation?.isEnabled !== false && !properties.routes[method]?.dto?.[EApiDtoType.RESPONSE]);

		if (!root || inheritance?.pattern !== "STI" || !hasGeneratedReadResponse) {
			return undefined;
		}

		// eslint-disable-next-line @elsikora/typescript/no-unsafe-function-type
		const childEntities: Array<Function> = this.findChildEntities(root);
		const discriminatorPropertyName: string = inheritance.column?.name ?? "type";

		if (childEntities.length === 0) {
			return { childEntities, discriminatorPropertyName, rootEntity: root, variants: [] };
		}

		const discriminatorColumn: IApiEntityColumn<E> | undefined = entityMetadata.columns.find((column: IApiEntityColumn<E>): boolean => column.name === discriminatorPropertyName);

		if (!discriminatorColumn?.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY]) {
			throw ErrorException(`Table inheritance root ${root.name} must declare and describe its discriminator column "${discriminatorPropertyName}"`);
		}

		const storableValues: ReadonlyArray<unknown> | undefined = this.resolveStorableValues(root, inheritance, discriminatorPropertyName);
		const variants: Array<IApiControllerTableInheritanceVariant> = [];

		for (const candidate of [root, ...childEntities]) {
			// eslint-disable-next-line @elsikora/typescript/no-unsafe-function-type
			const isLeaf: boolean = candidate !== root && !childEntities.some((child: Function): boolean => (child.prototype as object) instanceof candidate);
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
		const suffixOwners: Map<string, string> = new Map<string, string>();

		for (const { discriminatorValue } of sortedVariants) {
			const suffix: string = CamelCaseString(discriminatorValue);
			const owner: string | undefined = suffixOwners.get(suffix);

			if (suffix === "" || owner !== undefined) {
				throw ErrorException(`Discriminator values of ${root.name} must produce unique non-empty DTO name suffixes, "${discriminatorValue}" conflicts with "${owner ?? ""}"`);
			}

			suffixOwners.set(suffix, discriminatorValue);
		}

		return { childEntities, discriminatorPropertyName, rootEntity: root, variants: sortedVariants };
	}

	// eslint-disable-next-line @elsikora/typescript/no-unsafe-function-type
	private static findChildEntities(root: Function): Array<Function> {
		return (
			getMetadataArgsStorage()
				.tables.filter(({ target, type }: TableMetadataArgs): boolean => type === "entity-child" && typeof target === "function" && (target.prototype as object) instanceof root)
				// eslint-disable-next-line @elsikora/typescript/no-unsafe-function-type
				.map(({ target }: TableMetadataArgs): Function => target as Function)
		);
	}

	// eslint-disable-next-line @elsikora/typescript/no-unsafe-function-type
	private static resolveDiscriminatorValue(entity: Function): unknown {
		const discriminatorValue: DiscriminatorValueMetadataArgs | undefined = getMetadataArgsStorage().discriminatorValues.find(({ target }: DiscriminatorValueMetadataArgs): boolean => target === entity);

		return discriminatorValue ? discriminatorValue.value : entity.name;
	}

	// eslint-disable-next-line @elsikora/typescript/no-unsafe-function-type
	private static resolveStorableValues(root: Function, inheritance: InheritanceMetadataArgs, discriminatorPropertyName: string): ReadonlyArray<unknown> | undefined {
		const column: ColumnMetadataArgs | undefined = getMetadataArgsStorage().columns.find(({ propertyName, target }: ColumnMetadataArgs): boolean => propertyName === discriminatorPropertyName && typeof target === "function" && (target === root || (root.prototype as object) instanceof target));
		const columnEnum: unknown = column?.options.enum ?? inheritance.column?.enum;

		if (!columnEnum) {
			return undefined;
		}

		if (Array.isArray(columnEnum)) {
			return columnEnum as ReadonlyArray<unknown>;
		}

		return Object.entries(columnEnum as Record<string, unknown>)
			.filter(([key]: [string, unknown]): boolean => Number.isNaN(Number(key)))
			.map(([, value]: [string, unknown]): unknown => value);
	}
}
