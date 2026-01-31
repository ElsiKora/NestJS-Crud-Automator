type TWhere<T> = Partial<Record<keyof T, unknown>> | Array<Partial<Record<keyof T, unknown>>>;

export class InMemoryRepository<T extends { id?: string }> {
	public constructor(private readonly entityClass?: new () => T) {}

	public lastFindOne?: { where?: TWhere<T> };
	public lastFindAndCount?: { where?: TWhere<T>; skip?: number; take?: number };
	public lastSave?: Partial<T>;

	private readonly store: Map<string, T> = new Map();
	private sequence = 1;

	public reset(): void {
		this.store.clear();
		this.sequence = 1;
		this.lastFindOne = undefined;
		this.lastFindAndCount = undefined;
		this.lastSave = undefined;
	}

	public async save(entity: Partial<T>): Promise<T> {
		this.lastSave = entity;
		const record = { ...entity } as Partial<T>;
		const existingId = record.id ?? `id-${this.sequence++}`;
		const existing = this.store.get(existingId);
		const target = existing ?? this.toEntity({});

		Object.assign(target as object, record, { id: existingId });
		this.store.set(existingId, target);

		return target;
	}

	public async findOne(options?: { where?: TWhere<T> }): Promise<T | null> {
		this.lastFindOne = options ?? {};
		const matches = this.findMatching(options?.where);

		return matches[0] ? this.cloneEntity(matches[0]) : null;
	}

	public async find(options?: { where?: TWhere<T> }): Promise<Array<T>> {
		return this.findMatching(options?.where).map((entry) => this.cloneEntity(entry));
	}

	public async findAndCount(options?: { where?: TWhere<T>; skip?: number; take?: number }): Promise<[Array<T>, number]> {
		this.lastFindAndCount = options ?? {};
		const matches = this.findMatching(options?.where);
		const total = matches.length;
		const start = Math.max(options?.skip ?? 0, 0);
		const end = options?.take ? start + options.take : undefined;
		const items = matches.slice(start, end).map((entry) => this.cloneEntity(entry));

		return [items, total];
	}

	public async remove(entity: T): Promise<T> {
		if (entity.id) {
			this.store.delete(String(entity.id));
		}

		return entity;
	}

	private toEntity(seed: Partial<T>): T {
		if (this.entityClass) {
			return Object.assign(new this.entityClass(), seed);
		}

		return seed as T;
	}

	private cloneEntity(entity: T): T {
		return this.toEntity({ ...(entity as object) } as Partial<T>);
	}

	private findMatching(where?: TWhere<T>): Array<T> {
		if (!where) {
			return [...this.store.values()];
		}

		const clauses = Array.isArray(where) ? where : [where];

		return [...this.store.values()].filter((item) => clauses.some((clause) => this.matchesClause(item, clause)));
	}

	private matchesClause(item: T, clause: Partial<Record<keyof T, unknown>>): boolean {
		for (const [key, value] of Object.entries(clause)) {
			const itemValue = (item as Record<string, unknown>)[key];
			if (!this.matchesValue(itemValue, value)) {
				return false;
			}
		}

		return true;
	}

	private matchesValue(itemValue: unknown, expected: unknown): boolean {
		if (this.isFindOperator(expected)) {
			return this.evaluateFindOperator(itemValue, expected);
		}

		return itemValue === expected;
	}

	private isFindOperator(value: unknown): value is { _type: string; _value: unknown } {
		return Boolean(value && typeof value === "object" && "_type" in value && "_value" in value);
	}

	private evaluateFindOperator(itemValue: unknown, operator: { _type: string; _value: unknown }): boolean {
		switch (operator._type) {
			case "equal": {
				return itemValue === operator._value;
			}

			case "ilike": {
				return this.matchesLike(itemValue, operator._value, true);
			}

			case "like": {
				return this.matchesLike(itemValue, operator._value, false);
			}

			case "in": {
				const values = Array.isArray(operator._value) ? operator._value : [operator._value];

				return values.some((value) => this.matchesValue(itemValue, value));
			}

			case "not": {
				return !this.matchesValue(itemValue, operator._value);
			}

			case "isnull": {
				return itemValue === null || itemValue === undefined;
			}

			default: {
				return false;
			}
		}
	}

	private matchesLike(itemValue: unknown, pattern: unknown, caseInsensitive: boolean): boolean {
		if (itemValue === null || itemValue === undefined) {
			return false;
		}

		const text = String(itemValue);
		const rawPattern = String(pattern);
		const needle = rawPattern.replaceAll("%", "");

		if (!needle) {
			return true;
		}

		if (caseInsensitive) {
			return text.toLowerCase().includes(needle.toLowerCase());
		}

		return text.includes(needle);
	}
}
