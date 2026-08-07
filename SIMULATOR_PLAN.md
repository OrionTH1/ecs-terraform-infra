# Plano — Simulador Visual da Infra (portfólio)

## 1. Objetivo

Complementar o `ecs-terraform-infra` com um site interativo que **explica visualmente** como a infra se comporta sob carga — sem nunca dar `terraform apply` em produção. Serve para apresentação (entrevistas, README, demo gravada), não como ambiente de execução real.

A narrativa de portfólio fica em duas camadas:
1. "Eu construí essa infra AWS via Terraform" (este repo).
2. "E construí uma ferramenta pra você *ver* as decisões de arquitetura funcionando, sem eu precisar manter a AWS rodando 24/7" (o simulador).

Isso é mais memorável do que só mostrar código Terraform, e é coerente com o espírito do projeto (a API é um "canário" trivial — a engenharia está na infra e em como ela é comunicada).

## 2. Escopo — o que é simulado, o que é real

**100% client-side, zero custo, zero AWS.** Nenhum request do simulador toca infraestrutura real. Todo o comportamento (distribuição de carga, scaling, WAF) é uma simulação matemática no navegador, mas **calibrada com os números reais deste repo** para ser defensável:

| Mecanismo simulado | Valor usado (extraído do `ARCHITECTURE.md`) |
|---|---|
| Auto Scaling do ECS Service | reage a `ALBRequestCountPerTarget` (não CPU) |
| WAF rate limit por IP | 2000 req / 5 min → bloqueia |
| WAF `AmazonIpReputationList`, `KnownBadInputsRuleSet` | bloqueia |
| WAF `CommonRuleSet`, `SQLiRuleSet` | modo `count` (não bloqueia, só loga) |
| Health check do Target Group | grace period antes de task virar "healthy" |
| Desired count mínimo | 2 tasks (HA) |

Isso evita o pior risco do projeto: simular números fictícios que não batem com a infra real do repo, o que mina a credibilidade em vez de reforçá-la.

## 3. Stack técnica sugerida

- **React + TypeScript + Vite** — SPA estática, deploy grátis (Vercel/Netlify/GitHub Pages).
- **`reactflow`** (React Flow) para o canvas de nodes/edges — já resolve drag, zoom, conexão de portas, edges animadas. É o que torna o screenshot de referência viável sem reinventar um motor de canvas do zero.
- **Zustand** (ou Context simples) para o estado da simulação.
- **Framer Motion** ou CSS para os "pulsos" de request viajando pelas edges.
- Sem backend, sem banco — todo o "tick" da simulação roda num loop `requestAnimationFrame`/`setInterval` no cliente.

## 4. Modelo da simulação

### 4.1 Cards de infra (fixos, não-editáveis quanto à topologia)
ALB → ECS Service (N tasks) → (Aurora, opcional/decorativo). Posição arrastável, mas conexões entre eles são fixas — reflete a arquitetura real, o usuário não pode "reconectar o RDS no ALB".

**Único ponto de entrada externo: o ALB.** É o único card com uma porta de input onde cards de interação podem plugar — reforça visualmente que é assim que a app real é exposta (subnets privadas sem rota de internet, tudo entra pelo ALB).

### 4.2 Cards de interação (criados pelo usuário, parametrizáveis)
- **User**: RPS, número de usuários simultâneos, padrão de tráfego (constante, rampa, burst).
- **Attacker**: RPS (ex.: 5000), número de IPs de origem (1 IP martelando vs. IPs distribuídos — isso importa porque o rate limit do WAF é *por IP*, então um attacker com 1 IP só sofre rate limit dele mesmo; com IPs distribuídos, o simulador deveria deixar isso visível como trade-off educativo).

