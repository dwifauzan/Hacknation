import cors from 'cors';
import express from 'express';
import instagramRouter from './routes/instagram.js';
import whatsappRouter from './routes/whatsapp.js';

export function createApp() {
    const app = express();

    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use('/api/v1/instagram', instagramRouter);
    app.use('/api/v1/whatsapp', whatsappRouter);

    app.get('/health', (_request, response) => {
        response.json({
            status: 'ok',
            service: 'hacknation-api',
        });
    });

    return app;
}
