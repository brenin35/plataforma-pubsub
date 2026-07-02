export const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function seedAluno(base = BASE_URL) {
  const res = await fetch(`${base}/alunos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome: 'Cenario Teste', email: `cenario-${Date.now()}@teste.com` }),
  });
  const { aluno } = await res.json();
  return aluno.id;
}

export async function postMatricula({ alunoId, curso, falharEm = null, base = BASE_URL }) {
  const res = await fetch(`${base}/matriculas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alunoId, curso, falharEm }),
  });
  return { status: res.status, body: await res.json() };
}
