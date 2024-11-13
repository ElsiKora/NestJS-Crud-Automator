import type { IApiEntity } from "../../interface";
import type { TApiPropertyDescribeProperties } from "../../type";

import { ApiPropertyString } from "../../decorator";
import { EApiPropertyDataType, EApiPropertyDescribeType } from "../../enum";
import {
	EFilterOperationBoolean,
	EFilterOperationDate,
	EFilterOperationNumber,
} from "../../enum/filter-operation.enum";
import { ErrorException } from "../error-exception.utility";

export function DtoGenerateFilterDecorator<E>(metadata: TApiPropertyDescribeProperties, entity: IApiEntity<E>): PropertyDecorator {
	switch (metadata.type) {
		case EApiPropertyDescribeType.BOOLEAN: {
			// eslint-disable-next-line @elsikora-typescript/no-non-null-assertion
			return ApiPropertyString({ description: metadata.description, entity, enum: EFilterOperationBoolean, enumName: "EFilterOperationBoolean", example: EFilterOperationBoolean.EQ, format: EApiPropertyDataType.STRING, pattern: "/^[a-zA-Zа-яА-Я0-9. ]{8,64}$/", required: false, type: EApiPropertyDataType.STRING });
		}

		case EApiPropertyDescribeType.DATE: {
			// @ts-ignore
			// eslint-disable-next-line @elsikora-typescript/no-non-null-assertion
			return ApiPropertyString({ entity, enum: EFilterOperationDate, enumName: "EFilterOperationBoolean", example: EFilterOperationDate.BETWEEN, format: EApiPropertyDataType.STRING, pattern: "/^[a-zA-Zа-яА-Я0-9. ]{8,64}$/", required: false, type: EApiPropertyDataType.STRING });
		}

		case EApiPropertyDescribeType.NUMBER: {
			// @ts-ignore
			// eslint-disable-next-line @elsikora-typescript/no-non-null-assertion
			return ApiPropertyString({ description: metadata.description, entity, enum: EFilterOperationNumber, enumName: "EFilterOperationBoolean", example: EFilterOperationNumber.GT, format: EApiPropertyDataType.STRING, pattern: "/^[a-zA-Zа-яА-Я0-9. ]{8,64}$/", required: false, type: EApiPropertyDataType.STRING });
		}

		default: {
			throw ErrorException(`Unknown property type ${metadata.type}`);
		}
	}
}
