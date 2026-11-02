export interface IApiControllerParametersRouteDtoAttempt {
	failure?: { error: unknown };
	isAccepted: boolean;
	messages: Array<string>;
	values: Record<string, unknown>;
}
