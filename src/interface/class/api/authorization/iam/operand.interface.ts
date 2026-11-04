import type { IApiAuthorizationIamDateValue } from "@interface/class/api/authorization/iam/date-value.interface";
import type { IApiAuthorizationIamDecimal } from "@interface/class/api/authorization/iam/decimal.interface";
import type { IApiAuthorizationIamNetwork } from "@interface/class/api/authorization/iam/network.interface";
import type { IApiAuthorizationIamToken } from "@interface/class/api/authorization/iam/token.interface";

/**
 * The value of a condition key once the request resolved it, in the form its operator family compares. Exactly one
 * member is set.
 */
export interface IApiAuthorizationIamOperand {
	// Value of a Date operator.
	date?: IApiAuthorizationIamDateValue;
	// Value of a Numeric operator.
	decimal?: IApiAuthorizationIamDecimal;
	// Value of a Bool or Null operator.
	isTrue?: boolean;
	// Range of an IP operator.
	network?: IApiAuthorizationIamNetwork;
	// Literal, `*` and `?` tokens of a StringLike or Arn operator; a resolved variable is a literal token.
	pattern?: ReadonlyArray<IApiAuthorizationIamToken>;
	// Text of a String operator; of an IgnoreCase one, with A-Z folded to a-z.
	text?: string;
}
