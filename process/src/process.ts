import { join } from 'path';
import fs from 'fs-extra';
import { spawn } from 'child_process';
import { imagesPath } from './index.js';
import z from 'zod';
import {
    jpgsInDir,
    jsonFilesInDir,
    parseDataJsonDate,
    pngsInDir,
} from './utils.js';
import {
    Sequence,
    deleteSequence,
    fetchImageIds,
    fetchSequences,
    patchSequenceStatus,
    postNewImage,
} from './web.js';

export async function processManifest(sequence: Sequence) {
    const sequencePath = join(imagesPath, sequence.name);
    await new Promise<void>((resolve) => {
        const python = spawn('python', [
            'scripts/process_manifest.py',
            sequencePath,
            '--no-flip',
        ]);
        python.stdout.on('data', (data) => {
            console.log(`${data}`);
        });
        python.stderr.on('data', (data) => {
            console.error(`${data}`);
        });
        python.on('close', () => {
            resolve();
        });
    });

    console.log('Posting sequence...');
    const manifestSchema = z.object({
        sequence: z.array(
            z.object({
                id: z.string().length(32),
                sequence: z.string().min(1),
                latitude: z.number(),
                longitude: z.number(),
                bearing: z.number(),
                flipped: z.boolean(),
                creationDate: z.string().transform((d) => parseDataJsonDate(d)),
                shtHash: z.string().length(74),
            })
        ),
    });

    const manifestFile = await fs.readFile(
        join(imagesPath, sequence.name, 'manifest.json')
    );
    const manifestJson = JSON.parse(manifestFile.toString());
    const manifestParse = manifestSchema.safeParse(manifestJson);
    if (manifestParse.success !== true) {
        console.error(manifestParse.error);
        throw new Error('Unable to parse global data.json');
    }
    const manifestData = manifestParse.data;

    const webSequences = await fetchSequences();
    const webImageIds = new Set(await fetchImageIds());

    if (webSequences === null || webImageIds === null) {
        console.warn('Unable to fetch web info for sequences and/or image ids');
        return;
    }

    for (const image of manifestData.sequence) {
        if (webImageIds.has(image.id) === true) {
            continue;
        }
        const sequence = webSequences.find((s) => s.name === image.sequence);
        if (sequence === undefined) {
            console.error(
                `Failed to find sequence: ${image.sequence}, skipping image...`
            );
            continue;
        }
        const success = await postNewImage({
            id: image.id,
            latitude: image.latitude,
            longitude: image.longitude,
            bearing: image.bearing,
            flipped: image.flipped,
            shtHash: image.shtHash,
            pitchCorrection: 0,
            createdAt: image.creationDate,
            public: false,
            sequenceId: sequence.id,
        });
        if (success !== true) {
            console.warn('Post new image unsuccessful');
            return;
        }
    }
    await patchSequenceStatus({ sequenceId: sequence.id, status: 'done' });
    console.log('Done posting sequence');
}

export async function processTile(sequence: Sequence) {
    const sequencePath = join(imagesPath, sequence.name);

    async function checkToSequence(): Promise<boolean> {
        const originalCount = await pngsInDir(join(sequencePath, 'img_blur'));
        const processedCount = await jsonFilesInDir(join(sequencePath, 'img'));
        if (originalCount === processedCount) {
            await patchSequenceStatus({
                sequenceId: sequence.id,
                status: 'manifest',
            });
            const blurPath = join(sequencePath, 'img_blur');
            if (fs.existsSync(blurPath) === true) {
                await fs.remove(blurPath);
            }
            return true;
        }
        return false;
    }
    if (fs.existsSync(join(sequencePath, 'img'))) {
        if ((await checkToSequence()) === true) {
            return;
        }
    }
    await new Promise<void>((resolve) => {
        const python = spawn('python', [
            'scripts/process_tiles.py',
            join(sequencePath),
            '--useblurred',
            'True',
        ]);
        python.stdout.on('data', (data) => {
            console.log(`${data}`);
        });
        python.stderr.on('data', (data) => {
            console.error(`${data}`);
        });
        python.on('close', () => {
            resolve();
        });
    });
    await checkToSequence();
}

export async function processBlur(sequence: Sequence) {
    const sequencePath = join(imagesPath, sequence.name);

    async function checkToTile(): Promise<boolean> {
        const originalCount = await jpgsInDir(
            join(sequencePath, 'img_original')
        );
        const blurCount = await pngsInDir(join(sequencePath, 'img_blur'));
        if (originalCount === blurCount) {
            await patchSequenceStatus({
                sequenceId: sequence.id,
                status: 'tile',
            });
            return true;
        }
        return false;
    }

    if (!fs.existsSync(join(sequencePath, 'img_blur'))) {
        await fs.mkdir(join(sequencePath, 'img_blur'));
    } else {
        if ((await checkToTile()) === true) {
            return;
        }
    }
    await new Promise<void>((resolve) => {
        const blurProcess = spawn(
            'scripts/blur360/build/src/equirect-blur-image',
            [
                '--blur=true',
                '-m=scripts/blur360/models',
                `-o=${join(sequencePath, 'img_blur')}`,
                join(sequencePath, 'img_original'),
            ]
        );
        blurProcess.stdout.on('data', (data) => {
            console.log(`${data}`);
        });
        blurProcess.stderr.on('data', (data) => {
            console.error(`${data}`);
        });
        blurProcess.on('close', () => {
            resolve();
        });
    });
    await checkToTile();
}

export async function processDelete(sequence: Sequence) {
    const sequencePath = join(imagesPath, sequence.name);
    await fs.remove(sequencePath);
    await deleteSequence(sequence.id);
}
