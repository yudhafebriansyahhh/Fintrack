import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import qrcode from 'qrcode-terminal';
import pkg from 'whatsapp-web.js';

const { Client, LocalAuth } = pkg;

const PORT = Number(process.env.PORT ?? 4000);
const GATEWAY_TOKEN =
    process.env.GATEWAY_TOKEN ?? process.env.SHARED_TOKEN ?? '';
const FINTRACK_WEBHOOK =
    process.env.FINTRACK_WEBHOOK_URL ?? process.env.FINTRACK_WEBHOOK ?? '';
const FINTRACK_WEBHOOK_TOKEN = process.env.FINTRACK_WEBHOOK_TOKEN ?? '';
const SESSION_PATH = process.env.SESSION_PATH ?? './session';

if (!GATEWAY_TOKEN) {
    console.warn('GATEWAY_TOKEN/SHARED_TOKEN tidak diset, /messages tidak akan menerima request.');
}
if (!FINTRACK_WEBHOOK) {
    console.warn('FINTRACK_WEBHOOK_URL belum diset, pesan masuk tidak akan diteruskan.');
}

const app = express();
app.use(express.json({ limit: '1mb' }));

const requireAuth = (req, res, next) => {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : header;
    if (!GATEWAY_TOKEN || token !== GATEWAY_TOKEN) {
        return res.status(401).json({ error: 'unauthorized' });
    }
    return next();
};

const wa = new Client({
    authStrategy: new LocalAuth({ dataPath: SESSION_PATH }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
});

let lifecycle = 'init';
let lastError = null;

const setStage = (stage) => {
    lifecycle = stage;
    console.log('lifecycle:', stage);
};

wa.on('qr', (qr) => {
    setStage('qr');
    console.log('Scan QR di bawah ini dengan akun bot WhatsApp:');
    qrcode.generate(qr, { small: true });
});

wa.on('loading_screen', (percent, message) => {
    setStage(`loading:${percent}%`);
    if (message) {
        console.log('  ', message);
    }
});

wa.on('authenticated', () => {
    setStage('authenticated');
});

wa.on('auth_failure', (msg) => {
    setStage('auth_failure');
    lastError = msg;
    console.error('Auth failure:', msg);
});

wa.on('ready', () => {
    setStage('ready');
    console.log('WhatsApp client siap.');
});

wa.on('disconnected', (reason) => {
    setStage('disconnected');
    lastError = reason;
    console.warn('Client disconnected:', reason);
});

const readyStates = new Set(['ready', 'authenticated']);

const isReady = async () => {
    if (lifecycle === 'ready') {
        return true;
    }

    try {
        const state = await wa.getState();
        if (state === 'CONNECTED') {
            setStage('ready');
            return true;
        }
        return false;
    } catch (error) {
        return readyStates.has(lifecycle);
    }
};

const inboundCache = new Map();

const resolvePhone = async (message) => {
    try {
        const contact = await message.getContact();
        if (contact?.number) {
            return String(contact.number).replace(/\D+/g, '');
        }
    } catch (_error) {
        // ignore lookup failure
    }

    const raw = String(message.from ?? '');
    const fallback = raw.split('@')[0] ?? '';
    return fallback.replace(/\D+/g, '');
};

const handleIncoming = async (message, label = 'message') => {
    if (message.fromMe) {
        console.log(`[${label}] dilewati (fromMe)`);
        return;
    }

    const messageId = message.id?._serialized ?? null;
    if (messageId) {
        if (inboundCache.has(messageId)) {
            return;
        }
        inboundCache.set(messageId, Date.now());
        if (inboundCache.size > 200) {
            const oldest = inboundCache.keys().next().value;
            inboundCache.delete(oldest);
        }
    }

    const chatId = message.from ?? '';
    const phone = (await resolvePhone(message)) || chatId;
    console.log(`[${label}] dari ${phone} (chat ${chatId}) : ${(message.body ?? '').slice(0, 80)}`);

    if (!FINTRACK_WEBHOOK) {
        console.warn('FINTRACK_WEBHOOK_URL kosong, pesan tidak diteruskan.');
        return;
    }

    try {
        const res = await axios.post(
            FINTRACK_WEBHOOK,
            {
                phone,
                chat_id: chatId,
                message: message.body ?? '',
                provider_message_id: messageId,
            },
            {
                headers: FINTRACK_WEBHOOK_TOKEN
                    ? { 'X-Webhook-Token': FINTRACK_WEBHOOK_TOKEN }
                    : {},
                timeout: 15000,
                validateStatus: () => true,
            },
        );
        console.log(`  webhook -> ${res.status}`);
        if (res.status >= 400) {
            console.warn('  body:', res.data);
        }
    } catch (error) {
        console.error('Gagal forward inbound:', error.message);
    }
};

wa.on('message', (message) => handleIncoming(message, 'message'));
wa.on('message_create', (message) => {
    if (message.fromMe) return;
    handleIncoming(message, 'message_create');
});

app.get('/health', async (_req, res) => {
    let providerState = null;
    try {
        providerState = await wa.getState();
    } catch (error) {
        providerState = `error:${error.message}`;
    }

    res.json({
        status: 'ok',
        lifecycle,
        provider_state: providerState,
        last_error: lastError,
    });
});

const buildChatId = ({ chatId, phone }) => {
    if (chatId && /[@]/.test(chatId)) {
        return chatId;
    }
    const fallback = chatId ?? phone ?? '';
    const digits = String(fallback).replace(/\D+/g, '');
    if (!digits) return null;
    if (digits.startsWith('62')) {
        return `${digits}@c.us`;
    }
    return `62${digits.replace(/^0/, '')}@c.us`;
};

app.post('/messages', requireAuth, async (req, res) => {
    const { phone, message, reference_id: referenceId, chat_id: chatIdInput } = req.body ?? {};
    if ((!phone && !chatIdInput) || !message) {
        return res.status(422).json({ error: 'phone/chat_id dan message wajib diisi' });
    }

    if (!(await isReady())) {
        return res.status(503).json({
            error: 'client belum siap',
            lifecycle,
            last_error: lastError,
        });
    }

    const targetId = buildChatId({ chatId: chatIdInput, phone });
    if (!targetId) {
        return res.status(422).json({ error: 'phone/chat_id tidak valid' });
    }

    try {
        const sent = await wa.sendMessage(targetId, message, { sendSeen: false });
        return res.json({
            id: sent.id?._serialized ?? null,
            reference_id: referenceId ?? null,
            status: 'sent',
        });
    } catch (error) {
        console.error('send error', error.message);
        return res.status(502).json({ error: error.message });
    }
});

wa.initialize().catch((error) => {
    console.error('Gagal init WhatsApp client', error);
    process.exit(1);
});

app.listen(PORT, () => {
    console.log(`Gateway listen di http://localhost:${PORT}`);
});