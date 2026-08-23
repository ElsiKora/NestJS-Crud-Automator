import type { ApiHeaderOptions, ApiResponseOptions } from "@nestjs/swagger";

export interface IApiRouteDocumentationProperties {
	description?: string;
	operationId?: string;
	request?: {
		headers?: Array<ApiHeaderOptions>;
		mediaTypes?: Array<string>;
	};
	response?: {
		mediaTypes?: Array<string>;
		statuses?: Array<{ status: NonNullable<ApiResponseOptions["status"]> } & ApiResponseOptions>;
	};
	summary?: string;
}
