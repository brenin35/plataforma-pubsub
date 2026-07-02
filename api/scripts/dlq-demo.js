import { seedAluno, postMatricula, sleep } from './lib.js';

// Cenario: forca falha permanente em um assinante (falharEm) para mostrar
// retry (TTL 5s, ate 2 retries antes de MAX_ATTEMPTS=3) e, depois, a
// mensagem caindo na DLQ. O script acompanha via API de management do
// RabbitMQ a profundidade de q.<consumidor>, q.<consumidor>.retry e
// q.<consumidor>.dlq, para deixar visivel no terminal (alem do painel web)
// que a mensagem realmente passa pela fila de retry antes da DLQ.

const COUNT = Number(process.env.COUNT || 20);
const CONSUMIDOR = process.env.CONSUMIDOR || 'relatorio'; // notificacao | auditoria | relatorio
const CURSO = process.env.CURSO || 'Engenharia de Software';
const INTERVAL_MS = Number(process.env.INTERVAL_MS || 300); // intervalo entre posts (rajada controlada)
const MONITOR_MS = Number(process.env.MONITOR_MS || 30000); // quanto tempo acompanhar as filas depois da rajada
const MONITOR_POLL_MS = Number(process.env.MONITOR_POLL_MS || 1000);

const RABBIT_MGMT_URL = process.env.RABBIT_MGMT_URL || 'http://localhost:15672';
const RABBIT_USER = process.env.RABBIT_USER || 'guest';
const RABBIT_PASS = process.env.RABBIT_PASS || 'guest';
const AUTH = 'Basic ' + Buffer.from(`${RABBIT_USER}:${RABBIT_PASS}`).toString('base64');
const VHOST = encodeURIComponent(process.env.RABBIT_VHOST || '/');

async function queueDepth(nome) {
  try {
    const res = await fetch(`${RABBIT_MGMT_URL}/api/queues/${VHOST}/${encodeURIComponent(nome)}`, {
      headers: { Authorization: AUTH },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.messages ?? 0;
  } catch {
    return null;
  }
}

async function run() {
  const alunoId = await seedAluno();
  console.log(`[dlq-demo] alunoId=${alunoId}`);
  console.log(`[dlq-demo] forcando falha em "${CONSUMIDOR}" para ${COUNT} matricula(s), 1 a cada ${INTERVAL_MS}ms`);
  console.log(`[dlq-demo] logs: docker compose logs -f worker-${CONSUMIDOR}\n`);

  for (let i = 1; i <= COUNT; i++) {
    const { status, body } = await postMatricula({ alunoId, curso: CURSO, falharEm: CONSUMIDOR });
    console.log(`[dlq-demo] ${i}/${COUNT} -> status=${status} matriculaId=${body.matricula?.id} (falharEm=${CONSUMIDOR})`);
    if (i < COUNT) await sleep(INTERVAL_MS);
  }

  const principal = `q.${CONSUMIDOR}`;
  const retry = `q.${CONSUMIDOR}.retry`;
  const dlq = `q.${CONSUMIDOR}.dlq`;

  console.log(`\n[dlq-demo] rajada enviada. Acompanhando filas por ${MONITOR_MS / 1000}s`);
  console.log('[dlq-demo] esperado: principal->retry (oscila a cada ~5s) ->dlq (sobe aos poucos)\n');
  console.log('tempo(s)\tprincipal\tretry\tdlq');

  const inicio = Date.now();
  while (Date.now() - inicio < MONITOR_MS) {
    const [p, r, d] = await Promise.all([queueDepth(principal), queueDepth(retry), queueDepth(dlq)]);
    const t = ((Date.now() - inicio) / 1000).toFixed(1);
    if (p === null) {
      console.log(`${t}\t(painel de management indisponivel em ${RABBIT_MGMT_URL} - confira manualmente)`);
      break;
    }
    console.log(`${t}\t${p}\t${r}\t${d}`);
    await sleep(MONITOR_POLL_MS);
  }

  console.log('\n[dlq-demo] fim. Confira tambem o painel web: ' + RABBIT_MGMT_URL + ' -> Queues.');
}

run().catch((err) => {
  console.error('[dlq-demo] falha:', err);
  process.exit(1);
});
