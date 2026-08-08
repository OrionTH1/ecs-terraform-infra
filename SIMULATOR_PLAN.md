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
- [ ] Um bug quando deleta o writer instance, todas as requests são apagadas — **não verificado desde então**. O fallback de leitura para o writer foi implementado, mas o caso inverso (writer morto, leituras seguindo pelo reader) nunca foi testado de novo.
- [ ] Simular o S3 da aplicação — uma rota do backend lendo ou gravando num bucket próprio. Diferente do S3 que já existe no desenho, que é onde o ECR guarda as camadas de imagem.

## Resolvido
- [x] Representações visuais de response de volta — toda request faz o circuito completo até o usuário, com anel verde na volta e faixas deslocadas para ida e volta não se sobreporem.
- [x] Performance no zoom do ECS Cluster — a causa era `transition: transform` nos quatro tipos de node do cluster, que promovia camadas de composição a cada frame. De 25,8 fps para 77 fps em produção.
- [x] S3 no caminho do image pull — com round trip completo, portas de VPC endpoint e o ECR devolvendo URL pré-assinada em vez de bytes.

## Decidido não fazer
- **Duas colunas de ECS Tasks.** Testado e revertido. O grid empurrava os pacotes para cima dos cards (o `ViewportPortal` renderiza acima dos nodes) e *piorava* o enquadramento no mobile em retrato — 0,46 de zoom contra 0,54 da coluna única. A coluna única com card compacto resolveu o problema de altura sem esses custos.

## Lacunas entre o Terraform e o simulador

Levantadas comparando recurso a recurso. Estas três não são features novas — são promessas que o simulador já faz e não cumpre.

- [ ] **Ejetar target que ficou não saudável.** O `aws_lb_target_group` tem `unhealthy_threshold = 3`, mas o simulador só modela o `healthy_threshold` (é o estágio `registering`, 2 checks de 30s). Hoje uma task só sai do target group quando é explodida na mão; na AWS ela sai sozinha depois de 3 checks falhos. Metade do health check está simulada.
- [ ] **Dar destino a `logs` e `secretsmanager`.** O tooltip do interface endpoint lista quatro serviços e só o ECR tem node do outro lado. Falta o CloudWatch Logs recebendo o que o driver `awslogs` manda de cada task, e o Secrets Manager sendo consultado pelo execution role antes do container subir. As portas prometem quatro caminhos e entregam um.
- [ ] **Mostrar alarme disparando.** São 9 alarmes no `modules/observability` mais o tópico SNS onde eles caem. O card do Application Auto Scaling mostra `alarms OK` e a tooltip descreve AlarmHigh e AlarmLow em detalhe, mas nenhum alarme jamais acende. O simulador usa o vocabulário sem mostrar o evento.

Ordem sugerida: destino dos endpoints → ejeção de target → alarmes. O primeiro porque os nodes de CloudWatch e Secrets Manager que ele exige são pré-requisito do terceiro.
