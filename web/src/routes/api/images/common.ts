import type { ImageData, ImageDataPrivate } from '$api/common';

export type GetResType = { success: false; message: string } | { success: true; data: ImageData[] };
export type GetResTypePrivate =
	| { success: false; message: string }
	| { success: true; data: ImageDataPrivate[] };
