---
name: synthetic-data-generation
version: 1.0.0
min_mindforge_version: 10.5.0
status: stable
triggers: synthetic data generation, training data creation, privacy-preserving synthetic, data augmentation strategy, synthetic dataset pipeline, differential privacy data, fake data generation, synthetic data validation, data anonymization, tabular synthetic data, text synthetic generation, synthetic data quality
compose:
---

# Synthetic Data Generation

## When this skill activates

This skill activates when creating training datasets from scratch, augmenting real data with synthetic examples, anonymizing sensitive data while preserving utility, or generating privacy-preserving datasets for model training. It applies when real data is scarce, expensive, biased, or subject to privacy regulations.

## Mandatory actions when this skill is active

### Before writing any code

1. **Assess data requirements** — Define target schema (columns, data types, constraints), target size (number of rows), and statistical properties that must match real data (distributions, correlations, cardinality). Synthetic data is only useful if it mimics real-world structure.
2. **Choose generation strategy** — Select based on data type: rule-based (deterministic logic for structured data), generative models (GANs, VAEs for complex distributions), LLM-based (text generation, code synthesis), or hybrid. Rule-based is fastest but least realistic. GANs are slow but highest fidelity.
3. **Establish privacy guarantees** — If replacing real data due to privacy concerns, define the privacy level: k-anonymity (each record matches k others), differential privacy (mathematical guarantee on information leakage), or synthetic twin (structurally similar but no direct correspondence). Validate that synthetic data passes privacy audits.
4. **Define quality metrics** — Synthetic data must be useful for downstream tasks. Define metrics: statistical similarity (KL divergence, Wasserstein distance), downstream model accuracy (train on synthetic, test on real), and privacy preservation (can you reverse-engineer real data from synthetic?).

### During implementation

- **Preserve statistical properties** — Maintain distributions (mean, variance, skewness), correlations (covariance matrix), and cardinality (unique counts) from real data. Use statistical tests (Kolmogorov-Smirnov for distributions, chi-square for categorical) to validate similarity.
- **Respect constraints** — Enforce domain constraints: referential integrity (foreign keys), range limits (age 0-120), uniqueness (no duplicate IDs), format rules (email regex, phone numbers). Synthetic data that violates constraints is unusable.
- **Augment minority classes** — Use synthetic data to balance class distributions. If real data has 95% negative, 5% positive examples, oversample the minority class synthetically. Validate that synthetic minority examples are diverse and realistic, not copies.
- **Generate edge cases explicitly** — Real data often lacks edge cases (extreme values, rare combinations). Generate these explicitly: maximum field lengths, boundary values, rare categorical combinations. Models trained on synthetic data should handle edge cases better, not worse.
- **Validate generation reproducibility** — Use fixed random seeds for deterministic generation. Synthetic datasets should be versioned and reproducible. Document the generation process (model, hyperparameters, seed) so datasets can be regenerated exactly.
- **Avoid mode collapse** — Generative models (GANs, VAEs) often generate repetitive outputs. Measure diversity: count unique rows, check for duplicates, visualize latent space. If diversity is low (<80% unique rows), retrain with higher capacity or different architecture.

### After implementation

- **Measure statistical fidelity** — Compare synthetic vs. real data distributions using statistical tests. Target: p-value >0.05 for K-S test (distributions are statistically indistinguishable). Visualize distributions with histograms and Q-Q plots.
- **Validate downstream utility** — Train a model on synthetic data, test on real data. Compare accuracy to a model trained on real data. Target: <5% accuracy drop. If drop is larger, synthetic data lacks critical patterns.
- **Audit for privacy leaks** — Attempt to re-identify real individuals from synthetic data using membership inference attacks. Measure attack success rate. Target: <1% success (no better than random guessing). If higher, strengthen privacy guarantees.
- **Test for bias amplification** — Synthetic data can amplify biases from real data. Measure demographic parity and calibration across protected attributes. If bias metrics worsen (compared to real data), adjust generation to debias.

## Self-check before task completion

- [ ] Target schema, size, and statistical properties are explicitly defined
- [ ] Generation strategy (rule-based/GAN/LLM/hybrid) is chosen and justified
- [ ] Domain constraints (referential integrity, ranges, formats) are enforced
- [ ] Statistical similarity is validated with formal tests (K-S, chi-square) and p-values documented
- [ ] Minority classes are balanced and synthetic examples are diverse (no duplicates)
- [ ] Edge cases are explicitly generated (boundary values, rare combinations)
- [ ] Downstream model accuracy on synthetic data is within 5% of real data performance
- [ ] Privacy guarantees are validated via membership inference attack success rate <1%
- [ ] Synthetic data is versioned and generation process is documented for reproducibility
- [ ] Bias metrics are measured and do not amplify demographic disparities
