import fs from 'node:fs';
import path from 'node:path';

import chalk from 'chalk';

import {dataBasePath, getRawData} from '../lib/ValidateDataType.mjs';

async function readdir(directory: string) {
	const files = await fs.promises.readdir(directory);
	const result: string[] = [];
	for (const file of files) {
		const fullPath = path.join(directory, file);

		if (file === '$schema.json') {
			console.log('Ignore $schema.json "%s".', fullPath);
			continue;
		}

		// eslint-disable-next-line no-await-in-loop
		const stat = await fs.promises.stat(fullPath);
		if (stat.isFile()) {
			if (path.extname(file) !== '.json') {
				console.log('Ignore non-json file "%s".', fullPath);
				continue;
			}

			result.push(fullPath);
		} else if (stat.isDirectory()) {
			// eslint-disable-next-line no-await-in-loop
			result.push(...await readdir(fullPath));
		} else if (stat.isSymbolicLink()) {
			// eslint-disable-next-line no-await-in-loop
			const realPath = await fs.promises.readlink(fullPath);
			if (!realPath.startsWith(dataBasePath)) {
				console.log('Ignore "%s" because target of it isn\'t startWith dataBasePath "%s".', fullPath, dataBasePath);
				continue;
			}

			result.push(realPath);
		} else {
			console.log('Ignore unknown type item "%s".', fullPath);
		}
	}

	return result;
}

const files = await readdir(dataBasePath);
let hasError = false;

for (const file of files) {
	try {
		// eslint-disable-next-line no-await-in-loop
		await getRawData(file);
	} catch (error) {
		hasError = true;
		console.error(chalk.red('[ERROR] Fail to validate path "%s": '), file, error);
		continue;
	}

	console.info(chalk.green('[INFO] Path "%s" pass.'), file);
}

if (hasError) {
	process.exit(1);
}
