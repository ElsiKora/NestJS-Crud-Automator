export default {
	maxRetries: 3,
	mode: "auto",
	model: "claude-sonnet-4-5",
	provider: "anthropic",
	ticket: {
		missingBranchLintBehavior: "fallback",
		normalization: "preserve",
		pattern: "[a-z]{2,}-[0-9]+",
		patternFlags: "i",
		source: "auto",
	},
	validationMaxRetries: 3,
};
