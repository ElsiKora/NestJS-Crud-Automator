export interface IApiControllerParametersRouteDtoExposure {
	ambiguousProperties: Map<string, Array<string>>;
	failedProperties: Set<string>;
	names: Map<string, string>;
	properties: Set<string>;
	shadowedProperties: Map<string, Array<string>>;
}
