import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import util from 'node:util';

import {Telegraf} from 'telegraf';
import {type Convenience as tt} from 'telegraf/types';

import DateHelper from '../lib/DateHelper.mjs';
import {getSendInfoData} from '../lib/ValidateDataType.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env');

const startTime = (() => {
	if (process.argv.length > 2) {
		console.log('Warning! using fake timestamp %s!', process.argv[2]);
		if (!Date.parse(process.argv[2])) {
			throw new Error('Invalid fake timestamp.');
		}

		return new Date(process.argv[2]);
	}

	return new Date();
})();

if (fs.existsSync(envPath)) {
	const dotenv = await import('dotenv');
	dotenv.config({
		path: envPath,
	});
}

type Env = {
	readonly TELEGRAM_TOKEN: string;
	readonly DEBUG_CHANNEL: string;
} & NodeJS.ProcessEnv;

function validateEnv(env: NodeJS.ProcessEnv): asserts env is Env {
	assert(env.TELEGRAM_TOKEN, 'Missing env TELEGRAM_TOKEN');
	assert(env.DEBUG_CHANNEL, 'Missing env DEBUG_CHANNEL');
}

validateEnv(process.env);

const {env} = process;

const bot = new Telegraf(env.TELEGRAM_TOKEN);
bot.botInfo ??= await bot.telegram.getMe();

const data = await getSendInfoData(path.join(__dirname, '..', 'config.json'));

async function sendToChat(chat: string | number, message: string, extra?: tt.ExtraReplyMessage) {
	return bot.telegram.sendMessage(chat, message, extra);
}

async function log(method: 'info' | 'error', message: string, extra?: tt.ExtraReplyMessage) {
	console[method]('[%s] [%s] %s', new Date().toISOString(), method, message);
	return sendToChat(env.DEBUG_CHANNEL, util.format('[%s] [%s] %s', new Date().toISOString(), method, message), extra);
}

for (const [index, line] of data.entries()) {
	let helper: DateHelper;

	try {
		// eslint-disable-next-line no-await-in-loop
		helper = await DateHelper.fromDataFile(line.fileName);
	} catch (error) {
		// eslint-disable-next-line no-await-in-loop
		await log('error', util.format('[%s] Fail to initial #%d %s: %s', index, line.fileName, error));
		continue;
	}

	const year = helper.getYearFromStartTime(startTime, 3);
	if (!year) {
		// eslint-disable-next-line no-await-in-loop
		await log('info', util.format('[%s] Year is null, pass.', helper.data.calendarId));
		continue;
	}

	let msg: string;
	try {
		msg = helper.printMessageForYear(year);
	} catch (error) {
		// eslint-disable-next-line no-await-in-loop
		await log('error', util.format('[%s] Fail to render msg: %s', helper.data.calendarId, error));
		continue;
	}

	for (const chat of line.sendToChats) {
		try {
			// eslint-disable-next-line no-await-in-loop
			await sendToChat(chat, msg);
		} catch (error) {
			// eslint-disable-next-line no-await-in-loop
			await log('error', util.format(
				'[%s] Fail to send message %s to chat %s: %s',
				helper.data.calendarId,
				msg,
				chat,
				error,
			));
			continue;
		}

		// eslint-disable-next-line no-await-in-loop
		await log('info', util.format(
			'[%s] Send message %s to chat %s.',
			helper.data.calendarId,
			msg,
			chat,
		));
	}
}
