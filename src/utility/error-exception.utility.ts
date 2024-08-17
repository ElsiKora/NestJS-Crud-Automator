export function ErrorException(message: string): Error {
	return new Error(`[NestJS-Crud-Automator] ${message}`);
}
