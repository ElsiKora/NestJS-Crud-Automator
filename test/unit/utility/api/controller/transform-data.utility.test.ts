import type { IApiControllerProperties } from "@interface/decorator/api";

import { TRANSFORMER_VALUE_DTO_CONSTANT } from "@constant/dto";
import { EApiControllerRequestTransformerType, EApiDtoType } from "@enum/decorator/api";
import { ApiControllerTransformData } from "@utility/api/controller/transform-data.utility";
import { InternalServerErrorException } from "@nestjs/common";
import { describe, expect, it } from "vitest";

class TransformEntity {
	public id?: string;
	public name?: string;
	public user?: unknown;
	public signature?: string;
	public timestamp?: string;
	public userAgent?: string;
}

const properties: IApiControllerProperties<TransformEntity> = {
	entity: TransformEntity,
	routes: {},
};

describe("ApiControllerTransformData", () => {
	it("applies static and dynamic transformers to body data", () => {
		const body = { name: "initial", user: undefined };
		const transformers = {
			[EApiDtoType.BODY]: [
				{ key: "name", type: EApiControllerRequestTransformerType.STATIC, value: "static" },
				{ key: "user", type: EApiControllerRequestTransformerType.DYNAMIC, value: TRANSFORMER_VALUE_DTO_CONSTANT.AUTHORIZED_ENTITY },
			],
		};

		ApiControllerTransformData(transformers as never, properties, { body }, { authenticationRequest: { user: { id: "user" } }, headers: {}, ip: "127.0.0.1" });

		expect(body.name).toBe("static");
		expect(body.user).toEqual({ id: "user" });
	});

	it("applies dynamic request headers and IP transformers", () => {
		const body: TransformEntity = { id: undefined, name: "payload", signature: undefined, timestamp: undefined, userAgent: undefined };
		const transformers = {
			[EApiDtoType.BODY]: [
				{ key: "signature", type: EApiControllerRequestTransformerType.DYNAMIC, value: TRANSFORMER_VALUE_DTO_CONSTANT.REQUEST_SIGNATURE },
				{ key: "timestamp", type: EApiControllerRequestTransformerType.DYNAMIC, value: TRANSFORMER_VALUE_DTO_CONSTANT.REQUEST_TIMESTAMP },
				{ key: "userAgent", type: EApiControllerRequestTransformerType.DYNAMIC, value: TRANSFORMER_VALUE_DTO_CONSTANT.REQUEST_USER_AGENT },
				{ key: "id", type: EApiControllerRequestTransformerType.DYNAMIC, value: TRANSFORMER_VALUE_DTO_CONSTANT.REQUEST_IP, shouldSetValueEvenIfMissing: true },
			],
		};

		ApiControllerTransformData(
			transformers as never,
			properties,
			{ body },
			{
				headers: { "x-signature": "sig", "x-timestamp": "ts", "user-agent": "agent" },
				ip: "127.0.0.1",
			},
		);

		expect(body.signature).toBe("sig");
		expect(body.timestamp).toBe("ts");
		expect(body.userAgent).toBe("agent");
		expect(body.id).toBe("127.0.0.1");
	});

	it("throws when required dynamic data is missing", () => {
		const body: TransformEntity = { name: "payload" };
		const transformers = {
			[EApiDtoType.BODY]: [{ key: "signature", type: EApiControllerRequestTransformerType.DYNAMIC, value: TRANSFORMER_VALUE_DTO_CONSTANT.REQUEST_SIGNATURE }],
		};

		expect(() => ApiControllerTransformData(transformers as never, properties, { body }, { headers: {}, ip: "127.0.0.1" })).toThrow(InternalServerErrorException);
	});

	it("applies transformers to get list response data", () => {
		const response = { items: [], totalCount: 0, count: 0, currentPage: 1, totalPages: 1 };
		const transformers = {
			[EApiDtoType.RESPONSE]: [{ key: "totalCount", type: EApiControllerRequestTransformerType.STATIC, value: "5" }],
		};

		ApiControllerTransformData(transformers as never, properties, { response }, { headers: {}, ip: "127.0.0.1" });

		expect(response.totalCount).toBe("5");
	});

	it("throws for invalid dynamic transformer values", () => {
		const body: TransformEntity = { name: "payload" };
		const transformers = {
			[EApiDtoType.BODY]: [{ key: "name", type: EApiControllerRequestTransformerType.DYNAMIC, value: "INVALID" }],
		};

		expect(() => ApiControllerTransformData(transformers as never, properties, { body }, { headers: {}, ip: "127.0.0.1" })).toThrow(InternalServerErrorException);
	});

	it("applies transformers to get list query data", () => {
		const query = { page: 1, limit: 10 };
		const transformers = {
			[EApiDtoType.QUERY]: [{ key: "page", type: EApiControllerRequestTransformerType.STATIC, value: "2" }],
		};

		ApiControllerTransformData(transformers as never, properties, { query }, { headers: {}, ip: "127.0.0.1" });

		expect(query.page).toBe("2");
	});

	it("sets values even when keys are missing if configured", () => {
		const body = { name: "payload" } as Record<string, unknown>;
		const transformers = {
			[EApiDtoType.BODY]: [{ key: "extra", type: EApiControllerRequestTransformerType.STATIC, value: "added", shouldSetValueEvenIfMissing: true }],
		};

		ApiControllerTransformData(transformers as never, properties, { body }, { headers: {}, ip: "127.0.0.1" });

		expect(body.extra).toBe("added");
	});

	it("throws when key is missing and not forced", () => {
		const body = { name: "payload" };
		const transformers = {
			[EApiDtoType.BODY]: [{ key: "missing", type: EApiControllerRequestTransformerType.STATIC, value: "x" }],
		};

		expect(() => ApiControllerTransformData(transformers as never, properties, { body }, { headers: {}, ip: "127.0.0.1" })).toThrow(InternalServerErrorException);
	});

	it("applies transformers to request parameters", () => {
		const parameters = { id: "1" };
		const transformers = {
			[EApiDtoType.REQUEST]: [{ key: "id", type: EApiControllerRequestTransformerType.STATIC, value: "2" }],
		};

		ApiControllerTransformData(transformers as never, properties, { parameters }, { headers: {}, ip: "127.0.0.1" });

		expect(parameters.id).toBe("2");
	});

	it("no-ops when transformers are undefined", () => {
		const body = { name: "payload" };

		expect(() => ApiControllerTransformData(undefined, properties, { body }, { headers: {}, ip: "127.0.0.1" })).not.toThrow();
	});

	it("throws when authorized entity is missing", () => {
		const body = { user: undefined };
		const transformers = {
			[EApiDtoType.BODY]: [{ key: "user", type: EApiControllerRequestTransformerType.DYNAMIC, value: TRANSFORMER_VALUE_DTO_CONSTANT.AUTHORIZED_ENTITY }],
		};

		expect(() => ApiControllerTransformData(transformers as never, properties, { body }, { headers: {}, ip: "127.0.0.1" })).toThrow(InternalServerErrorException);
	});
});
