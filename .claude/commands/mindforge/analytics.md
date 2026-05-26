---
description: "Design event tracking taxonomy and instrumentation plan. Usage: /mindforge:analytics [feature] [--format object_action] [--privacy strict]"
---

<objective>
Design a comprehensive event tracking taxonomy and instrumentation plan that enables data-driven product decisions while respecting user privacy and maintaining long-term data quality through governance processes.
</objective>

<execution_context>
@.mindforge/skills/analytics-instrumentation/SKILL.md
</execution_context>

<context>
Arguments: $ARGUMENTS (feature or product area, optional --format for naming convention, optional --privacy level)
Knowledge: Existing tracking plan, privacy policy, consent framework, analytics platform documentation.
</context>

<process>
1. **Define User Journeys To Measure**: Map the critical user journeys for the feature. Identify key decision points, drop-off risks, and success moments. Each journey becomes a funnel to instrument.
2. **Design Event Taxonomy**: Create a consistent naming convention using object_action format (e.g., button_clicked, form_submitted, page_viewed). Define hierarchy: namespace > object > action. Ensure names are self-documenting and greppable.
3. **Create Tracking Plan Spreadsheet**: Document every event in a structured format: event name, trigger condition, properties, expected volume, owner, and data consumer. This becomes the single source of truth.
4. **Define Event Properties Per Event**: For each event, specify required and optional properties with their types, allowed values, and descriptions. Include: user context, session context, feature context, and business context.
5. **Implement Data Layer**: Design the client-side data layer that decouples tracking from UI code. Use a centralized analytics service/module that validates events against the schema before sending.
6. **Configure Consent and Privacy**: Implement consent-based tracking (essential/functional/analytics/marketing tiers). Ensure PII is never sent without explicit consent. Apply data minimization — only collect what is needed for defined use cases.
7. **Validate Events In CI**: Add automated tests that verify: event names match the taxonomy, required properties are present, property types are correct, and no PII leaks into analytics events.
8. **Set Up Funnel Dashboards**: For each instrumented journey, create a dashboard showing: conversion rates per step, drop-off analysis, segmentation by key dimensions, and trend over time.
9. **Schedule Quarterly Cleanup**: Establish a governance process: review event volume quarterly, archive low-value events, update the tracking plan, and prune unused properties to prevent data bloat.
</process>
