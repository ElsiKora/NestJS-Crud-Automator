/**
 * One failure of an IAM policy document against the policy grammar.
 */
export interface IApiAuthorizationIamFailure {
	// Constraint code from `AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT`; the code is the contract.
	code: string;
	// Message for logs.
	message: string;
	// Path of the failing part, such as `document.Statement[2].Condition.StringEquals["resource.name"]`.
	property: string;
}
