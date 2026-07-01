import amqp from 'amqplib';
import express from 'express';
import {
  RETRY_EXCHANGE,
  DLX,
  MAX_ATTEMPTS,
  SUBSCRIBERS,
  mainQueue,
  retryQueue,
  assertTopology,
} from './topology.js';
import {
  registry,
  eventosProcessados,
  eventosFalhados,
  eventosDlq,
  latenciaPubProc,
} from './metrics.js';
import { HANDLERS } from './handlers.js';

const RABBIT_URL = process.env.RABBIT_URL || 'amqp://guest:guest@localhost:5672';
const CONSUMER = process.env.CONSUMER;

if (!CONSUMER || !SUBSCRIBERS[CONSUMER]) {
  console.error(`[worker] CONSUMER invalido: "${CONSUMER}". Use: ${Object.keys(SUBSCRIBERS).join(', ')}`);
  process.exit(1);
}

async function connectRabbit(retries = 15, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await amqp.connect(RABBIT_URL);
      conn.on('error', (e) => console.error(`[${CONSUMER}] erro:`, e.message));
      const channel = await conn.createChannel();
      await assertTopology(channel);
      return channel;
    } catch (err) {
      console.log(`[${CONSUMER}] tentativa ${attempt}/${retries}: ${err.message}`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error(`[${CONSUMER}] nao foi possivel conectar ao broker`);
}

async function start() {
  const channel = await connectRabbit();
  await channel.prefetch(1);
  const fila = mainQueue(CONSUMER);
  console.log(`[${CONSUMER}] consumindo ${fila}`);

  await channel.consume(fila, async (msg) => {
    if (!msg) return;
    const evento = JSON.parse(msg.content.toString());
    const tentativa = Number(msg.properties.headers?.['x-attempt'] || 0);

    if (evento.publishedAt) {
      latenciaPubProc.observe({ consumidor: CONSUMER }, (Date.now() - evento.publishedAt) / 1000);
    }

    try {
      if (evento.falharEm === CONSUMER) throw new Error('falha simulada');
      await HANDLERS[CONSUMER](evento);
      eventosProcessados.inc({ consumidor: CONSUMER });
      channel.ack(msg);
    } catch (err) {
      eventosFalhados.inc({ consumidor: CONSUMER });
      const proxima = tentativa + 1;
      const headers = { ...msg.properties.headers, 'x-attempt': proxima };

      if (proxima < MAX_ATTEMPTS) {
        console.log(`[${CONSUMER}] falha (${err.message}); retry ${proxima}/${MAX_ATTEMPTS - 1}`);
        channel.sendToQueue(retryQueue(CONSUMER), msg.content, { persistent: true, headers });
      } else {
        console.log(`[${CONSUMER}] esgotou tentativas -> DLQ`);
        eventosDlq.inc({ consumidor: CONSUMER });
        channel.publish(DLX, CONSUMER, msg.content, { persistent: true, headers });
      }
      channel.ack(msg);
    }
  });
}

const app = express();
app.get('/health', (_req, res) => res.json({ status: 'ok', consumidor: CONSUMER }));
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});
app.listen(Number(process.env.METRICS_PORT || 9100), () =>
  console.log(`[${CONSUMER}] metrics em :${process.env.METRICS_PORT || 9100}`)
);

start().catch((err) => {
  console.error(`[${CONSUMER}] falha ao iniciar:`, err);
  process.exit(1);
});
