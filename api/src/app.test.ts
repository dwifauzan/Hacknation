import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from './app.js';

const app = createApp();

describe('HackNation API foundation', () => {
    it('reports a healthy service', async () => {
        const response = await request(app).get('/health');

        assert.equal(response.status, 200);
        assert.deepEqual(response.body, {
            status: 'ok',
            service: 'hacknation-api',
        });
    });

    it('returns Kanban metadata', async () => {
        const response = await request(app).get('/api/v1/kanban/tasks');

        assert.equal(response.status, 200);
        assert.equal(response.body.meta.statuses.backlog, 'Backlog');
        assert.equal(response.body.meta.priorities.urgent, 'Urgent');
    });

    it('rejects invalid WhatsApp messages before contacting the service', async () => {
        const response = await request(app)
            .post('/api/v1/whatsapp/messages')
            .send({ target: 'not a phone', pesan: '' });

        assert.equal(response.status, 422);
    });

    it('returns an empty Instagram account state when no account exists', async () => {
        const response = await request(app).get('/api/v1/instagram/account');

        assert.equal(response.status, 200);
        assert.ok(Object.hasOwn(response.body, 'data'));
    });
});
