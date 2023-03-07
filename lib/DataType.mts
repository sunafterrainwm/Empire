/* eslint-disable new-cap, @typescript-eslint/naming-convention, @typescript-eslint/no-redeclare */
import {type Static, type TSchema, Type} from '@sinclair/typebox';
import {TypeSystem} from '@sinclair/typebox/system';

TypeSystem.CreateFormat(
	'ISODate',
	value => Boolean(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{3})?)?(?:[+-]\d{2}:\d{2}|Z)?$/.exec(value))
		&& !Number.isNaN(Date.parse(value)),
);

type DescriptiveType<T extends TSchema> = T & {
	description: string;
};

function createDescription<T extends TSchema>(type: T, description: string): DescriptiveType<T> {
	return Object.assign(type, {
		description,
	});
}

export const RawListData = createDescription(Type.Object({
	from: createDescription(Type.Integer(), '年號開始時間'),
	to: createDescription(Type.Integer(), '年號結束時間'),
	who: createDescription(Type.String(), '年號擁有者'),
	year: createDescription(Type.String(), '年號'),
}), '年號項目');

export type RawListData = Static<typeof RawListData>;

export const RawData = Type.Object({
	calendarId: createDescription(Type.String(), '日曆 ID'),
	startAt: createDescription(Type.String({
		format: 'ISODate',
	}), '日曆元年'),
	calendarName: createDescription(Type.String(), '日曆名稱'),
	calendarCycle: createDescription(Type.Integer(), '一年的長度（秒）'),
	list: createDescription(Type.Array(RawListData), '年號列表'),
});

export type RawData = Static<typeof RawData>;

export const schemaFileName = '$schema.json';

export const SendInfoListData = Type.Object({
	fileName: Type.String(),
	sendToChats: Type.Array(Type.Union([Type.String(), Type.Integer()])),
});

export type SendInfoListData = Static<typeof SendInfoListData>;

export const SendInfoData = Type.Array(SendInfoListData);

export type SendInfoData = Static<typeof SendInfoData>;
