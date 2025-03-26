import type { IApiAuthenticationRequest } from "@interface/api-authentication-request.interface";

export type TApiControllerTransformDataData = {
	authenticationRequest?: IApiAuthenticationRequest;
	headers: Record<string, string>;
	ip: string;
};
