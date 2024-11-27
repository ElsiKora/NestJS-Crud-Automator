import type { IApiAuthenticationRequest } from "../../../../../interface";

export type TApiControllerTransformDataData = {
	authenticationRequest?: IApiAuthenticationRequest;
	headers: Record<string, string>;
	ip: string;
};
