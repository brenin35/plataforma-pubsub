import amqp from 'amqplib';
import { EXCHANGE, assertTopology } from './topology.js';

const RABBIT_URL = process.env.RABBIT_URL || 'amqp://guest:guest@localhost:5672';

let channel = null;

export async function connectRabbit(retries = 15, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await amqp.connect(RABBIT_URL);
      conn.on('error', (e) => console.error('[rabbit] erro:', e.message));
      conn.on('close', () => console.error('[rabbit] conexao fechada'));
      channel = await conn.createConfirmChannel();
      await assertTopology(channel);
      console.log('[rabbit] conectado e topologia declarada');
      return channel;
    } catch (err) {
      console.log(`[rabbit] tentativa ${attempt}/${retries}: ${err.message}`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error('[rabbit] nao foi possivel conectar ao broker');
}

export async function publishEvent(routingKey, payload) {
  if (!channel) throw new Error('canal RabbitMQ indisponivel');
  const body = Buffer.from(JSON.stringify({ ...payload, publishedAt: Date.now() }));
  await new Promise((resolve, reject) => {
    channel.publish(
      EXCHANGE,
      routingKey,
      body,
      { persistent: true, contentType: 'application/json', headers: { 'x-attempt': 0 } },
      (err) => (err ? reject(err) : resolve())
    );
  });
}
