---
name: multimodal-ai
version: 1.0.0
min_mindforge_version: 10.5.0
status: stable
triggers: multimodal AI system, vision language model, image generation integration, audio AI processing, multi-input AI pipeline, multimodal embedding, visual question answering, image understanding AI, multimodal fusion, cross-modal retrieval, visual AI agent, multimodal prompt design
compose:
  - agent-orchestration-patterns
---

# Multimodal AI Systems

## When this skill activates

This skill activates when building AI systems that process multiple input modalities (vision + language, audio + text, image generation from text), implementing vision-language models, designing multimodal embeddings, or creating cross-modal retrieval systems. It applies to any system where AI must understand or generate content across different sensory modalities.

## Mandatory actions when this skill is active

### Before writing any code

1. **Map modality requirements** — Identify all input/output modalities (text, image, audio, video). Determine which modalities are primary (must-have) vs. augmentative (enhances quality but optional). Define the fusion strategy: early fusion (combine raw inputs), late fusion (combine model outputs), or hybrid.
2. **Select appropriate models** — Choose vision-language models based on task: GPT-4V/Claude for reasoning + vision, CLIP for embeddings, DALL-E/Stable Diffusion for generation, Whisper for audio. Validate that models support your required resolution, context length, and throughput.
3. **Design preprocessing pipelines** — Each modality requires specific preprocessing: images need resizing/normalization/format conversion, audio needs resampling/segmentation, video needs frame extraction. Define preprocessing specs upfront to avoid format mismatches.
4. **Establish quality metrics** — Define success criteria per modality: image classification accuracy, caption BLEU score, audio transcription WER, cross-modal retrieval Recall@K. Multimodal systems fail silently when one modality degrades.

### During implementation

- **Normalize modality inputs** — Convert all modalities to consistent formats before fusion. Use standard libraries: PIL/OpenCV for images, librosa/soundfile for audio, ffmpeg for video. Validate dimensions and data types at pipeline entry points.
- **Handle modality-specific errors gracefully** — Image decoding failures, audio corruption, and video format issues should not crash the pipeline. Implement per-modality error handling with clear logging and fallback strategies (skip corrupted input, use placeholder, or retry with degraded quality).
- **Implement attention mechanisms for fusion** — When combining modalities, use attention weights to let the model learn which modality is most informative for each input. Cross-attention between image patches and text tokens is the gold standard for VLMs.
- **Batch processing by modality** — Group inputs by modality for efficient GPU utilization. Processing a mixed batch of images and text is slower than processing homogeneous batches sequentially.
- **Design multimodal prompts carefully** — Vision-language models require structured prompts: "Image: [image] Question: {query} Answer:". Test prompt templates with diverse inputs to avoid format brittleness. Place modality markers consistently.
- **Cache embeddings aggressively** — Multimodal embeddings are expensive to compute. Cache image embeddings, audio embeddings, and text embeddings separately with content-based keys (hash of preprocessed input). Invalidate caches only when model or preprocessing changes.

### After implementation

- **Validate cross-modal alignment** — Test that similar concepts across modalities produce similar embeddings (dog image + "dog" text should be close in embedding space). Use cosine similarity thresholds and spot-check with diverse examples.
- **Measure modality-specific performance** — Isolate performance per modality. A system may excel at text understanding but fail at vision. Track accuracy, latency, and cost per modality separately.
- **Test edge cases per modality** — Images: unusual aspect ratios, corrupted files, black images, high-resolution inputs. Audio: silence, noise, overlapping speech. Text: empty strings, non-ASCII characters, extremely long inputs.
- **Monitor modality imbalance** — If one modality dominates the training data or inference distribution, the model may ignore other modalities. Track input distribution and validate that minority modalities still contribute to predictions.

## Self-check before task completion

- [ ] All input modalities are preprocessed to consistent formats with validation
- [ ] Modality fusion strategy (early/late/hybrid) is explicitly implemented and tested
- [ ] Per-modality error handling prevents pipeline crashes from corrupted inputs
- [ ] Multimodal prompts are structured consistently and tested with diverse examples
- [ ] Cross-modal retrieval accuracy meets target thresholds (Recall@K ≥ target)
- [ ] Embeddings are cached with content-based keys to reduce compute cost
- [ ] Performance is measured and validated separately for each modality
- [ ] Edge cases (corrupted files, unusual formats, empty inputs) are handled gracefully
