# Calibração do simulador

Todo número que o simulador usa vem de uma destas três origens:

1. **Este repositório** — um valor que está em `infra/`, e que muda se o Terraform mudar.
2. **Documentação ou benchmark publicado da AWS** — com link e a aritmética da derivação explícita.
3. **Premissa declarada sobre o workload** — o perfil do backend que a infra existe para servir.

Nada aqui é escolhido por parecer bonito na tela. Quando um número precisou de interpretação, a interpretação está registrada junto com o que a sustenta.

Sobre a origem 3: `backend/` é uma imagem placeholder para dar ao ECS algo que rodar, e **não** serve de base para dimensionamento — ver `CLAUDE.md`. O workload modelado é um serviço de produção de empresa de médio a grande porte: autenticação em toda request e rotas com regra de negócio. As premissas desse perfil estão isoladas em `WORKLOAD` e listadas abaixo, separadas do que a AWS publica.

## Valores que vêm do Terraform

| Constante (`simulation-config.ts`) | Valor | Origem |
|---|---|---|
| `AUTOSCALING.targetRequestsPerMinutePerTask` | 1000 | `ecs.requests_per_target_target_value` |
| `AUTOSCALING.minCapacity` | 2 | `ecs.min_capacity` |
| `AUTOSCALING.maxCapacity` | 10 | `ecs.max_capacity` |
| `AUTOSCALING.scaleOutCooldownMs` / `scaleInCooldownMs` | 60s | `scale_out_cooldown` / `scale_in_cooldown` |
| `HEALTH_CHECK.intervalMs` | 30s | `alb` health_check `interval` |
| `HEALTH_CHECK.healthyThreshold` | 2 | `alb` health_check `healthy_threshold` |
| `WAF.rateLimitPer5Min` | 2000 | `waf.rate_limit_per_5min` |
| `AURORA_SERVERLESS.minAcu` / `maxAcu` | 0 / 4 | `rds.min_capacity_acu` / `max_capacity_acu` |
| `AURORA_SERVERLESS.secondsUntilAutoPause` | 3600 | `rds.seconds_until_auto_pause` |
| `AURORA_SERVERLESS.promotionTier` | 0 | `aws_rds_cluster_instance` não define `promotion_tier`; o default do provider AWS é 0 |

A métrica de autoscaling é `ALBRequestCountPerTarget`, não CPU — igual ao `aws_appautoscaling_policy` do repo.

## Valores que vêm da AWS

### Aurora Serverless v2

| Constante | Valor | Fonte |
|---|---|---|
| `acuStep` | 0,5 ACU | [How Aurora serverless works](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.how-it-works.html) — *"Scaling happens in increments as small as 0.5 ACUs"* |
| `resumeMs` | 15.000 | [Scaling to Zero](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2-auto-pause.html) — *"the typical time to resume might be approximately 15 seconds"* |

Um ACU é *"approximately 2 gibibytes (GiB) of memory, corresponding CPU, and networking"*. A capacidade é reavaliada a cada segundo.

#### `capacityDoublingMs` = 147.000

