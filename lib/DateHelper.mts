import assert from 'node:assert';
import util from 'node:util';

import {type RawData} from './DataType.mjs';
import {getRawData} from './ValidateDataType.mjs';

const romans = [
	['M', 1000],
	['CM', 900],
	['D', 500],
	['CD', 400],
	['C', 100],
	['XC', 90],
	['L', 50],
	['XL', 40],
	['X', 10],
	['IX', 9],
	['V', 5],
	['IV', 4],
	['I', 1],
] as const;

function intToRoman(num: number) {
	let result = '';
	for (const [roman, n] of romans) {
		while (num >= n) {
			result += roman;
			num -= n;
		}
	}

	return result;
}

const yearNumberList = [
	'',
	'一',
	'二',
	'三',
	'四',
	'五',
	'六',
	'七',
	'八',
	'九',
];

function intToYearNumber(num: number) {
	if (num === 1) {
		return '元';
	}

	if (!num || num <= 0 || num >= 100) {
		return String(num);
	}

	if (num < 10) {
		return yearNumberList[num];
	}

	if (num < 20) {
		return '十' + yearNumberList[num - 10];
	}

	const f = Math.floor(num / 10);
	return yearNumberList[f] + '十' + yearNumberList[num - (f * 10)];
}

export default class DateHelper {
	public static async fromDataFile(file: string) {
		const data = await getRawData(file);
		return new this(data);
	}

	private readonly _startAt: Date;

	public constructor(private readonly _data: RawData) {
		this._startAt = new Date(_data.startAt);
	}

	public get data(): RawData {
		return this._data;
	}

	public getYearFromStartTime(date: Date | string | number, deviationFixDigits = 0) {
		if (!util.types.isDate(date)) {
			date = new Date(date);
		}

		assert(util.types.isDate(date) && date, 'date should be a Date object or a validate timestamp.');
		assert(date > this._startAt, 'date should after the calendar start.');
		assert(deviationFixDigits >= 0 && Number.isInteger(deviationFixDigits), 'deviationFixDigits should be a positive integer or zero.');

		let year = ((Number(date) - Number(this._startAt)) / (this._data.calendarCycle * 1000)) + 1;
		if (!Number.isInteger(year) && deviationFixDigits) {
			const nearIntegerYear = Math.round(year);
			const [max, min] = [nearIntegerYear + (10 ** -deviationFixDigits), nearIntegerYear - (10 ** -deviationFixDigits)];
			if (min <= year && max >= year) {
				year = nearIntegerYear;
			}
		}

		return year > 0 && Number.isInteger(year) ? year : null;
	}

	public getYearRealStartTime(year: number) {
		assert(year > 0 && Number.isInteger(year), 'year should be a positive integer.');

		return new Date(Number(this._startAt) + ((year - 1) * (this._data.calendarCycle * 1000)));
	}

	public printMessageForYear(year: number) {
		assert(year > 0 && Number.isInteger(year), 'year should be a positive integer.');

		const result: Array<[string, string[]]> = [];
		const resultTmp: Record<string, [string, string[]]> = {};

		for (const item of this._data.list) {
			if (item.from > year || item.to < year) {
				continue;
			}

			const yearString = item.year + intToYearNumber(year - item.from + 1) + '年';
			if (Object.prototype.hasOwnProperty.call(resultTmp, item.who)) {
				resultTmp[item.who][1].push(yearString);
			} else {
				resultTmp[item.who] = [item.who, [yearString]];
				result.push(resultTmp[item.who]);
			}
		}

		assert(result.length > 0, `No data of year ${String(year)} found.`);

		let multiYearForOne = false;
		return `現時${this._data.calendarName}\n${year}年（${intToRoman(year)}），${result.map(v => {
			if (v[1].length > 1) {
				multiYearForOne = true;
			}

			return v[0] + v[1].join('、');
		}).join(multiYearForOne ? '；' : '、')}`;
	}
}
