import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import chalk from 'chalk';

import {RawData, schemaFileName} from '../lib/DataType.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const schemaPath = path.join(__dirname, '..', 'data', schemaFileName);

try {
	await fs.promises.writeFile(schemaPath, JSON.stringify(RawData, null, '\t'), {
		encoding: 'utf-8',
	});

	console.info(chalk.green('Successful generate %s.'), schemaPath);
} catch (error) {
	console.error(chalk('Fail to generate %s:'), schemaPath, error);
	process.exit(1);
}
