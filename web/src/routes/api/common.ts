export type ImageData = {
	id: string;
	sequenceId: number;
	latitude: number;
	longitude: number;
	bearing: number;
	flipped: boolean;
	pitchCorrection: number;
	public: boolean;
	createdAt: Date;
	shtHash: string;
};
