/**
 * A Date that node-postgres writes as its exact instant.
 * node-postgres writes a Date as its local fields with the local offset cut to whole minutes, so a historic instant whose zone offset holds seconds moves.
 * This Date reports its UTC fields as the local ones and a zero offset, so the written text is the instant itself.
 * Internal: only the create write of an instant primary key on a node-postgres driver uses it, so the column transformer still receives a Date.
 */
export class ApiControllerGeneratedUtcDate extends Date {
	public override getDate(): number {
		return this.getUTCDate();
	}

	public override getDay(): number {
		return this.getUTCDay();
	}

	public override getFullYear(): number {
		return this.getUTCFullYear();
	}

	public override getHours(): number {
		return this.getUTCHours();
	}

	public override getMilliseconds(): number {
		return this.getUTCMilliseconds();
	}

	public override getMinutes(): number {
		return this.getUTCMinutes();
	}

	public override getMonth(): number {
		return this.getUTCMonth();
	}

	public override getSeconds(): number {
		return this.getUTCSeconds();
	}

	public override getTimezoneOffset(): number {
		return 0;
	}
}
