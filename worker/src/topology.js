

export const EXCHANGE = 'academico.events';
export const RETRY_EXCHANGE = 'academico.retry';
export const DLX = 'academico.dlx';

export const RETRY_TTL_MS = 5000;
export const MAX_ATTEMPTS = 3;


export const SUBSCRIBERS = {
  notificacao: ['aluno.cadastrado', 'aluno.matriculado'],
  auditoria: ['aluno.*'],
  relatorio: ['aluno.matriculado'],
};

export const mainQueue = (s) => `q.${s}`;
export const retryQueue = (s) => `q.${s}.retry`;
export const dlq = (s) => `q.${s}.dlq`;

export async function assertTopology(channel) {
  await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
  await channel.assertExchange(RETRY_EXCHANGE, 'direct', { durable: true });
  await channel.assertExchange(DLX, 'direct', { durable: true });

  for (const [s, keys] of Object.entries(SUBSCRIBERS)) {

    await channel.assertQueue(mainQueue(s), { durable: true });

    for (const k of keys) {
      await channel.bindQueue(mainQueue(s), EXCHANGE, k);
    }

    await channel.bindQueue(mainQueue(s), RETRY_EXCHANGE, s);

    await channel.assertQueue(retryQueue(s), {
      durable: true,
      arguments: {
        'x-message-ttl': RETRY_TTL_MS,
        'x-dead-letter-exchange': RETRY_EXCHANGE,
        'x-dead-letter-routing-key': s,
      },
    });

    await channel.assertQueue(dlq(s), { durable: true });
    await channel.bindQueue(dlq(s), DLX, s);
  }
}
