import { PrismaClient } from '@prisma/client';
import express from 'express';
const db = new PrismaClient();
const app = express();
const port = 3000;
app.get('/images/standard/:imageId?', async (req, res) => {
    if (req.params.imageId === undefined) {
        const images = await db.images.findMany({
            where: { Visibility: true, Id: req.params.imageId },
        });
        res.json({
            status: 200,
            imagesStandard: images.map((image) => {
                return {
                    id: image.Id,
                    sequenceName: image.SequenceName,
                    latitude: image.Latitude,
                    longitude: image.Longitude,
                    bearing: image.Bearing,
                    flipped: image.Flipped,
                    pitchCorrection: image.PitchCorrection,
                };
            }),
        });
    }
    else {
        const image = await db.images.findUnique({
            where: { Id: req.params.imageId },
        });
        if (!image || image.Visibility === false) {
            return res.json({ status: 400 });
        }
        return res.json({
            status: 200,
            imagesStandard: {
                id: image.Id,
                sequenceName: image.SequenceName,
                latitude: image.Latitude,
                longitude: image.Longitude,
                bearing: image.Bearing,
                flipped: image.Flipped,
                pitchCorrection: image.PitchCorrection,
            },
        });
    }
});
app.get('/images/all/:imageId', async (req, res) => {
    if (req.params.imageId === null) {
        const images = await db.images.findMany();
        res.json({
            status: 200,
            imagesAll: images.map((image) => {
                return {
                    id: image.Id,
                    sequenceName: image.SequenceName,
                    originalName: image.OriginalName,
                    originalLatitude: image.OriginalLatitude,
                    originalLongitude: image.OriginalLongitude,
                    latitude: image.Latitude,
                    longitude: image.Longitude,
                    bearing: image.Bearing,
                    flipped: image.Flipped,
                    shtHash: image.ShtHash,
                    pitchCorrection: image.PitchCorrection,
                    visibility: image.Visibility,
                };
            }),
        });
    }
    else {
        const image = await db.images.findUnique({
            where: { Id: req.params.imageId },
        });
        if (!image) {
            return res.json({ status: 400 });
        }
        return res.json({
            status: 200,
            imagesAll: {
                id: image.Id,
                sequenceName: image.SequenceName,
                originalName: image.OriginalName,
                originalLatitude: image.OriginalLatitude,
                originalLongitude: image.OriginalLongitude,
                latitude: image.Latitude,
                longitude: image.Longitude,
                bearing: image.Bearing,
                flipped: image.Flipped,
                shtHash: image.ShtHash,
                pitchCorrection: image.PitchCorrection,
                visibility: image.Visibility,
            },
        });
    }
});
app.get('/preview/:imageId', async (req, res) => {
    const image = await db.images.findUnique({
        where: { Id: req.params.imageId },
        select: { ShtHash: true },
    });
    if (!image) {
        return res.json({ success: false });
    }
    else {
        return res.json({ success: true, preview: image.ShtHash });
    }
});
// Middleware
app.use(express.json());
// Routes
app.get('/', (req, res) => {
    res.send('Hello, Express!');
});
// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
