import autocannon from 'autocannon';
import { BASE_URL, seedAluno } from './lib.js';

const DURATION = Number(process.env.DURATION || 60);
const CONNECTIONS = Number(process.env.CONNECTIONS || 30);

async function run() {
  const alunoId = await seedAluno();
  console.log(`[loadtest] usando alunoId=${alunoId}, duracao=${DURATION}s, conexoes=${CONNECTIONS}`);

  const instance = autocannon({
    url: BASE_URL,
    connections: CONNECTIONS,
    duration: DURATION,
    requests: [
      {
        method: 'POST',
        path: '/alunos',
        headers: { 'content-type': 'application/json' },
        setupRequest: (req) => {
          req.body = JSON.stringify({ nome: 'Carga Teste', email: `carga-${Date.now()}-${Math.random()}@teste.com` });
          return req;
        },
      },
      {
        method: 'POST',
        path: '/matriculas',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ alunoId, curso: 'Engenharia de Software' }),
      },
    ],
  });

  autocannon.track(instance, { renderProgressBar: true });

  instance.on('done', (result) => {
    console.log('\n[loadtest] resumo:');
    console.log(`  requisicoes/s (media): ${result.requests.average}`);
    console.log(`  latencia p50/p99 (ms): ${result.latency.p50} / ${result.latency.p99}`);
    console.log(`  2xx: ${result['2xx']}  erros: ${result.errors}  timeouts: ${result.timeouts}`);
  });
}

run().catch((err) => {
  console.error('[loadtest] falha:', err);
  process.exit(1);
});
