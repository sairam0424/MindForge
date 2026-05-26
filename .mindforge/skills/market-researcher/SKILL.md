---
name: market-researcher
version: 1.0.0
min_mindforge_version: 10.0.6
status: stable
triggers: market research, competitor analysis, TAM SAM SOM, market sizing, opportunity scoring, positioning strategy, SWOT analysis, competitive landscape, market opportunity, Porter forces, market entry, competitive advantage
---

# Skill — Market Researcher

## When this skill activates
Any task involving market sizing, competitive analysis, positioning strategy, opportunity
assessment, market entry evaluation, or strategic intelligence gathering.

## Mandatory actions when this skill is active

### Before

1. **Define market boundary** — Geographic scope, customer segment, product category. Ambiguous boundaries produce useless analysis.
2. **State the decision** — Market research serves a decision (enter, price, position, prioritize). Name it.
3. **Identify data sources** — Primary (interviews, surveys) and secondary (reports, filings). Note confidence per source.

### During

#### TAM/SAM/SOM sizing
```
Top-down (industry reports):
  TAM = total market revenue at 100% share (analyst reports, govt data)
  SAM = TAM * geographic_filter * segment_filter * product_fit_filter
  SOM = SAM * realistic_capture_rate (3-5yr, benchmarked)

Bottom-up (unit economics):
  SOM = reachable_customers * win_rate * average_ACV

Cross-validate: top-down and bottom-up within 2x. If divergent, re-examine assumptions.
```

#### Competitor analysis framework
Per competitor document: overview (founded, HQ, size, funding, revenue estimate), product analysis (features, pricing model, integrations, UX), strengths (with evidence), weaknesses (with evidence), positioning (tagline, claimed differentiator, market perception), signals to monitor (hiring, changelog velocity, pricing moves).

#### SWOT analysis
```
Strengths (internal, current) | Weaknesses (internal, current)
Opportunities (external, future) | Threats (external, future)

Action matrix:
  S+O = INVEST (leverage strengths to capture opportunities)
  S+T = DEFEND (use strengths to mitigate threats)
  W+O = IMPROVE (fix weaknesses to unlock opportunities)
  W+T = URGENT (weaknesses that amplify threats — fix first)
```

#### Porter's Five Forces
1. Threat of New Entrants — barriers: capital, network effects, switching costs, regulation
2. Supplier Power — concentration, switching costs, substitute inputs
3. Buyer Power — concentration, price sensitivity, switching costs
4. Threat of Substitutes — alternative solutions, price-performance ratio
5. Competitive Rivalry — number of players, growth rate, differentiation, exit barriers

Rate each High/Medium/Low with specific evidence. Conclude overall industry attractiveness.

#### Opportunity scoring matrix
```
Score = 0.3*MarketSize + 0.3*Fit + 0.2*(6-Effort) + 0.2*(6-Competition)
All dimensions rated 1-5. Show weights and math transparently.
Rank opportunities by score. Top 2-3 become strategic focus.
```

#### Positioning strategy (2x2 maps)
- Axes: choose two dimensions that matter to buyers (price vs breadth, ease vs power)
- Plot competitors and self on the map
- Identify white space (underserved quadrants)
- Craft positioning statement: "For [segment] who [need], [Product] is the [category] that [differentiator], unlike [alternative] which [limitation]."

#### Market entry timing
```
Market readiness: budget exists, pain is acute, category awareness present
Competitive window: no dominant incumbent, slow innovators, tech shift creates opening
Internal readiness: domain expertise, MVP <6 months, GTM channel identified, unit economics work

All green = GO | 1-2 yellow = GO with mitigation | Red in market readiness = WAIT
```

### After

1. **Cross-validate** — Triangulate from 3+ sources. Single-source = hypothesis, not finding.
2. **Label confidence** — High (3+ sources), Medium (2 sources), Low (single/inference).
3. **Connect to decision** — Every insight maps to the stated decision. Remove interesting-but-unactionable analysis.
4. **Set refresh cadence** — Competitors: quarterly. Market sizing: annually.

## Self-check before task completion
- [ ] Market boundary clearly defined (geography, segment, category)
- [ ] TAM/SAM/SOM calculated top-down AND bottom-up, cross-validated
- [ ] Competitor profiles cover product, pricing, strengths, weaknesses
- [ ] SWOT has action matrix (S+O, S+T, W+O, W+T strategies)
- [ ] Porter's Five Forces assessed with evidence per force
- [ ] Positioning map identifies white space and adjacent moves
- [ ] Opportunity scoring uses weighted criteria with transparent math
- [ ] Confidence level labeled on every finding