A AWS não publica uma taxa em ACU/s. Publica que o Serverless v2 *"scales 45% faster from 0.5 ACU to 256 ACU"*, alcançando o máximo em **22 minutos** ([blog do Aurora serverless](https://aws.amazon.com/blogs/database/aurora-serverless-faster-performance-enhanced-scaling-and-still-scales-down-to-zero/)).

A doc também diz que o crescimento é proporcional à capacidade atual: *"The larger the current capacity, the larger the scaling increment and thus the faster scaling can happen."* Crescimento proporcional é crescimento exponencial, então a taxa fica determinada pelo tempo de dobra:

```
0,5 → 256 ACU = 512× = 9 dobras
1.320 s / 9 dobras = 146,7 s por dobra
```

O teste `reproduces the AWS figure of 0.5 to 256 ACUs in 22 minutes` trava essa constante contra a figura original.

A mesma taxa é usada para reduzir capacidade. A AWS não publica uma taxa de scale-down separada, mas o [blog sobre faixa de ACU](https://aws.amazon.com/blogs/database/understanding-how-acu-minimum-and-maximum-range-impacts-scaling-in-amazon-aurora-serverless-v2/) relata scale-down observado em **5 a 10 minutos**. A taxa simétrica leva 4 → 0,5 ACU em 3 halvings, ou 7,35 min, o que cai dentro dessa janela — corroboração, não fonte.

#### `queriesPerSecondPerAcu` = 283

Derivado do benchmark sysbench publicado no [blog do Aurora serverless](https://aws.amazon.com/blogs/database/aurora-serverless-faster-performance-enhanced-scaling-and-still-scales-down-to-zero/) — `oltp_read_only.lua`, 250 tabelas / 16 GB, 512 threads, platform version 4:

```
50.000.000 queries / 27 min / 109 ACU = 283 queries/s por ACU
```

**Interpretação registrada:** li *"109 ACUs consumed"* como **ACU médio durante a execução**, não ACU-hora. O que sustenta a leitura: nela, as versões mais lentas usaram *mais* capacidade e ainda assim demoraram mais (v2: 187 ACU / 46 min; v3: 151 ACU / 37 min; v4: 109 ACU / 27 min), que é exatamente a tese de eficiência do post. Na leitura de ACU-hora, os números do teste de escrita ficam inconsistentes entre versões.

**Por que o benchmark é um proxy adequado:** o `oltp_read_only` mistura point select, range select, agregação e ordenação — o perfil de queries de uma rota com regra de negócio, que é o workload que este projeto modela. Se a base fosse o `SELECT 1` do placeholder, o número estaria ordens de grandeza errado para baixo.

A unidade aqui é **query**, não request. A conversão para request é premissa de workload, não dado da AWS — ver `queriesPerRequest` abaixo.

O teste de escrita (`oltp_write_only`, 50M transações / 49 min / 63 ACU) daria ~270 tx/s por ACU, mas cada transação do sysbench agrupa várias sentenças, então o número não é comparável 1:1 com o de leitura. Por isso o modelo **não** inventa uma assimetria leitura/escrita: usa a única medida limpa e por unidade que a AWS publica.

## Premissas declaradas sobre o workload

Estes não são dados da AWS nem valores do Terraform. São o perfil do backend que estamos modelando, e estão aqui para serem contestados abertamente.

| Constante | Valor | Premissa |
|---|---|---|
| `WORKLOAD.queriesPerRequest` | 3 | Uma request autenticada típica: uma query de sessão/token mais duas de regra de negócio. Move direto a demanda de ACU, então é a premissa de maior alavancagem do modelo. |
| `WORKLOAD.targetAcuUtilization` | 0,7 | A AWS **não publica** o limiar de utilização que dispara o scale-up — confirmado na doc e no blog de faixa de ACU. O modelo provisiona para 70% de ocupação, deixando a curva de fila na parte plana em vez de escalar só quando já está saturado. |
| `LATENCY.appServiceTimeMs` | 24 | Tempo de **ocupação** da task por request, não CPU pura. A task tem 0,25 vCPU, então 24ms de ocupação equivalem a ~6ms de core cheio — plausível para Node com auth, serialização e regra de negócio. |

O que essas premissas produzem, com o teto de 10 tasks × 1000 req/min:

| Cenário | Carga no banco | ACU | Utilização |
|---|---|---|---|
| Ocioso | 0 | 0,5 | — |
| Normal, 2 tasks no target | 6.000 q/min | 1 | 0,35 |
| Teto do ECS | 30.000 q/min | 3 | 0,59 |
| Runaway, tasks saturadas | 75.000 q/min | 4 (no teto) | 1,10 — satura |

O teto de 4 ACU foi escolhido para caber o pico normal com um passo de folga, e para que o runaway bata no limite em vez de escalar indefinidamente — que é a função de um teto.

## Consequências que caem desses números

Duas conclusões que não foram escolhidas — são resultado da aritmética acima:

**O reader não recebe tráfego de aplicação.** `cluster_reader_endpoint` é um output do módulo `rds` que ninguém consome: o ECS recebe apenas `db_host = module.rds.cluster_endpoint`, que é o endpoint do writer. Na infra provisionada, o reader existe como alvo de failover e para aplicar o redo stream — não para escalar leitura.

Isso significa que o `RDS_READ_FRACTION = 0.8` do simulador, roteando 80% das leituras para o reader, **descreve uma intenção que a infra não executa**. É uma divergência aberta: ou o simulador passa a mandar tudo para o writer, ou o backend passa a abrir um segundo pool contra o reader endpoint. As duas são defensáveis; o que não dá é deixar os dois discordando em silêncio.

**O banco entra em carga junto com o compute, e satura antes dele no runaway.** Como só o writer recebe tráfego, ele carrega as 3 queries de toda request sozinho. No teto do ECS isso são 500 queries/s, atendidas por 3 ACU a 59% de utilização. Se as tasks passarem do target e saturarem, a demanda vai a 1.250 queries/s e o teto de 4 ACU fica em 110% — o banco satura antes das tasks. Essa é a razão de o teto de ACU e o teto de tasks precisarem ser escolhidos juntos: mexer em um sem o outro só muda de lugar o gargalo.

**O auto-pause nunca dispara.** A doc é explícita: *"If any user-initiated connections are open to an Aurora serverless instance, the instance won't pause."* O health check do target group bate em `/api/v1/health` a cada 30s (`alb` health_check `interval`), e essa rota executa `pool.query('SELECT 1')` (`backend/src/routes/health.route.ts`). Com no mínimo 2 tasks, o cluster recebe query a cada ~15s e nunca acumula os 300s mínimos de ociosidade, muito menos os 3600s configurados.

O mecanismo está implementado em `isPausable()` e corretamente nunca dispara nesta topologia. Para que `min_capacity_acu = 0` deixe de ser configuração morta, o health check precisaria não tocar o banco — o que é um trade-off real entre profundidade do health check e economia de scale-to-zero, não um bug.

## Números que ainda não têm fonte

Registrados aqui para não passarem por calibrados:

- `AWS_ALARM_EVALUATION` (3 min / 15 min) descreve o comportamento real do target tracking, mas o motor roda com `AUTOSCALING.scaleOutEvaluationMs = 90s` e `scaleInEvaluationMs = 5 min` para caber no ritmo da demo. As tooltips citam os valores reais.
- O simulador distribui com round-robin; o target group real usa `least_outstanding_requests`. Com tasks de capacidade igual e carga uniforme os dois convergem, mas não são a mesma coisa.
- `max_connections` a 2 ACU. A tabela da AWS publica 189 (1 ACU) e 823 (4 ACU) para Aurora PostgreSQL, mas não o valor de 2 ACU. O simulador não usa esse número justamente por isso — interpolar seria inventar.
