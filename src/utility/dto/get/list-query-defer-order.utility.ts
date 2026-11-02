import type { IApiEntity } from "@interface/entity";
import type { Type } from "@nestjs/common";
import type { ApiPropertyOptions } from "@nestjs/swagger";

import { EFilterOrderDirection } from "@enum/filter";
import { AllOrNoneOfListedPropertiesValidator } from "@validator/all-or-none-of-listed-properties.validator";
import { Validate, ValidateBy, ValidateIf } from "class-validator";

// The name @nestjs/swagger reads lazy property metadata from when it builds the document, once every class is loaded.
const SWAGGER_METADATA_FACTORY_NAME: string = "_OPENAPI_METADATA_FACTORY";

/**
 * Declares orderBy and orderDirection of a list query DTO from fields that are read on first use, for a list response whose lazy types may name classes that do not exist yet.
 * The document and the validation match the eager order decorators of the same DTO, including the route that has no orderable field: it documents no order and refuses any it receives.
 * @template E - The entity type
 * @param {Type<unknown>} dto - The list query DTO base class.
 * @param {IApiEntity<E>} entityMetadata - The entity metadata, which names the documented parameters.
 * @param {() => Record<string, string>} resolveOrderBy - Reads the orderable fields of the route.
 * @returns {void}
 */
export function DtoGetListQueryDeferOrder<E>(dto: Type<unknown>, entityMetadata: IApiEntity<E>, resolveOrderBy: () => Record<string, string>): void {
	const orderDirectionValues: Record<string, string> = { ...EFilterOrderDirection };
	const prototype: object = Reflect.get(dto, "prototype") as object;

	const createOptions = (description: string, values: Record<string, string>): ApiPropertyOptions => ({
		description: `${String(entityMetadata.name)} ${description}`,
		enum: values,
		example: Object.values(values)[0],
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		nullable: false,
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		required: false,
	});

	const readMetadata = (): Record<string, ApiPropertyOptions> => {
		const orderBy: Record<string, string> = resolveOrderBy();

		return Object.keys(orderBy).length > 0 ? { orderBy: createOptions("order by field", orderBy), orderDirection: createOptions("order direction", orderDirectionValues) } : {};
	};

	// @nestjs/swagger also calls this factory while any property decorator of the DTO runs, to read that property's type, so only listing the keys or reading an order property may read the response fields.
	Reflect.defineProperty(dto, SWAGGER_METADATA_FACTORY_NAME, {
		value: (): Record<string, ApiPropertyOptions> =>
			new Proxy<Record<string, ApiPropertyOptions>>(
				{},
				{
					get: (_target: Record<string, ApiPropertyOptions>, key: string | symbol): ApiPropertyOptions | undefined => (key === "orderBy" || key === "orderDirection" ? readMetadata()[key] : undefined),
					getOwnPropertyDescriptor: (_target: Record<string, ApiPropertyOptions>, key: string | symbol): PropertyDescriptor | undefined => Reflect.getOwnPropertyDescriptor(readMetadata(), key),
					ownKeys: (): Array<string | symbol> => Reflect.ownKeys(readMetadata()),
				},
			),
	});

	for (const [property, resolveValues] of [
		["orderBy", resolveOrderBy],
		["orderDirection", (): Record<string, string> => (Object.keys(resolveOrderBy()).length > 0 ? orderDirectionValues : {})],
	] as const) {
		ValidateIf((_object: object, value: unknown): boolean => value !== undefined)(prototype, property);
		ValidateBy({
			name: "isDeferredOrderValue",
			validator: {
				defaultMessage: (): string => {
					const values: Array<string> = Object.values(resolveValues());

					return values.length > 0 ? `${property} must be one of the following values: ${values.join(", ")}` : `${property} is not accepted because no field of this route is orderable`;
				},
				validate: (value: unknown): boolean => Object.values(resolveValues()).includes(value as string),
			},
		})(prototype, property);
	}

	// class-validator drops an inherited validator on a property the derived class also validates, and the generated DTO validates "object", so the pair check has a property of its own.
	ValidateIf((): boolean => Object.keys(resolveOrderBy()).length > 0)(prototype, "orderPair");
	Validate(AllOrNoneOfListedPropertiesValidator, ["orderBy", "orderDirection"], { message: "INVALID_ORDER" })(prototype, "orderPair");
}
