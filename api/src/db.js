import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'app',
  password: process.env.PGPASSWORD || 'app',
  database: process.env.PGDATABASE || 'academico',
});

export async function initDb(retries = 15, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS alunos (
          id SERIAL PRIMARY KEY,
          nome TEXT NOT NULL,
          email TEXT NOT NULL,
          criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS matriculas (
          id SERIAL PRIMARY KEY,
          aluno_id INTEGER NOT NULL,
          curso TEXT NOT NULL,
          criada_em TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `);
      console.log('[db] conectado e tabelas prontas');
      return;
    } catch (err) {
      console.log(`[db] tentativa ${attempt}/${retries}: ${err.message}`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error('[db] nao foi possivel conectar ao banco');
}

export async function inserirAluno(nome, email) {
  const { rows } = await pool.query(
    'INSERT INTO alunos (nome, email) VALUES ($1, $2) RETURNING id, nome, email',
    [nome, email]
  );
  return rows[0];
}

export async function inserirMatricula(alunoId, curso) {
  const { rows } = await pool.query(
    'INSERT INTO matriculas (aluno_id, curso) VALUES ($1, $2) RETURNING id, aluno_id, curso',
    [alunoId, curso]
  );
  return rows[0];
}
