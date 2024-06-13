import urlJoin from 'url-join';
import { apiKey, webUrl } from './index.js';
import z, { ZodTypeAny } from 'zod';

function createZodApiSchema<T extends ZodTypeAny>(dataSchema: T) {
    return z.union([
        z.object({ success: z.literal(false), message: z.string() }),
        z.object({ success: z.literal(true), data: dataSchema }),
    ]);
}

const sequenceSchema = z.object({
    name: z.string(),
    id: z.number(),
    mapsApiTrailId: z.number().nullable().optional(),
});

export type Sequence = z.infer<typeof sequenceSchema>;

export async function fetchSequences(): Promise<Array<Sequence> | null> {
    const res = await fetch(urlJoin(webUrl, '/api/sequences'), {
        method: 'GET',
        headers: { 'X-API-Key': apiKey },
    });
    if (res.status !== 200) {
        console.error('Fetch sequences status !== 200');
        return null;
    }
    const resSchema = createZodApiSchema(z.array(sequenceSchema));
    const parseData = resSchema.safeParse(await res.json());
    if (parseData.success !== true) {
        console.error('Unable to parse GET sequences response');
        return null;
    }
    if (parseData.data.success !== true) {
        console.error('Fetch sequences unsuccessful');
        return null;
    }
    return parseData.data.data;
}

export async function fetchSequenceStatuses(): Promise<Array<{
    id: number;
    name: string;
    status: SequenceStatus;
    toDelete: boolean;
}> | null> {
    const res = await fetch(urlJoin(webUrl, '/api/sequences/status'), {
        method: 'GET',
        headers: { 'X-API-Key': apiKey },
    });
    if (res.status !== 200) {
        console.error(`Fetch sequences statuses, status == ${res.status}`);
        return null;
    }
    const resSchema = createZodApiSchema(
        z.array(
            z.object({
                id: z.number(),
                name: z.string(),
                status: zodSequenceStatus,
                toDelete: z.boolean(),
            })
        )
    );
    const parseData = resSchema.safeParse(await res.json());
    if (parseData.success !== true) {
        console.error(
            'Unable to parse GET sequences statuses response:',
            parseData.error
        );
        return null;
    }
    if (parseData.data.success !== true) {
        console.error('Fetch sequences statuses unsuccessful');
        return null;
    }
    return parseData.data.data;
}

const zodSequenceStatus = z.enum([
    'upload',
    'blur',
    'tile',
    'manifest',
    'done',
]);
export type SequenceStatus = z.infer<typeof zodSequenceStatus>;

export async function patchSequenceStatus(params: {
    sequenceId: number;
    status: SequenceStatus;
}): Promise<boolean> {
    const res = await fetch(
        urlJoin(
            webUrl,
            '/api/sequences',
            params.sequenceId.toString(),
            'status'
        ),
        {
            method: 'PATCH',
            headers: {
                'X-API-Key': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: params.status }),
        }
    );
    if (res.status !== 200) {
        console.error(`Patch sequence status, status == ${res.status}`);
        return false;
    }
    const resSchema = z.union([
        z.object({ success: z.literal(false), message: z.string() }),
        z.object({ success: z.literal(true) }),
    ]);
    const parseData = resSchema.safeParse(await res.json());
    if (parseData.success !== true) {
        console.error('Unable to parse PATCH sequence status response');
        return false;
    }
    if (parseData.data.success !== true) {
        console.error('Patch sequence status unsuccessful');
        return false;
    }
    return true;
}

export async function deleteSequence(sequenceId: number): Promise<boolean> {
    const res = await fetch(
        urlJoin(webUrl, '/api/sequences', sequenceId.toString()),
        {
            method: 'DELETE',
            headers: { 'X-API-Key': apiKey },
        }
    );
    if (res.status !== 200) {
        console.error('Delete sequence status !== 200');
        return false;
    }
    const resSchema = z.union([
        z.object({ success: z.literal(false), message: z.string() }),
        z.object({ success: z.literal(true) }),
    ]);
    const parseData = resSchema.safeParse(await res.json());
    if (parseData.success !== true) {
        console.error('Unable to parse DELETE sequence response');
        return false;
    }
    if (parseData.data.success !== true) {
        console.error('Delete sequence unsuccessful');
        return false;
    }
    return true;
}

export async function fetchImageIds(): Promise<Array<string> | null> {
    const res = await fetch(urlJoin(webUrl, '/api/images/ids/private'), {
        method: 'GET',
        headers: { 'X-API-Key': apiKey },
    });
    if (res.status !== 200) {
        console.error('Fetch image ids status !== 200');
        return null;
    }
    const resSchema = createZodApiSchema(z.array(z.string().length(32)));
    const parseData = resSchema.safeParse(await res.json());
    if (parseData.success !== true) {
        console.error('Unable to parse GET image ids response');
        return null;
    }
    if (parseData.data.success !== true) {
        console.error('Fetch image ids unsuccessful');
        return null;
    }
    return parseData.data.data;
}

export async function fetchSequenceImageIds(
    sequenceId: number
): Promise<Array<string> | null> {
    const res = await fetch(
        urlJoin(
            webUrl,
            '/api/sequences',
            sequenceId.toString(),
            '/image-ids/private'
        ),
        {
            method: 'GET',
            headers: { 'X-API-Key': apiKey },
        }
    );
    if (res.status !== 200) {
        console.error('Fetch sequence image ids status !== 200');
        return null;
    }
    const resSchema = createZodApiSchema(z.array(z.string().length(32)));
    const parseData = resSchema.safeParse(await res.json());
    if (parseData.success !== true) {
        console.error('Unable to parse GET sequence image ids response');
        return null;
    }
    if (parseData.data.success !== true) {
        console.error('Fetch sequence image ids unsuccessful');
        return null;
    }
    return parseData.data.data;
}

export type ImagePostType = {
    id: string;
    latitude: number;
    longitude: number;
    bearing: number;
    flipped: boolean;
    shtHash: string;
    pitchCorrection: number;
    createdAt: Date;
    public: boolean;
    sequenceId: number;
};

export async function postNewImage(newImage: ImagePostType): Promise<boolean> {
    const res = await fetch(urlJoin(webUrl, '/api/images/new'), {
        method: 'POST',
        headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(newImage),
    });
    if (res.status !== 200) {
        console.error(`Post new image status == ${res.status}`);
        return false;
    }
    const resSchema = z.union([
        z.object({ success: z.literal(false), message: z.string() }),
        z.object({ success: z.literal(true) }),
    ]);
    const resParse = resSchema.safeParse(await res.json());
    if (resParse.success !== true) {
        console.error('Unable to parse new image POST response');
        return false;
    }
    if (resParse.data.success !== true) {
        console.error('Post new image unsuccessful: ', resParse.data.message);
        return false;
    }
    return true;
}
