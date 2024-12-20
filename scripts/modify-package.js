import fs from "node:fs/promises";

async function modifyPackageJson() {
	const packageJson = JSON.parse(await fs.readFile("package.json", "utf8"));

	const distributionPackageJson = {
		...packageJson,
	};

	delete distributionPackageJson.type;

	await fs.writeFile("dist/package.json", JSON.stringify(distributionPackageJson, null, 2), "utf8");
}

modifyPackageJson().catch(console.error);
