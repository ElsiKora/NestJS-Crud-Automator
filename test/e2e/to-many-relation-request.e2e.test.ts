import "reflect-metadata";

import { describeHydrationSuite } from "./to-many-relation-request";

describeHydrationSuite("SQLite", {
	createDataSourceOptions: async () => ({ database: ":memory:", type: "better-sqlite3" }),
});
