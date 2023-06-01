import { PrismaClient, Sequence } from '@prisma/client';
import { spawn } from 'child_process';
import dotEnv from 'dotenv';
import fs from 'fs-extra';
import { join } from 'path';

dotEnv.config();

const db = new PrismaClient();

if (process.env.IMAGES_PATH === undefined) {
    throw new Error('IMAGES_PATH not specified in env');
}
const IMAGES_PATH = process.env.IMAGES_PATH;

function runPython(args: string[]) {
    return new Promise<void>((resolve) => {
        const python = spawn('python', args);
        python.on('close', () => {
            resolve();
        });
    });
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

function processSequence(sequence: Sequence) {
    // TODO
}

async function processBlur(sequence: Sequence) {
    console.log('processBlur called');
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
        console.log('Starting process');
        const blurProcess = spawn(
            'scripts/blur360/build/src/equirect-blur-image.exe',
            [
                '--blur=true',
                '-m=scripts/blur360/models',
                `-o=${join(sequencePath, 'img_blur')}`,
                join(sequencePath, 'img_original'),
            ]
        );
        blurProcess.on('close', () => {
            resolve();
        });
    });
    console.log('blur process finished');
}

async function loop() {
    const sequences = await db.sequence.findMany({
        where: { status: { not: 'Done' } },
    });
    for (const sequence of sequences) {
        if (sequence.status === 'Sequences') {
            processSequence(sequence);
            return;
        } else if (sequence.status === 'Tile') {
            console.log('TILE!');
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
            setTimeout(resolve, 1000 * 10);
        });
    }
})();
