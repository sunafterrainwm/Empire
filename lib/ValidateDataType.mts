/* eslint-disable new-cap */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import util from 'node:util';

import {Value, type ValueError, ValueErrorType} from '@sinclair/typebox/value';

import {RawData, SendInfoData, schemaFileName} from '../lib/DataType.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const dataBasePath = path.join(__dirname, '..', 'data');
const schemaPath = path.join(dataBasePath, schemaFileName);

export class ValidateError extends Error {
	public static fromTypeBoxValueErrors(errors: IterableIterator<ValueError>) {
		const msgs: string[] = [];
		const msg = 'Validate Fail, problems: \n';
		for (const error of errors) {
			msgs.push(
				`    [${error.path}]: [${error.type} ${ValueErrorType[error.type]}] ${error.message}\n        schema: ${util.inspect(error.schema)}\n        value: ${util.inspect(error.value)}`,
			);
		}

		return new this(msgs.join('\n'), true);
	}

	public constructor(problem?: string, multiProblems = false) {
		let msg: string;
		if (problem) {
			if (multiProblems) {
				msg = 'Validate Fail, problems: \n' + problem;
			} else {
				msg = 'Validate Fail, problem: ' + problem;
			}
		} else {
			msg = 'Validate Fail.';
		}

		super(msg);
	}
}

function hasSchema<T extends Record<string, unknown>>(value: T): value is T & {$schema: string} {
	return value
		&& typeof value === 'object'
		&& '$schema' in value
		&& typeof value.$schema === 'string';
}

function isValidUrl(url: string) {
	try {
		return Boolean(new URL(url));
	} catch {
		return false;
	}
}

export function validateRawData(json: unknown): asserts json is RawData {
	if (!Value.Check(RawData, json)) {
		throw ValidateError.fromTypeBoxValueErrors(Value.Errors(RawData, json));
	}
}

export async function getRawData(dataPath: string): Promise<RawData> {
	dataPath = path.resolve(dataBasePath, dataPath);
	if (
		!dataPath.startsWith(dataBasePath)
		|| path.extname(dataPath) !== '.json'
		|| path.basename(dataPath) === schemaFileName
	) {
		throw new Error(`Bad path: ${dataPath}`);
	}

	await fs.promises.access(dataPath, fs.constants.R_OK);
	const json = JSON.parse(
		await fs.promises.readFile(dataPath, {
			encoding: 'utf-8',
		}),
	) as unknown;

	validateRawData(json);

	if (!hasSchema(json)) {
		throw new ValidateError('Lost $schema.');
	} else if (path.isAbsolute(json.$schema) || isValidUrl(json.$schema)) {
		throw new ValidateError('Schema should not be a absolute path or url.');
	} else if (path.resolve(path.dirname(dataPath), json.$schema) !== schemaPath) {
		throw new ValidateError(`Unknown schema given, expected: ${schemaPath}, received: ${path.resolve(path.dirname(dataPath), json.$schema)}.`);
	}

	return json;
}

export function validateSendInfoData(json: unknown): asserts json is SendInfoData {
	if (!Value.Check(SendInfoData, json)) {
		throw ValidateError.fromTypeBoxValueErrors(Value.Errors(SendInfoData, json));
	}
}

export async function getSendInfoData(dataPath: string): Promise<SendInfoData> {
	dataPath = path.resolve(dataPath);
	if (path.extname(dataPath) !== '.json') {
		throw new Error(`Bad path: ${dataPath}`);
	}

	await fs.promises.access(dataPath, fs.constants.R_OK);
	const json = JSON.parse(
		await fs.promises.readFile(dataPath, {
			encoding: 'utf-8',
		}),
	) as unknown;

	validateSendInfoData(json);

	return json;
}
