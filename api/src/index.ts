import { PrismaClient } from '@prisma/client';
import express from 'express';
import { Request, Response } from 'express';

const db = new PrismaClient();

const app = express();
const port = 3000;

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

app.get('/images/all/:imageId', async (req: Request, res: Response) => {
    if (req.params.imageId === null) {
        const images = await db.image.findMany();
        res.json({
            status: 200,
            imagesAll: images,
        });
    } else {
        const image = await db.image.findUnique({
            where: { id: req.params.imageId },
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

// Middleware
app.use(express.json());

// Routes
app.get('/', (req: Request, res: Response) => {
    res.send('Hello, Express!');
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
