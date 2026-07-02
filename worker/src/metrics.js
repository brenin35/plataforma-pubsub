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

export const eventosRetry = new client.Counter({
  name: 'eventos_retry_total',
  help: 'Reenvios para a fila de retry (antes de esgotar tentativas)',
  labelNames: ['consumidor', 'tentativa'],
  registers: [registry],
});

export const processamentoDuracao = new client.Histogram({
  name: 'processamento_duracao_segundos',
  help: 'Tempo gasto executando o handler de cada evento (sucesso ou falha)',
  labelNames: ['consumidor', 'resultado'],
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [registry],
});

export const latenciaPubProc = new client.Histogram({
  name: 'latencia_publicacao_processamento_segundos',
  help: 'Tempo entre publicacao e processamento',
  labelNames: ['consumidor'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [registry],
});
