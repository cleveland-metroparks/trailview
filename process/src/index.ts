import { PrismaClient, Sequence } from '@prisma/client';
import { spawn } from 'child_process';
import dotEnv from 'dotenv';
import fs from 'fs-extra';
import { join } from 'path';
import type { Image } from '@prisma/client';

dotEnv.config();

const db = new PrismaClient();

if (process.env.IMAGES_PATH === undefined) {
    throw new Error('IMAGES_PATH not specified in env');
}
const IMAGES_PATH = process.env.IMAGES_PATH;

function parseCustomDateTime(dateTimeString: string): Date | null {
    // Convert the custom format to ISO 8601 format
    const isoDateTimeString = dateTimeString.replace(' ', 'T') + '-04:00'; // Assuming New York timezone offset is UTC-4

    // Parse the ISO 8601 formatted string
    const parsedDate = new Date(isoDateTimeString);

    // Check if parsing was successful
    if (isNaN(parsedDate.getTime())) {
        return null; // Parsing failed
    }

    return parsedDate;
}

async function countJpgs(dir: string) {
    const files = await fs.readdir(dir);
    const jpgs = files.filter((file) => {
        return (
            file.toLowerCase().endsWith('.jpg') ||
            file.toLowerCase().endsWith('.jpeg')
        );
    });
    return jpgs.length;
}

async function countJsons(dir: string) {
    const files = await fs.readdir(dir);
    const jsons = files.filter((file) => {
        return file.toLowerCase().endsWith('.json');
    });
    return jsons.length;
}

async function processSequence(sequence: Sequence) {
    const sequencePath = join(IMAGES_PATH, sequence.name);
    await new Promise<void>((resolve) => {
        console.log('=== Start Sequencing Process ===');
        const python = spawn('python', [
            'scripts/process_sequence_new.py',
            sequencePath,
            '--no-flip',
        ]);
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
    console.log('=== End Sequencing Process ===');
    await new Promise<void>((resolve) => {
        console.log('=== Start Data Process ===');
        const python = spawn('python', [
            'scripts/process_data.py',
            IMAGES_PATH,
        ]);
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
    console.log('=== End Data Process ===');
    console.log('=== Start Updating DB ===');

    const masterData = JSON.parse(
        (await fs.readFile(join(IMAGES_PATH, 'data.json'))).toString()
    ) as {
        data: {
            id: string;
            sequence: string;
            latitude: number;
            longitude: number;
            bearing: number;
            flipped: boolean;
            creationDate?: string;
            shtHash: string;
        }[];
    };

    const sequences = await db.sequence.findMany();
    const currentImages = await db.image.findMany();
    const currentImagesIndex = new Map<string, Image>();
    currentImages.forEach((image) => {
        currentImagesIndex.set(image.id, image);
    });

    for (const image of masterData.data) {
        if (currentImagesIndex.has(image.id) === true) {
            continue;
        }
        const sequence = sequences.find((sequence) => {
            return sequence.name === image.sequence;
        });
        if (sequence === undefined) {
            console.error(`Failed to find sequence: ${image.sequence}`);
            continue;
        }
        await db.image.create({
            data: {
                id: image.id,
                originalLatitude: image.latitude,
                originalLongitude: image.longitude,
                latitude: image.latitude,
                longitude: image.longitude,
                bearing: image.bearing,
                flipped: image.flipped,
                shtHash: image.shtHash,
                pitchCorrection: 0,
                createdAt:
                    image.creationDate !== undefined
                        ? parseCustomDateTime(image.creationDate)
                        : null,
                visibility: false,
                sequenceId: sequence.id,
            },
        });
    }
    console.log('=== End Updating DB ===');
    await db.sequence.update({
        where: { id: sequence.id },
        data: { status: 'Done' },
    });
}

async function processTile(sequence: Sequence) {
    const sequencePath = join(IMAGES_PATH, sequence.name);
    if (fs.existsSync(join(sequencePath, 'img'))) {
        const originalCount = await countJpgs(join(sequencePath, 'img_blur'));
        const processedCount = await countJsons(join(sequencePath, 'img'));
        if (originalCount === processedCount) {
            await db.sequence.update({
                where: { id: sequence.id },
                data: { status: 'Sequence' },
            });
            const blurPath = join(sequencePath, 'img_blur');
            if (fs.existsSync(blurPath) === true) {
                await fs.remove(blurPath);
            }
            return;
        }
    }
    await new Promise<void>((resolve) => {
        console.log('=== Start Tiling Process ===');
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
            console.log(`${data}`);
        });
        python.on('close', () => {
            resolve();
        });
    });
    console.log('=== End Tiling Process ===');
}

async function processBlur(sequence: Sequence) {
    const sequencePath = join(IMAGES_PATH, sequence.name);
    if (!fs.existsSync(join(sequencePath, 'img_blur'))) {
        await fs.mkdir(join(sequencePath, 'img_blur'));
    } else {
        const originalCount = await countJpgs(
            join(sequencePath, 'img_original')
        );
        const blurCount = await countJpgs(join(sequencePath, 'img_blur'));
        if (originalCount === blurCount) {
            await db.sequence.update({
                where: { id: sequence.id },
                data: { status: 'Tile' },
            });
            return;
        }
    }
    await new Promise<void>((resolve) => {
        console.log('=== Start Blurring Process ===');
        const blurProcess = spawn(
            'scripts/blur360/build/src/equirect-blur-image.exe',
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
            console.log(`${data}`);
        });
        blurProcess.on('close', () => {
            resolve();
        });
    });
    console.log('=== End Blurring Process ===');
}

async function processDelete(sequence: Sequence) {
    const sequencePath = join(IMAGES_PATH, sequence.name);
    console.log('=== Start Deleting ===');

    await fs.remove(sequencePath);
    const sequenceQuery = await db.sequence.findUnique({
        where: { id: sequence.id },
        include: { images: { select: { id: true } } },
    });
    if (sequenceQuery === null) {
        console.error(`Sequence id is invalid: ${sequence.id}`);
        return;
    }
    for (const i of sequenceQuery.images) {
        await db.$queryRaw`DELETE FROM "_ImageGroupRelation" WHERE "B" = ${i.id};`;
    }
    await db.analytics.deleteMany({
        where: { imageId: { in: sequenceQuery.images.map((i) => i.id) } },
    });
    await db.image.deleteMany({ where: { sequenceId: sequence.id } });
    await db.sequence.delete({ where: { id: sequence.id } });

    console.log('=== End Deleting ===');
}

async function loop() {
    const sequences = await db.sequence.findMany();
    for (const sequence of sequences) {
        if (sequence.toDelete === true) {
            await processDelete(sequence);
            return;
        }
        if (sequence.status === 'Sequence') {
            await processSequence(sequence);
            return;
        } else if (sequence.status === 'Tile') {
            await processTile(sequence);
            return;
        } else if (sequence.status === 'Blur') {
            await processBlur(sequence);
            return;
        }
    }
}

(async () => {
    // eslint-disable-next-line no-constant-condition
    while (true) {
        await loop();
        await new Promise<void>((resolve) => {
            setTimeout(resolve, 1000 * 30);
        });
    }
})();
