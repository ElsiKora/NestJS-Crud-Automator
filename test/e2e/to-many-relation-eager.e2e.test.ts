import "reflect-metadata";

import { describeEagerRelationSuite } from "./to-many-relation-eager";

describeEagerRelationSuite("SQLite", {
	createDataSourceOptions: async () => ({ database: ":memory:", type: "better-sqlite3" }),
	isCursorSupported: false,
});
