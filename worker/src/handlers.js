export const HANDLERS = {
  notificacao: async (evento) => {
    await new Promise((r) => setTimeout(r, 100));
    console.log(`[notificacao] e-mail enviado (${evento.tipo}) aluno ${evento.alunoId}`);
  },
  auditoria: async (evento) => {
    await new Promise((r) => setTimeout(r, 50));
    console.log(`[auditoria] registro gravado (${evento.tipo})`);
  },
  relatorio: async (evento) => {
    await new Promise((r) => setTimeout(r, 150));
    console.log(`[relatorio] relatorio gerado para matricula ${evento.matriculaId}`);
  },
};
