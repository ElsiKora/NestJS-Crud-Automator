import type { IApiAuthorizationSubjectResolver } from "./resolver.interface";

export interface IApiAuthorizationModuleOptions {
	subjectResolver?: IApiAuthorizationSubjectResolver;
}
