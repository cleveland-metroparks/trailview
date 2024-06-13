import { join } from 'path';
import fs from 'fs-extra';
import { spawn } from 'child_process';
import { imagesPath } from './index.js';
import z from 'zod';
import { jpgsInDir, jsonFilesInDir, parseDataJsonDate } from './utils.js';
import {
    Sequence,
    deleteSequence,
    fetchImageIds,
    fetchSequences,
    patchSequenceStatus,
    postNewImage,
} from './web.js';

export async function processSequence(sequence: Sequence) {
    const sequencePath = join(imagesPath, sequence.name);
    await new Promise<void>((resolve) => {
        const python = spawn('python', [
            'scripts/process_sequence_new.py',
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
    await new Promise<void>((resolve) => {
        console.log('Processing data...');
        const python = spawn('python', ['scripts/process_data.py', imagesPath]);
        python.stdout.on('data', (data) => {
            console.log(`${data}`);
        });
        python.stderr.on('data', (data) => {
            console.log(`${data}`);
        });
        python.on('close', () => {
            resolve();
        });
    });
    console.log('Done processing data');
    console.log('Updating database...');

    const localDataJsonSchema = z.object({
        data: z.array(
            z.object({
                id: z.string().length(32),
                sequence: z.string().min(1),
                latitude: z.number(),
                longitude: z.number(),
                bearing: z.number(),
                flipped: z.boolean(),
                shtHash: z.string().length(74),
                creationDate: z.string().transform((d) => parseDataJsonDate(d)),
            })
        ),
    });

    const localDataStr = JSON.parse(
        (await fs.readFile(join(imagesPath, 'data.json'))).toString()
    );
    const localDataParse = localDataJsonSchema.safeParse(localDataStr);
    if (localDataParse.success !== true) {
        console.error(localDataParse.error);
        throw new Error('Unable to parse global data.json');
    }
    const localData = localDataParse.data;

    const webSequences = await fetchSequences();
    const webImageIds = new Set(await fetchImageIds());

    if (webSequences === null || webImageIds === null) {
        console.warn('Unable to fetch web info for sequences and/or image ids');
        return;
    }

    for (const localImage of localData.data) {
        if (webImageIds.has(localImage.id) === true) {
            continue;
        }
        const sequence = webSequences.find(
            (s) => s.name === localImage.sequence
        );
        if (sequence === undefined) {
            console.error(
                `Failed to find sequence: ${localImage.sequence}, skipping image...`
            );
            continue;
        }
        const success = await postNewImage({
            id: localImage.id,
            latitude: localImage.latitude,
            longitude: localImage.longitude,
            bearing: localImage.bearing,
            flipped: localImage.flipped,
            shtHash: localImage.shtHash,
            pitchCorrection: 0,
            createdAt: localImage.creationDate,
            public: false,
            sequenceId: sequence.id,
        });
        if (success !== true) {
            console.warn('Post new image unsuccessful');
            return;
        }
    }
    await patchSequenceStatus({ sequenceId: sequence.id, status: 'done' });
    console.log('Done updating database');
}

export async function processTile(sequence: Sequence) {
    const sequencePath = join(imagesPath, sequence.name);
    if (fs.existsSync(join(sequencePath, 'img'))) {
        const originalCount = await jpgsInDir(join(sequencePath, 'img_blur'));
        const processedCount = await jsonFilesInDir(join(sequencePath, 'img'));
        if (originalCount === processedCount) {
            await patchSequenceStatus({
                sequenceId: sequence.id,
                status: 'sequence',
            });
            const blurPath = join(sequencePath, 'img_blur');
            if (fs.existsSync(blurPath) === true) {
                await fs.remove(blurPath);
            }
            return;
        }
    }
    await new Promise<void>((resolve) => {
        const python = spawn('python', [
            'scripts/process_imgs_new.py',
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
}

export async function processBlur(sequence: Sequence) {
    const sequencePath = join(imagesPath, sequence.name);
    if (!fs.existsSync(join(sequencePath, 'img_blur'))) {
        await fs.mkdir(join(sequencePath, 'img_blur'));
    } else {
        const originalCount = await jpgsInDir(
            join(sequencePath, 'img_original')
        );
        const blurCount = await jpgsInDir(join(sequencePath, 'img_blur'));
        if (originalCount === blurCount) {
            await patchSequenceStatus({
                sequenceId: sequence.id,
                status: 'tile',
            });
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
}

export async function processDelete(sequence: Sequence) {
    const sequencePath = join(imagesPath, sequence.name);
    await fs.remove(sequencePath);
    await deleteSequence(sequence.id);
}
