export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Plataforma Pubsub API',
    version: '1.0.0',
    description: 'API produtora - publica eventos em um exchange topic (pub/sub) via RabbitMQ.',
  },
  servers: [{ url: '/' }],
  paths: {
    '/health': {
      get: {
        summary: 'Verifica se a API está no ar',
        responses: {
          200: {
            description: 'API saudável',
            content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'ok' } } } } },
          },
        },
      },
    },
    '/alunos': {
      post: {
        summary: 'Cadastra um aluno e publica o evento aluno.cadastrado',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nome', 'email'],
                properties: {
                  nome: { type: 'string', example: 'Maria Silva' },
                  email: { type: 'string', format: 'email', example: 'maria@example.com' },
                  falharEm: {
                    type: 'string',
                    nullable: true,
                    description: 'Nome do consumidor que deve simular falha ao processar o evento (uso em testes)',
                    example: null,
                  },
                },
              },
            },
          },
        },
        responses: {
          202: {
            description: 'Aluno cadastrado; processamento assíncrono em segundo plano',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    mensagem: { type: 'string' },
                    aluno: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        nome: { type: 'string' },
                        email: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: 'nome e email são obrigatórios' },
          500: { description: 'falha ao processar cadastro' },
        },
      },
    },
    '/matriculas': {
      post: {
        summary: 'Registra uma matrícula e publica o evento aluno.matriculado',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['alunoId', 'curso'],
                properties: {
                  alunoId: { type: 'integer', example: 1 },
                  curso: { type: 'string', example: 'Engenharia de Software' },
                  falharEm: {
                    type: 'string',
                    nullable: true,
                    description: 'Nome do consumidor que deve simular falha ao processar o evento (uso em testes)',
                    example: null,
                  },
                },
              },
            },
          },
        },
        responses: {
          202: {
            description: 'Matrícula registrada; processamento assíncrono em segundo plano',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    mensagem: { type: 'string' },
                    matricula: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        aluno_id: { type: 'integer' },
                        curso: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: 'alunoId e curso são obrigatórios' },
          500: { description: 'falha ao processar matricula' },
        },
      },
    },
    '/metrics': {
      get: {
        summary: 'Métricas Prometheus',
        responses: { 200: { description: 'Métricas no formato text/plain exposto pelo prom-client' } },
      },
    },
  },
};
