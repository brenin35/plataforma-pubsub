import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { connectRabbit, publishEvent } from './rabbit.js';
import { initDb, inserirAluno, inserirMatricula } from './db.js';
import { registry, eventosPublicados, httpRequestsTotal, httpRequestDuration } from './metrics.js';
import { openapiSpec } from './openapi.js';

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const fim = httpRequestDuration.startTimer();
  res.on('finish', () => {
    const rota = req.route?.path || req.path;
    const labels = { metodo: req.method, rota, status: res.statusCode };
    httpRequestsTotal.inc(labels);
    fim(labels);
  });
  next();
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));
app.get('/openapi.json', (_req, res) => res.json(openapiSpec));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/alunos', async (req, res) => {
  const { nome, email, falharEm = null } = req.body || {};
  if (!nome || !email) return res.status(400).json({ erro: 'nome e email sao obrigatorios' });
  try {
    const aluno = await inserirAluno(nome, email);
    await publishEvent('aluno.cadastrado', {
      tipo: 'AlunoCadastrado',
      alunoId: aluno.id,
      nome: aluno.nome,
      email: aluno.email,
      falharEm,
    });
    eventosPublicados.inc({ rota: 'aluno.cadastrado' });
    return res.status(202).json({ mensagem: 'Aluno cadastrado; tarefas em segundo plano.', aluno });
  } catch (err) {
    console.error('[api] erro:', err.message);
    return res.status(500).json({ erro: 'falha ao processar cadastro' });
  }
});

app.post('/matriculas', async (req, res) => {
  const { alunoId, curso, falharEm = null } = req.body || {};
  if (!alunoId || !curso) return res.status(400).json({ erro: 'alunoId e curso sao obrigatorios' });
  try {
    const matricula = await inserirMatricula(alunoId, curso);
    await publishEvent('aluno.matriculado', {
      tipo: 'AlunoMatriculado',
      matriculaId: matricula.id,
      alunoId: matricula.aluno_id,
      curso: matricula.curso,
      falharEm,
    });
    eventosPublicados.inc({ rota: 'aluno.matriculado' });
    return res.status(202).json({ mensagem: 'Matricula registrada; tarefas em segundo plano.', matricula });
  } catch (err) {
    console.error('[api] erro:', err.message);
    return res.status(500).json({ erro: 'falha ao processar matricula' });
  }
});

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});

const PORT = Number(process.env.PORT || 3000);

async function start() {
  await initDb();
  await connectRabbit();
  app.listen(PORT, () => console.log(`[api] ouvindo na porta ${PORT}`));
}

start().catch((err) => {
  console.error('[api] falha ao iniciar:', err);
  process.exit(1);
});
