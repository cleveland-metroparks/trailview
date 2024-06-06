import * as schema from '$db/schema';

export type ImageData = {
	id: string;
	sequenceId: number;
	coordinates: [number, number];
	bearing: number;
	flipped: boolean;
	pitchCorrection: number;
	public: boolean;
	createdAt: Date;
	shtHash: string;
};

export const imageQuerySelect = {
	id: schema.image.id,
	sequenceId: schema.image.sequenceId,
	coordinates: schema.image.coordinates,
	bearing: schema.image.bearing,
	flipped: schema.image.flipped,
	pitchCorrection: schema.image.pitchCorrection,
	public: schema.image.public,
	createdAt: schema.image.createdAt,
	shtHash: schema.image.shtHash
};
