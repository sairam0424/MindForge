---
name: feature-engineering
version: 1.0.0
min_mindforge_version: 10.6.0
status: stable
triggers: ML feature engineering workflow, feature selection method, feature transformation, feature importance analysis, automated feature discovery, feature scaling normalization, feature interaction, temporal feature extraction, text feature engineering, categorical encoding strategy, feature validation, domain feature creation
---

# Skill — Feature Engineering

## When this skill activates
This skill activates when building ML pipelines that require feature creation, transformation, or selection. Use when designing feature stores, implementing automated feature discovery, or optimizing model input representation.

## Mandatory actions when this skill is active

### Before writing any code
1. Conduct exploratory data analysis to understand feature distributions, missing patterns, correlations, and domain-specific relationships
2. Define feature engineering strategy: target encoding risks, temporal leakage prevention, train-test split boundaries, and cross-validation approach
3. Document business logic for derived features with domain expert validation and interpretability requirements
4. Establish feature quality metrics: null rates, cardinality, stability over time, and correlation with target variable

### During implementation
- Implement feature transformations within sklearn Pipelines or similar frameworks to prevent train-test leakage
- Use robust scaling methods appropriate to distribution (StandardScaler for normal, RobustScaler for outliers, quantile for non-parametric)
- Create temporal features with proper lag handling: rolling windows, exponential smoothing, seasonal decomposition, time-since-event
- Encode categorical variables with strategy matching cardinality (one-hot <10 categories, target encoding >50, embeddings for high-cardinality)
- Generate interaction features guided by domain knowledge and feature importance: polynomial, ratio, difference, product features
- Handle missing values explicitly with strategy documented: imputation (mean/median/mode), indicator variables, or model-based imputation
- Validate feature importance using multiple methods: permutation importance, SHAP values, and univariate tests to identify top contributors

### After implementation
- Create feature documentation with schema definitions, transformation logic, expected ranges, and update frequency
- Build feature monitoring dashboards tracking distribution drift, missing rate changes, and correlation stability over time
- Generate feature store integration with versioning, metadata tracking, and point-in-time correctness for temporal joins
- Validate feature pipeline performance: transformation latency, memory usage, and batch vs online serving consistency

## Self-check before task completion
- [ ] All features are computed within transformation pipelines to prevent train-test leakage
- [ ] Feature importance analysis identifies top 20 contributors with interpretable business meaning
- [ ] Temporal features respect time boundaries and use only historically available information
- [ ] Feature documentation includes transformation logic, expected distributions, and monitoring thresholds
- [ ] Feature validation tests confirm stability across different time periods and data segments
