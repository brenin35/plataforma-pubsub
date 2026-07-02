import client from 'prom-client';

export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

export const eventosPublicados = new client.Counter({
  name: 'eventos_publicados_total',
  help: 'Total de eventos publicados pela API',
  labelNames: ['rota'],
  registers: [registry],
});

export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total de requisicoes HTTP recebidas pela API',
  labelNames: ['metodo', 'rota', 'status'],
  registers: [registry],
});

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_segundos',
  help: 'Duracao das requisicoes HTTP',
  labelNames: ['metodo', 'rota', 'status'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2],
  registers: [registry],
});
