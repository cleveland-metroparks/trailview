import { PrismaClient, Sequence } from '@prisma/client';

const db = new PrismaClient();

function processSequence(sequence: Sequence) {
    // TODO
}

async function loop() {
    const sequences = await db.sequence.findMany({
        where: { status: { not: 'Done' } },
    });
    sequences.forEach((sequence) => {
        if (sequence.status === 'Sequences') {
            processSequence(sequence);
        }
    });
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
