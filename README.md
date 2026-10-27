# MW4 Tracker

Tracker de camuflagens do esquadrão no Modern Warfare 4: Ouro → Platina → Dissonância → Divergência.

- **Ranking, Arsenal e Progresso**, com próximos passos sugeridos.
- **Atividade**: feed de tudo que foi marcado/desmarcado, com aviso opcional num canal do Discord.
- **Histórico**: gráfico do score acumulado de cada operador.
- **1v1**: comparação lado a lado.

Cada um escolhe o próprio nome na entrada (fica salvo no navegador) e só edita o próprio arsenal.
Toda marcação e remoção pede confirmação. A Atividade mostra só o que continua marcado.
A tela se atualiza sozinha a cada 15 s.

**Membros**: o Marins tem o botão MEMBROS no topo para adicionar ou remover pessoas. Quem é removido
some das telas, mas o progresso fica guardado e volta se for adicionado de novo com o mesmo nome.
Como não há senha, a restrição vale para a tela: quem entrar como Marins consegue gerenciar.

## Rodar localmente

```bash
npm ci
cp .env.example .env.local   # DEV_SEED=prod
npm run dev
```

Abra http://localhost:3000. Sem `REDIS_URL` os dados ficam em memória e somem ao reiniciar o servidor.
Com `DEV_SEED=prod` o servidor copia o estado de produção pela API pública ao iniciar; o que você marcar
local fica só local. `DEV_SEED=fake` gera 30 dias de progresso fictício. Os dois são ignorados em produção
e quando há `REDIS_URL`.

Em rede corporativa com inspeção de TLS, se aparecer `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`, rode o dev com
`NODE_OPTIONS=--use-system-ca` para o Node confiar nos certificados do Windows.

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
