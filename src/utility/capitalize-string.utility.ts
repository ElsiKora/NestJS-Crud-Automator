export function CapitalizeString(string: string): string {
	return string.charAt(0).toUpperCase() + string.toLowerCase().slice(1);
}
