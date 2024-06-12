import dotEnv from 'dotenv';
import { fetchSequenceStatuses } from './web.js';
import {
    processBlur,
    processDelete,
    processSequence,
    processTile,
} from './process.js';
import cron from 'node-cron';

dotEnv.config();

if (process.env.IMAGES_PATH === undefined) {
    throw new Error('IMAGES_PATH not specified in env');
}
if (process.env.WEB_URL === undefined) {
    throw new Error('WEB_URL not specified in env');
}
if (process.env.WEB_API_KEY === undefined) {
    throw new Error('WEB_API_KEY not specified in env');
}

export const imagesPath = process.env.IMAGES_PATH;
export const webUrl = process.env.WEB_URL;
export const apiKey = process.env.WEB_API_KEY;

async function loop() {
    const sequences = await fetchSequenceStatuses();
    if (sequences === null) {
        console.warn('Unable to fetch sequence statuses');
        return;
    }
    for (const sequence of sequences) {
        if (sequence.toDelete === true) {
            await processDelete(sequence);
            return;
        }
        if (sequence.status === 'sequence') {
            await processSequence(sequence);
            return;
        } else if (sequence.status === 'tile') {
            await processTile(sequence);
            return;
        } else if (sequence.status === 'blur') {
            await processBlur(sequence);
            return;
        }
    }
}

console.log('Starting');
(async () => {
    await loop();
    cron.schedule('* * * * *', async () => {
        await loop();
    });
})();
