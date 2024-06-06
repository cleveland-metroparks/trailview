import type { ImageData } from '$api/common';

export type GetResType = { success: false; message: string } | { success: true; data: ImageData };