### 4.3 Motor de simulação (tick loop)
1. Soma o RPS de todos os cards de interação conectados ao ALB.
2. Passa pelo WAF: aplica rate limit por IP (2000/5min) e as regras em modo block; tráfego bloqueado nunca chega ao ALB de fato — vira animação de "descartado" com contagem de bloqueios.
3. ALB distribui o tráfego restante entre as tasks ECS saudáveis (round-robin ou least-outstanding-requests, igual ao comportamento real do Target Group).
4. Cada task acumula `ALBRequestCountPerTarget`; se ultrapassar o threshold simulado por tempo suficiente, dispara scale-out (+1 task), que entra em estado "provisioning" → health check grace period → "healthy" → só então recebe tráfego.
5. Scale-in simétrico com cooldown, para não oscilar (flapping) visualmente.

## 5. Cenários pré-configurados (para a demo)
1. **Tráfego normal**: 3 users, RPS baixo, mostra distribuição round-robin simples, sem scaling.
2. **Pico de tráfego**: 3 users escalando RPS até estourar o threshold → autoscaling dispara → nova task fica healthy → ALB redistribui.
3. **Ataque DDoS**: attacker a 5000 RPS de 1 IP → WAF rate limit dispara em poucos segundos → maioria das requests é descartada antes do ALB, o serviço nem percebe o pico.
4. **Ataque distribuído** (bônus, mais avançado): attacker simula múltiplos IPs para mostrar por que rate limit por IP não é bala de prata sozinho — abre gancho pra falar de `AmazonIpReputationList` como camada complementar.

## 6. Painel de métricas (live)
- RPS total de entrada vs. RPS que chega às tasks (mostra o que o WAF descartou).
- Nº de tasks rodando / healthy / provisioning.
- Requests por task (prova visual da distribuição do ALB).
- Contador de requests bloqueadas pelo WAF, por regra.
- Latência simulada (sobe visivelmente durante o intervalo entre "threshold estourado" e "nova task healthy" — é o ponto pedagógico mais valioso: scaling não é instantâneo).

## 7. Roadmap e estimativa (part-time, solo)

| Fase | Entrega | Estimativa |
|---|---|---|
| 1. MVP canvas | Cards de infra fixos (ALB + ECS) + 1 card User conectável + animação de request simples, sem scaling | 3-5 dias |
| 2. Autoscaling | Lógica de threshold/scale-out/scale-in com grace period e cooldown, visual de task nova ficando healthy | 4-6 dias |
| 3. WAF + Attacker | Card Attacker, rate limit por IP, bloqueio visual, contadores | 3-4 dias |
| 4. Painel de métricas + cenários pré-configurados (botões "rodar cenário X") | 3-4 dias |
| 5. Polish visual (aesthetics, dark mode, tooltips explicativos tipo o da referência, responsividade) | 3-5 dias |
| 6. Deploy + README + gravação de demo (GIF/vídeo curto para o portfólio) | 1-2 dias |

**Total realista: ~3 a 4 semanas de noites/fins de semana.** Um MVP apresentável (fases 1-3) sai em ~2 semanas se o tempo for mais apertado.

## 8. Riscos / armadilhas a evitar
- **Números inventados**: sempre calibrar com os valores reais do `ARCHITECTURE.md` (2000 req/5min, não CPU-based scaling, etc.) — é o que dá credibilidade em entrevista.
- **Simplificar demais o timing**: se scaling e health check forem instantâneos na simulação, perde-se o ponto pedagógico mais importante (auto scaling tem latência real).
- **Escopo inflando**: resistir à tentação de simular Aurora/RDS ou HTTPS/DNS — o valor está em ALB → ECS → WAF, que é o que tem uma história visual clara de "carga chegando e sendo distribuída/bloqueada".

## 9. Deploy
Site estático em Vercel ou GitHub Pages, sem custo. Pode viver neste mesmo monorepo (ex.: `simulator/`) ou em repo próprio linkado no README principal — decisão de organização, não bloqueia o design acima.

## Falta
- [ ] Um bug quando deleta o writer instances, todas requests são apagadas
- [ ] Tentar tornar o ECS Cluster com duas colunas de ECS Tasks
- [ ] Tentar criar representações visuais de requests de retorno, exemplo o Reader instance retornando uma response para a ECS Task
- [ ] Tentar simular o S3, também com uma representação visual de retorno
- [ ] Tentar descobrir o problema de perfomance quando dá zoom no ECS Cluster
