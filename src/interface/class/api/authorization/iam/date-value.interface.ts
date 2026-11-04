/**
 * A date value an IAM Date operator compares: an instant or a calendar date.
 */
export interface IApiAuthorizationIamDateValue {
	// Milliseconds since the epoch; of a calendar date, at its midnight in UTC.
	epoch: number;
	// Whether the value is a calendar date, `YYYY-MM-DD`, and not an instant.
	isCalendar: boolean;
	// Canonical text: ISO 8601 UTC with milliseconds for an instant, `YYYY-MM-DD` for a calendar date.
	text: string;
}
