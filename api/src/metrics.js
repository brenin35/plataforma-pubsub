import client from 'prom-client';

export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

export const eventosPublicados = new client.Counter({
  name: 'eventos_publicados_total',
  help: 'Total de eventos publicados pela API',
  labelNames: ['rota'],
  registers: [registry],
});
