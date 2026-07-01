import client from 'prom-client';

export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

export const eventosProcessados = new client.Counter({
  name: 'eventos_processados_total',
  help: 'Eventos processados com sucesso',
  labelNames: ['consumidor'],
  registers: [registry],
});

export const eventosFalhados = new client.Counter({
  name: 'eventos_falhados_total',
  help: 'Falhas de processamento (cada tentativa)',
  labelNames: ['consumidor'],
  registers: [registry],
});

export const eventosDlq = new client.Counter({
  name: 'eventos_dlq_total',
  help: 'Eventos enviados para a DLQ',
  labelNames: ['consumidor'],
  registers: [registry],
});

export const latenciaPubProc = new client.Histogram({
  name: 'latencia_publicacao_processamento_segundos',
  help: 'Tempo entre publicacao e processamento',
  labelNames: ['consumidor'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [registry],
});
