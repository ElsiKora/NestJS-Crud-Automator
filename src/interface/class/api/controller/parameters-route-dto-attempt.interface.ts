import type { ValidationError } from "class-validator";

export interface IApiControllerParametersRouteDtoAttempt {
	errors: Array<ValidationError>;
	failure?: { error: unknown };
	isAccepted: boolean;
	values: Record<string, unknown>;
}
