---
name: model-evaluation
version: 1.0.0
min_mindforge_version: 10.5.0
status: stable
triggers: model evaluation framework, AI benchmark design, model A/B testing, quality metrics AI, model regression detection, evaluation dataset curation, model comparison methodology, LLM evaluation, model performance tracking, model evaluation harness, model scoring rubric, automated model eval
compose:
  - agent-evaluation-framework
---

# Model Evaluation & Benchmarking

## When this skill activates

This skill activates when designing evaluation frameworks for AI models, comparing multiple models, detecting performance regressions, or building automated evaluation pipelines. It applies to any system where model quality must be measured, tracked, or validated before deployment.

## Mandatory actions when this skill is active

### Before writing any code

1. **Define evaluation objectives** — Identify what you're measuring: task accuracy (classification, generation quality), robustness (adversarial examples, distribution shift), efficiency (latency, throughput, cost), or fairness (demographic parity, equalized odds). Different objectives require different metrics.
2. **Curate evaluation datasets** — Build a held-out test set that is representative (covers real-world distribution), diverse (includes edge cases and rare categories), and adversarial (contains challenging examples designed to expose weaknesses). Evaluation sets must never overlap with training data.
3. **Select appropriate metrics** — Choose metrics aligned with business goals: accuracy/F1 for classification, BLEU/ROUGE for text generation, perplexity for language models, user preference for subjective tasks. Avoid vanity metrics (high accuracy on unrealistic data). Document why each metric matters.
4. **Establish baseline performance** — Measure current production model or a simple heuristic baseline (random, majority class, rule-based). New models must beat the baseline by a meaningful margin (≥5% relative improvement) to justify deployment.

### During implementation

- **Implement metric computation pipelines** — Automate metric calculation with error handling: handle missing predictions, malformed outputs, and edge cases (division by zero, empty strings). Metrics should never crash on bad inputs.
- **Design multi-dimensional scorecards** — Track multiple metrics simultaneously: accuracy, latency, cost, fairness. Optimize for trade-offs, not single metrics. A model with 99% accuracy but 10x latency may not be viable.
- **Build pairwise comparison systems** — For subjective tasks (text quality, summarization), implement head-to-head comparisons: show two model outputs, ask humans which is better. Measure win rate and statistical significance (use bootstrap confidence intervals).
- **Implement regression detection** — Run evaluation on every model checkpoint and compare to previous best. If any metric drops by >X% (threshold depends on metric), flag as regression and block deployment. Track metrics over time with time-series plots.
- **Create stratified evaluations** — Break down performance by subgroups: per-category accuracy, per-demographic fairness, per-difficulty-level performance. Aggregate metrics hide disparities. A model may perform well overall but fail catastrophically on minority subgroups.
- **Version evaluation datasets** — Evaluation sets evolve as model capabilities improve. Version datasets with semantic versioning (v1.0, v1.1) and track which model versions were evaluated on which dataset versions. Results are only comparable within the same dataset version.

### After implementation

- **Validate metric reliability** — Compute confidence intervals and statistical significance for all metrics. Use bootstrap resampling (1000+ iterations) to estimate variance. Report metrics as mean ± 95% CI, not point estimates.
- **Test for overfitting to eval set** — If developers repeatedly tune models on the eval set, the eval set becomes a second training set. Periodically refresh eval sets with new examples. Monitor if performance on new eval sets drops significantly compared to old eval sets.
- **Document evaluation methodology** — Write a technical report: dataset description, metric definitions, baseline performance, statistical tests used. Evaluation is only reproducible if methodology is explicit. Include code, dataset URLs, and random seeds.
- **Publish results in standardized format** — Use community-standard formats: JSONL with task, model, dataset, metric, score, confidence_interval. Enable comparison across models and teams without manual data wrangling.

## Self-check before task completion

- [ ] Evaluation objectives (accuracy/robustness/efficiency/fairness) are explicitly defined
- [ ] Evaluation dataset is held-out, representative, diverse, and versioned
- [ ] Metrics are aligned with business goals and documented with justification
- [ ] Baseline performance is established and new models beat baseline by ≥5% relative improvement
- [ ] Multi-dimensional scorecards track accuracy, latency, cost, and fairness simultaneously
- [ ] Regression detection flags performance drops >X% and blocks deployment
- [ ] Performance is stratified by subgroups (categories, demographics, difficulty levels)
- [ ] Confidence intervals are computed via bootstrap (1000+ iterations) and reported with all metrics
- [ ] Evaluation methodology is documented with dataset, metrics, baselines, and statistical tests
- [ ] Results are published in standardized format (JSONL) for cross-model comparison
