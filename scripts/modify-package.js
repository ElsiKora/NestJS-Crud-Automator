import fs from 'fs/promises';
import path from 'path';

async function modifyPackageJson() {
    const packageJson = JSON.parse(
        await fs.readFile('package.json', 'utf8')
    );

    const distPackageJson = {
        ...packageJson,
    };

    delete distPackageJson.type;

    await fs.writeFile(
        'dist/package.json',
        JSON.stringify(distPackageJson, null, 2),
        'utf8'
    );
}

modifyPackageJson().catch(console.error);
