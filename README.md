# MW4 Tracker

Tracker de camuflagens do esquadrão no Modern Warfare 4: Ouro → Platina → Dissonância → Divergência.

- **Ranking, Arsenal e Progresso**, com próximos passos sugeridos.
- **Atividade**: feed de tudo que foi marcado/desmarcado, com aviso opcional num canal do Discord.
- **Histórico**: gráfico do score acumulado de cada operador.
- **1v1**: comparação lado a lado.

Cada um escolhe o próprio nome na entrada (fica salvo no navegador) e só edita o próprio arsenal.
A tela se atualiza sozinha a cada 15 s.

## Rodar localmente

```bash
npm ci
cp .env.example .env.local   # deixe DEV_SEED=1
npm run dev
```

Abra http://localhost:3000. Sem `REDIS_URL` os dados ficam em memória e somem ao reiniciar o servidor.
`DEV_SEED=1` gera 30 dias de progresso fictício e é ignorado em produção.
Para usar um Redis local: `docker run -p 6379:6379 redis` e `REDIS_URL=redis://localhost:6379`.

```bash
npm test          # regras, estatísticas e repositório
npm run lint
npm run typecheck
```

## Deploy (Vercel)

| Variável | Obrigatória |
|---|---|
| `KV_URL` ou `REDIS_URL` | sim (já existe no projeto) |
| `DISCORD_WEBHOOK_URL` | não. No canal: Editar canal → Integrações → Webhooks |

## Dados

Redis, com chaves `mw4:v2:*` (um hash por jogador, então duas pessoas marcando ao mesmo tempo não se sobrescrevem).
No primeiro acesso o progresso antigo (`mw4_tracker_data`) é copiado para o formato novo. As camuflagens antigas
ficam como "antes do histórico", porque não se sabe quando foram feitas. A chave antiga não é apagada.
