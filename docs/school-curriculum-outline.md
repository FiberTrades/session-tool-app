# SessionTool School — curriculum outline (draft)

Status: proposal. Nothing built. Drafted 28 Aug 2026.

## Why not clone BabyPips

Their lessons, wording, illustrations and quizzes are their copyright, and reproducing them in a
paid product is the version of this most likely to draw a complaint. Rewording them lesson by
lesson is the same problem in a hat.

The subject matter is not theirs. Nobody owns what a pip is. So this is an original course over
the same ground, structured around **SessionTool's own workflow** rather than anyone else's
progression — which is both the safe path and the better product, for the reason below.

## The thing only we can do

A general course teaches in the abstract. We hold the member's actual trades, so a lesson can
mark itself against their history:

> "Your rule says 1% max. Over your last series you breached it twice — trades #4 and #9."

That is worth more than any generic chapter, and every number it needs is already computed.

| Lesson area | Data already available |
| --- | --- |
| Risk per trade | `risk_gbp`, `over_risk`, the member's Max Risk rule |
| Stop placement | `sl_pips`, `broken_stop`, `no_stop`, `sl_moves` |
| Break-even | the 21-rung BE offset ladder, `no_be_r` do-nothing baseline, `be_clear_pips` |
| Targets | `tp_r`, `mfe_r`, `tp_pulled`, `pot_r` |
| Costs and spread | `costs`, `spread_series` |
| Consistency | best day vs total profit (the prop-firm rule) |
| Adherence | `weeklyCommitments`, activated days, bias/review streaks |
| Series | the whole Series of 10 model, `series_post` |

## Where it goes

**Recommendation: its own surface inside the Community tab, in the sidebar above the channels —
not a chat channel.**

Against a channel:

- A channel is a time-ordered stream. Lessons need fixed order and permanence; posts scroll away
  and the eleventh lesson ends up above the second.
- No progress state. A course needs "where am I", "what unlocks next", "what have I passed".
- **A chat message is identical for every reader.** The personalised half above cannot exist in
  one — it has to render per user.

For the community tab rather than a new top-level tab:

- Learning content already lives there. `the-trading-plan`, `market-phases`, `rice-concept`,
  `break-even-rules`, `reaction-vs-continuation` and `professional-trader-habits` are already a
  de facto syllabus.
- The sidebar already supports collapsible categories (`.dcx-cat`), so School slots in as its own
  entry without competing for space in the main tab strip, which is tight on mobile.
- Each lesson can carry a "discuss this" link into its matching existing channel, so the course
  feeds the community instead of replacing it.

## Shell mechanics (build this first)

Do not start by writing thirty lessons. Build the frame with two or three real ones in it, prove
the format, then let the writing be a steady drip.

- Module and lesson data structure, stored alongside the journal blob.
- Progress: not started / in progress / passed, per lesson.
- Unlock rule: sequential within a module, modules open in order. Never gate on payment.
- Lesson page: prose, then a **Check against my data** panel, then a short quiz.
- The data panel is the differentiator. It reads the member's own history and reports back.
- Resume where you left off.
- Spanish from the start — every string through the existing i18n path, not bolted on later.

## Modules

Ordered by the trader's actual workflow, not by difficulty. Someone who has already traded for a
year should be able to start at module 4 and get value.

### 1. What you are actually trading
1. Currency pairs, base and quote — what the number on the chart means
2. Pips, points and lot sizes
3. Leverage and margin: why the account survives or does not
4. The spread, commission and swap — *hooks: `costs`, `spread_series` on their own trades*
5. Sessions and why London matters for this group

### 2. Risk comes before entries
1. Why risk is decided before a trade is found
2. Position sizing from a stop distance — *hooks: `risk_gbp`, `sl_pips`*
3. R as a unit: one number that survives changing lot sizes
4. Max loss per day and per week — *hooks: `over_loss_days`, their Daily Limit*
5. Your own risk record — *fully data-driven: `over_risk` count, worst breach, trend*

### 3. Reading the market
1. Structure: highs, lows, and what "broken" means
2. Ranges and trends — *links to the `market-phases` channel*
3. Reaction versus continuation — *links to that channel*
4. Higher timeframe context, lower timeframe trigger
5. Liquidity and why price returns to obvious levels

### 4. Building a session bias
1. What a bias is, and what it is not
2. The HTF pass: location before direction
3. The LTF pass: what would have to happen
4. News and the economic calendar — *hooks: the calendar already in the app*
5. Writing a bias you can be held to — *hooks: their own posted biases*

### 5. Execution
1. Entry models and why the trigger must be defined in advance
2. Stop placement: structure, not a round number — *hooks: `broken_stop`, `no_stop`*
3. Targets, and the cost of moving them — *hooks: `tp_pulled`, `mfe_r` vs `tp_r`*
4. Break-even: what it protects and what it costs — *hooks: the BE ladder vs `no_be_r`; this
   lesson can tell them their own best offset*
5. Trailing stops and partial exits — *hooks: the T1–T4 ladder, `exits` once populated*

### 6. The session loop
1. Pre-session bias as a commitment device
2. During: the only decisions that are yours
3. Post-session review while it is still warm
4. The weekly review and committing to next week's days
5. Showing up on the days you said — *hooks: adherence, activated days*

### 7. Measuring yourself
1. Why ten trades, not one — *hooks: Series of 10*
2. Win rate is not the number that matters
3. Expectancy: payoff and frequency together
4. What you left on the table — *hooks: `pot_r`, `mfe_r`*
5. Reading your own series history — *fully data-driven*

### 8. Staying in the game
1. Rules you will actually follow
2. Tilt: what it looks like in your own numbers — *hooks: trade count spikes, risk breaches
   after a loss*
3. Prop firm rules: drawdown, daily loss, and the consistency rule
4. Payouts, and why a huge day can delay one — *hooks: best day vs total profit*
5. Boredom, overtrading, and the discipline of not trading

## Build order

1. Shell: structure, progress, unlock, lesson page, quiz. Two placeholder lessons.
2. One fully data-driven lesson end to end — **2.5 Your own risk record** is the best proof,
   since every field it needs already exists and the output is undeniably personal.
3. Module 2 in full. It is the module that changes behaviour fastest.
4. Modules 5 and 7 next — the ones the app's data supports most richly.
5. Everything else as a drip.

## Open questions for Nestor

- Free to all members, or tied to a tier?
- Does a completed module feed the Discipline Leaderboard, or stay separate from scoring?
  (Scoring it would create an obvious farm; leaving it out keeps the leaderboard about trading.)
- Quizzes: pass mark, retries, and does failing block the next lesson?
- Do you want to write the prose yourself in your own voice, with me building the shell and the
  data panels? For a course whose selling point is *your* mentorship, that may be the right split.
