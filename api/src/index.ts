import { PrismaClient } from '@prisma/client';
import express from 'express';
import { Request, Response } from 'express';
import * as dotenv from 'dotenv';
import { z } from 'zod';
import compression from 'compression';

const db = new PrismaClient();

const app = express();
const port = 3000;

dotenv.config();

const apiKey = process.env.API_KEY;
if (apiKey === undefined) {
    throw new Error('API_KEY not set in env');
}

app.use(express.json());
app.use(compression());

app.get('/', (req: Request, res: Response) => {
    res.send('TrailView API');
});

app.get('/images/standard/:imageId?', async (req: Request, res: Response) => {
    if (req.params.imageId === undefined) {
        const images = await db.image.findMany({
            where: { visibility: true, id: req.params.imageId },
            select: {
                id: true,
                sequenceId: true,
                latitude: true,
                longitude: true,
                bearing: true,
                flipped: true,
                pitchCorrection: true,
                visibility: true,
            },
        });
        res.json({
            status: 200,
            imagesStandard: images,
        });
    } else {
        const image = await db.image.findUnique({
            where: { id: req.params.imageId },
            select: {
                id: true,
                sequenceId: true,
                latitude: true,
                longitude: true,
                bearing: true,
                flipped: true,
                pitchCorrection: true,
                visibility: true,
            },
        });
        if (!image || image.visibility === false) {
            return res.json({ status: 400 });
        }
        return res.json({
            status: 200,
            imagesStandard: image,
        });
    }
});

app.get('/images/all/:imageId?', async (req: Request, res: Response) => {
    if (req.params.imageId === undefined) {
        const images = await db.image.findMany({
            select: {
                id: true,
                sequenceId: true,
                latitude: true,
                longitude: true,
                bearing: true,
                flipped: true,
                pitchCorrection: true,
                visibility: true,
            },
        });
        return res.json({
            status: 200,
            imagesAll: images,
        });
    } else {
        const image = await db.image.findUnique({
            where: { id: req.params.imageId },
            select: {
                id: true,
                sequenceId: true,
                latitude: true,
                longitude: true,
                bearing: true,
                flipped: true,
                pitchCorrection: true,
                visibility: true,
            },
        });
        if (!image) {
            return res.json({ status: 400 });
        }
        return res.json({
            status: 200,
            imagesAll: image,
        });
    }
});

app.get('/preview/:imageId', async (req: Request, res: Response) => {
    const image = await db.image.findUnique({
        where: { id: req.params.imageId },
        select: { shtHash: true },
    });
    if (!image) {
        return res.json({ success: false });
    } else {
        return res.json({ success: true, preview: image.shtHash });
    }
});

app.get('/sequences', async (req: Request, res: Response) => {
    const sequences = await db.sequence.findMany({
        select: { name: true, id: true },
    });
    return res.json({ success: true, data: sequences });
});

// app.post('/image/:imageId/public', async (req: Request, res: Response) => {
//     const postBodyType = z.object({
//         apiKey: z.string(),
//         public: z.boolean(),
//     });
//     const postData = postBodyType.safeParse(req.body);
//     if (!postData.success) {
//         return res.sendStatus(400);
//     }
//     if (postData.data.apiKey !== apiKey) {
//         return res.sendStatus(401);
//     }
//     try {
//         await db.image.update({
//             where: { id: req.params.imageId },
//             data: { visibility: postData.data.public },
//         });
//     } catch (e) {
//         console.error(e);
//         return res.sendStatus(500);
//     }
//     return res.json({ success: true });
// });

// app.post('/sequence/:sequenceId/flip', async (req: Request, res: Response) => {
//     const postBodyType = z.object({
//         apiKey: z.string(),
//         flip: z.boolean(),
//     });
//     const postData = postBodyType.safeParse(req.body);
//     if (!postData.success) {
//         return res.sendStatus(400);
//     }
//     if (postData.data.apiKey !== apiKey) {
//         return res.sendStatus(401);
//     }
//     try {
//         await db.image.updateMany({
//             where: { sequenceId: parseInt(req.params.sequenceId) },
//             data: { flipped: postData.data.flip },
//         });
//     } catch (e) {
//         console.error(e);
//         return res.sendStatus(500);
//     }
//     return res.json({ success: true });
// });

// app.post(
//     '/sequence/:sequenceId/public',
//     async (req: Request, res: Response) => {
//         const postBodyType = z.object({
//             apiKey: z.string(),
//             public: z.boolean(),
//         });
//         const postData = postBodyType.safeParse(req.body);
//         if (!postData.success) {
//             return res.sendStatus(400);
//         }
//         if (postData.data.apiKey !== apiKey) {
//             return res.sendStatus(401);
//         }
//         try {
//             await db.image.updateMany({
//                 where: { sequenceId: parseInt(req.params.sequenceId) },
//                 data: { visibility: postData.data.public },
//             });
//         } catch (e) {
//             console.error(e);
//             return res.sendStatus(500);
//         }
//         return res.json({ success: true });
//     }
// );

// app.post('/pitch/:sequenceId', async (req: Request, res: Response) => {
//     const postBodyType = z.object({
//         apiKey: z.string(),
//         pitch: z.number(),
//     });
//     const postData = postBodyType.safeParse(req.body);
//     if (!postData.success) {
//         return res.sendStatus(400);
//     }
//     if (postData.data.apiKey !== apiKey) {
//         return res.sendStatus(401);
//     }
//     try {
//         await db.image.updateMany({
//             where: { sequenceId: parseInt(req.params.sequenceId) },
//             data: { pitchCorrection: postData.data.pitch },
//         });
//     } catch (e) {
//         console.error(e);
//         return res.sendStatus(500);
//     }
//     return res.json({ success: true });
// });

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
