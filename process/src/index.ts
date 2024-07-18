import dotEnv from 'dotenv';
import { fetchSequenceStatuses } from './web.js';
import {
    processBlur,
    processDelete,
    processManifest,
    processTile,
} from './process.js';

dotEnv.config();

if (process.env.TV_IMAGES_PATH === undefined) {
    console.log('IMAGES_PATH not overridden, using /trails');
}
if (process.env.TV_WEB_URL === undefined) {
    throw new Error('WEB_URL not specified in env');
}
if (process.env.TV_PROCESS_WEB_API_KEY === undefined) {
    throw new Error('TV_WEB_API_KEY not specified in env');
}

export const imagesPath = process.env.TV_IMAGES_PATH ?? '/trails';
export const webUrl = process.env.TV_WEB_URL;
export const apiKey = process.env.TV_PROCESS_WEB_API_KEY;

async function loop() {
    const sequences = await fetchSequenceStatuses();
    if (sequences === null) {
        throw new Error('Unable to fetch sequence statuses');
    }
    for (const sequence of sequences) {
        if (sequence.toDelete === true) {
            console.log(`=== Start Deleting: "${sequence.name}"===`);
            await processDelete(sequence);
            console.log(`=== End Deleting: "${sequence.name}" ===`);
            return;
        }
        if (sequence.status === 'blur') {
            console.log(`==== Start Blurring Process: "${sequence.name}" ====`);
            await processBlur(sequence);
            console.log(`==== End Blurring Process: "${sequence.name}" ====`);
            return;
        } else if (sequence.status === 'tile') {
            console.log(`==== Start Tiling Process: "${sequence.name}" ====`);
            await processTile(sequence);
            console.log(`==== End Tiling Process: "${sequence.name}" ====`);
            return;
        } else if (sequence.status === 'manifest') {
            console.log(`==== Start Manifest Process: "${sequence.name}" ====`);
            await processManifest(sequence);
            console.log(`==== End Manifest Process: ${sequence.name} ====`);
            return;
        }
    }
    await new Promise((resolve) => setTimeout(resolve, 30 * 1000));
}

console.log('Starting');
(async () => {
    while (true) {
        try {
            await loop();
        } catch (e) {
            console.error(e);
            await new Promise((resolve) => setTimeout(resolve, 30 * 1000));
        }
    }
})();
