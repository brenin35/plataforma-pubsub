# Plataforma Acadêmica — Pub/Sub com RabbitMQ

Arquitetura orientada a eventos para o trabalho de Arquitetura de Software.
Um único evento de negócio (cadastro ou matrícula) é **publicado** e o broker
faz **fan-out** para vários assinantes independentes — notificação, auditoria e
relatório — cada um com sua própria fila, retry e DLQ.

## Por que RabbitMQ (pub/sub de broker)

O cenário é fan-out: um produtor, vários consumidores. Um broker resolve isso
**no nível da infraestrutura** — o assinante se registra via _binding_ e o
produtor publica um evento sem saber quem consome. Adicionar um novo assinante
não exige tocar no produtor. É o pub/sub "de verdade", diferente de um fan-out
feito em código de aplicação.

Usamos um exchange `topic`, que ainda permite **roteamento seletivo**: cada
assinante escolhe quais eventos quer ouvir através de routing keys.

## Stack

| Camada          | Tecnologia                       |
| --------------- | -------------------------------- |
| Broker          | RabbitMQ (exchange topic + DLX)  |
| Produtor / API  | Node.js + Express                |
| Consumidores    | Node.js + amqplib (3 assinantes) |
| Banco           | PostgreSQL                       |
| Observabilidade | Prometheus + Grafana             |
| Orquestração    | Docker Compose                   |

## Arquitetura

### Ciclo de vida de uma mensagem — retry e DLQ

Cada assinante tem o seu próprio ciclo. Uma falha em `q.relatorio` não afeta
`q.notificacao` nem `q.auditoria`.

```mermaid
flowchart TD
    A([mensagem chega em q.X]) --> B[worker processa]
    B --> C{sucesso?}
    C -- sim --> D([ACK — concluído ✓])
    C -- não --> E{tentativa < 3?}
    E -- sim --> F[publica em q.X.retry]
    F --> G[aguarda TTL 5 s]
    G --> A
    E -- não --> H[publica via DLX em q.X.dlq]
    H --> I([DLQ — isolada para inspeção ✗])

    style D fill:#d4edda,stroke:#28a745,color:#155724
    style I fill:#f8d7da,stroke:#dc3545,color:#721c24
    style F fill:#fff3cd,stroke:#ffc107,color:#856404
    style G fill:#fff3cd,stroke:#ffc107,color:#856404
```

> Detalhe importante: o retry devolve a mensagem **direto para `q.X`** via
> `RETRY_EXCHANGE` (exchange direct), não para o exchange topic. Isso impede que
> o fan-out se repita e os "irmãos" reprocessem a mesma mensagem.

### Roteamento (bindings)

| Assinante   | Routing keys                            | Reage a              |
| ----------- | --------------------------------------- | -------------------- |
| notificacao | `aluno.cadastrado`, `aluno.matriculado` | cadastro e matrícula |
| auditoria   | `aluno.*`                               | tudo (wildcard)      |
| relatorio   | `aluno.matriculado`                     | só matrícula         |

## Como rodar

```bash
docker compose up --build
```

| Serviço           | URL                    | Credenciais   |
| ----------------- | ---------------------- | ------------- |
| API               | http://localhost:3000  | —             |
| RabbitMQ (painel) | http://localhost:15672 | guest / guest |
| Prometheus        | http://localhost:9090  | —             |
| Grafana           | http://localhost:3001  | admin / admin |

---









# Demonstrações

### requisições em situação normal

npm run loadtest

### parar o worker do relatorio

COUNT=20 INTERVAL_MS=800 npm run demo:backlog

### dlq

CONSUMIDOR=relatorio npm run demo:dlq
