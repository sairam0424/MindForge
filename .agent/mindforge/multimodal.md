---
name: mindforge:multimodal
description: "Design multimodal AI system architecture. Usage: /mindforge:multimodal [system] [--modality vision|audio|text|multi] [--task generation|understanding|retrieval]"
argument-hint: "[system] [--modality vision|audio|text|multi] [--task generation|understanding|retrieval]"
allowed-tools:
  - list_dir
  - view_file
---

<objective>
Design a comprehensive multimodal AI system that integrates multiple data modalities (vision, audio, text) for generation, understanding, or retrieval tasks. This command creates architecture blueprints for systems that process and synthesize information across different sensory inputs, ensuring efficient model selection, data alignment, and cross-modal reasoning capabilities.
</objective>

<execution_context>
@.mindforge/skills/multimodal-ai/SKILL.md
</execution_context>

<context>
Skills Directory: `.mindforge/skills/multimodal-ai/`
State: Evaluates the target system's modality requirements, task characteristics, and performance constraints to generate a multimodal architecture with model recommendations, data pipeline design, and alignment strategies.
</context>

<process>
1. **Modality Analysis**: Identify required input/output modalities (vision, audio, text, video) and their interaction patterns, analyzing data characteristics, resolution requirements, and temporal dependencies for each modality.

2. **Model Selection Strategy**: Recommend foundation models (CLIP, Flamingo, GPT-4V, Gemini, LLaVA) based on task requirements, evaluate trade-offs between unified models vs specialized model ensembles, and specify fine-tuning approaches for domain adaptation.

3. **Cross-Modal Alignment Architecture**: Design alignment mechanisms (contrastive learning, cross-attention, adapter layers) to map different modalities into shared representation spaces, ensuring semantic consistency and efficient cross-modal retrieval.

4. **Data Pipeline Design**: Architect preprocessing pipelines for each modality including normalization, augmentation, and synchronization strategies, define batch composition strategies for mixed-modality training, and implement quality validation checkpoints.

5. **Inference Optimization**: Design inference architecture with model serving patterns (sequential, parallel, cascade), implement caching strategies for embeddings and intermediate representations, and specify hardware allocation (GPU/CPU split) per modality.

6. **Evaluation Framework**: Define modality-specific metrics (CLIP score for vision-text, audio quality metrics, generation fidelity), design cross-modal evaluation protocols, and establish baseline benchmarks for the target task.

7. **Integration and Scaling**: Specify API contracts for modality inputs/outputs, design horizontal scaling strategies for high-throughput scenarios, implement monitoring for per-modality performance degradation, and document failure modes and fallback strategies.
</process>
