import type { IApiEntity } from "../../interface";
import type { TApiPropertyDescribeProperties } from "../../type";

import { ApiPropertyEnum } from "../../decorator/api/property/enum.decorator";
import { EApiPropertyDescribeType } from "../../enum";
import {
	EFilterOperationBoolean,
	EFilterOperationDate, EFilterOperationEnum,
	EFilterOperationNumber, EFilterOperationObject,
	EFilterOperationRelation, EFilterOperationString, EFilterOperationUuid
} from "../../enum/filter-operation.enum";

export function DtoGenerateFilterDecorator<E>(metadata: TApiPropertyDescribeProperties, entity: IApiEntity<E>): PropertyDecorator {
	switch (metadata.type) {
		case EApiPropertyDescribeType.BOOLEAN: {
			return ApiPropertyEnum({ description: metadata.description, entity, enum: EFilterOperationBoolean, enumName: "EFilterOperationBoolean", isRequired: false });
		}

		case EApiPropertyDescribeType.DATE: {
			// @ts-ignore

			return ApiPropertyEnum({ entity, enum: EFilterOperationDate, enumName: "EFilterOperationDate", isRequired: false });
		}

		case EApiPropertyDescribeType.ENUM: {
			return ApiPropertyEnum({ description: metadata.description, entity, enum: EFilterOperationEnum, enumName: "EFilterOperationEnum", isRequired: false });
		}

		case EApiPropertyDescribeType.NUMBER: {
			// @ts-ignore

			return ApiPropertyEnum({ description: metadata.description, entity, enum: EFilterOperationNumber, enumName: "EFilterOperationNumber", isRequired: false });
		}

		case EApiPropertyDescribeType.OBJECT: {
			return ApiPropertyEnum({ description: metadata.description, entity, enum: EFilterOperationObject, enumName: "EFilterOperationObject", isRequired: false });
		}

		case EApiPropertyDescribeType.RELATION: {
			return ApiPropertyEnum({ description: metadata.description, entity, enum: EFilterOperationRelation, enumName: "EFilterOperationRelation", isRequired: false });
		}

		case EApiPropertyDescribeType.STRING: {
			return ApiPropertyEnum({ description: metadata.description, entity, enum: EFilterOperationString, enumName: "EFilterOperationString", isRequired: false });
		}

		case EApiPropertyDescribeType.UUID: {
			return ApiPropertyEnum({ description: metadata.description, entity, enum: EFilterOperationUuid, enumName: "EFilterOperationUuid", isRequired: false });
		}
	}
}
