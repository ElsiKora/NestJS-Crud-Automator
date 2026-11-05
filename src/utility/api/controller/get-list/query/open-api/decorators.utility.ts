import type { EFilterOperation } from "@enum/filter";
import type { IApiControllerGetListQueryPlan } from "@interface/class/api/controller/get-list/query";
import type { TSwaggerSchemaObject } from "@type/swagger";

import { FILTER_OPERATOR_REGISTRY_CONSTANT } from "@constant/filter";
import { DTO_GENERATE_CONSTANT } from "@constant/utility/dto/generate.constant";
import { EApiControllerGetListQueryFilterMissingBehavior } from "@enum/decorator/api";
import { EFilterOperand } from "@enum/filter";
import { ApiQuery } from "@nestjs/swagger";

import { ApiControllerGetListQueryOpenApiValueSchema } from "./value-schema.utility";

/**
 * Builds deep-object OpenAPI query decorators from a normalized GET_LIST query plan.
 * @param {IApiControllerGetListQueryPlan} plan - Immutable query plan shared with DTO generation and runtime parsing.
 * @returns {Array<MethodDecorator>} Method decorators for enabled typed filter fields.
 */
export function ApiControllerGetListQueryOpenApiDecorators(plan: IApiControllerGetListQueryPlan): Array<MethodDecorator> {
	if (plan.filter.isLegacy) {
		return [];
	}

	const decorators: Array<MethodDecorator> = [];

	for (const field of Object.values(plan.filter.fields)) {
		if (!field.isEnabled) {
			continue;
		}

		const valueSchema: TSwaggerSchemaObject = ApiControllerGetListQueryOpenApiValueSchema(field.metadata);

		const branches: Array<TSwaggerSchemaObject> = field.allowedOperations.map((operation: EFilterOperation): TSwaggerSchemaObject => {
			const operand: EFilterOperand = FILTER_OPERATOR_REGISTRY_CONSTANT.OPERATORS[operation].operand;

			const properties: Record<string, TSwaggerSchemaObject> = {
				operator: {
					enum: [operation],
					type: "string",
				},
			};
			const required: Array<string> = ["operator"];

			if (operand === EFilterOperand.VALUE) {
				properties.value = valueSchema;
				required.push("value");
			}

			if (operand === EFilterOperand.VALUES || operand === EFilterOperand.PAIR) {
				properties.values = {
					items: valueSchema,
					maxItems: operand === EFilterOperand.PAIR ? FILTER_OPERATOR_REGISTRY_CONSTANT.PAIR_OPERAND_COUNT : (field.maxValues ?? DTO_GENERATE_CONSTANT.MAXIMUM_FILTER_PROPERTIES),
					minItems: operand === EFilterOperand.PAIR ? FILTER_OPERATOR_REGISTRY_CONSTANT.PAIR_OPERAND_COUNT : FILTER_OPERATOR_REGISTRY_CONSTANT.VALUES_MINIMUM_OPERAND_COUNT,
					type: "array",
				};
				required.push("values");
			}

			const additionalPropertiesKey: keyof TSwaggerSchemaObject = "additionalProperties";

			const branch: TSwaggerSchemaObject = {
				[additionalPropertiesKey]: false,
				properties,
				required,
				type: "object",
			};

			return branch;
		});

		const explodeKey: keyof Parameters<typeof ApiQuery>[0] = "explode";
		const requiredKey: keyof Parameters<typeof ApiQuery>[0] = "required";

		const options: Parameters<typeof ApiQuery>[0] = {
			[explodeKey]: true,
			name: field.path,
			[requiredKey]: field.missingBehavior === EApiControllerGetListQueryFilterMissingBehavior.REJECT,
			schema: {
				oneOf: branches,
			},
			style: "deepObject",
		};

		decorators.push(ApiQuery(options));
	}

	return decorators;
}
