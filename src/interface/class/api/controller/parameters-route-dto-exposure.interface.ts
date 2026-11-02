export interface IApiControllerParametersRouteDtoExposure {
	failedProperties: Set<string>;
	names: Map<string, string>;
	properties: Set<string>;
	shadowedProperties: Map<string, Array<string>>;
}
