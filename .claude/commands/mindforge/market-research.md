---
description: "Competitive analysis and market sizing (TAM/SAM/SOM). Usage: /mindforge:market-research [market] [--competitors url1,url2]"
---

<objective>
Conduct structured market research including TAM/SAM/SOM sizing, competitive landscape analysis, SWOT assessment per competitor, opportunity scoring, and positioning recommendations.
</objective>

<execution_context>
@.mindforge/skills/market-researcher/SKILL.md
</execution_context>

<context>
Arguments: $ARGUMENTS (market vertical or product category, optional --competitors with URLs)
Knowledge: PROJECT.md, existing product briefs, industry reports, competitor intelligence.
</context>

<process>
1. **Define market boundaries**: Establish the scope of the market:
   - Industry vertical and sub-segment
   - Geographic scope (global, regional, country-specific)
   - Customer segments (enterprise, SMB, consumer, developer)
   - Price tier (free, freemium, mid-market, enterprise)
   - Adjacent markets that may converge

2. **Size TAM/SAM/SOM**: Calculate market opportunity using both top-down and bottom-up:
   - **TAM** (Total Addressable Market): Total revenue opportunity if 100% market share
   - **SAM** (Serviceable Addressable Market): Segment reachable with current product/channel
   - **SOM** (Serviceable Obtainable Market): Realistic capture in 3 years given competition
   - Document assumptions, data sources, and confidence level for each estimate
   - Express in both revenue ($) and units (customers/seats)

3. **Analyze competitors**: For each competitor (from --competitors flag or discovered):
   - Product overview and core value proposition
   - Target customer segment and ICP
   - Pricing model and tiers
   - Key features and differentiators
   - Known weaknesses and customer complaints
   - Estimated market share and revenue
   - Recent strategic moves (funding, acquisitions, pivots)

4. **SWOT each competitor**: For each analyzed competitor:
   - **Strengths**: What they do better than anyone else
   - **Weaknesses**: Where they consistently underperform
   - **Opportunities**: Market shifts they could capitalize on
   - **Threats**: Risks to their current position
   - Rate each dimension 1-5 for severity/importance

5. **Score opportunities**: Evaluate market entry/expansion opportunities:
   - Market attractiveness (size, growth rate, profitability)
   - Competitive intensity (number of players, switching costs, differentiation)
   - Capability fit (how well our strengths match the opportunity)
   - Time-to-value (how quickly we can capture share)
   - Risk level (regulatory, technical, market timing)
   - Composite score and ranking

6. **Identify market gaps**: Find underserved segments or unmet needs:
   - Features competitors lack that customers request (review mining)
   - Customer segments ignored by incumbents
   - Pricing gaps (overserved premium, underserved value tier)
   - Geographic gaps (markets without localized solutions)
   - Integration gaps (ecosystems with no good solution)

7. **Recommend positioning**: Based on analysis, propose:
   - Primary positioning statement (for whom, what, unlike, because)
   - Differentiation axes (where to compete vs where to concede)
   - Messaging pillars (3-4 key claims supported by evidence)
   - Category strategy (create new category vs redefine existing)
   - Pricing strategy recommendation with rationale

8. **Trend analysis**: Identify market dynamics:
   - Growth trends (CAGR, seasonal patterns)
   - Technology shifts impacting the market
   - Regulatory changes on the horizon
   - Buyer behavior evolution
   - Consolidation patterns (M&A activity)

9. **Output research report**: Write structured report to `.planning/MARKET-RESEARCH-[slug].md`:
   - Executive Summary (key findings in 5 bullets)
   - Market Sizing (TAM/SAM/SOM with methodology)
   - Competitive Landscape (matrix comparison table)
   - SWOT Analyses (per competitor)
   - Opportunity Assessment (scored and ranked)
   - Positioning Recommendation
   - Risks and Uncertainties
   - Appendix (data sources, methodology notes)

10. **Confidence assessment**: Rate the overall research confidence:
    - Data recency (when were sources last updated)
    - Source diversity (single source vs triangulated)
    - Assumptions requiring validation
    - Recommended next steps for higher-confidence data
    - Expiry date (when this research should be refreshed)
</process>
