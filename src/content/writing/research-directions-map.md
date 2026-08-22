---
title: "A Map of My Current Research Directions"
summary: "How causal inference, policy learning, and statistical learning for complex data connect across my current projects."
date: "2026-07-24"
category: "Research note"
tags:
  - causal inference
  - policy learning
  - complex data
draft: false
order: 1
---

My current work sits at the intersection of three broad fields: causal inference, policy learning, and statistical learning for complex data. I use this map to keep the questions connected while remaining precise about what each project is trying to do.

## Three connected questions

### Causal inference

The first question is how to define and estimate causal effects when the outcome is more complicated than a scalar. One current project studies object-valued outcomes in separable metric spaces through distance profiles. The aim is to turn geometric events into causal contrasts that remain identifiable and estimable with familiar semiparametric tools.

### Policy learning

The second question is how estimated treatment-effect heterogeneity can support decisions. My work on modular causal meta-learners compares several correction principles under a common implementation and studies an overlap-aware stacking rule for conditional average treatment effect estimation.

### Statistical learning for complex data

The third question is how to construct reliable and interpretable learning procedures for complex observational data. This includes a survey-based health-risk modeling project built around data preparation, stratified evaluation, model comparison, class-imbalance handling, and SHAP-based interpretation.

## Current project map

- **Causal inference in metric spaces:** distance-profile causal estimands, doubly robust estimation, Neyman orthogonality, and simultaneous inference for object-valued outcomes.
- **Modular CATE meta-learners:** BART-based and cross-fitted estimators, including S-, X-, R-, and BCF-inspired correction principles.
- **Relative-belief multiple testing:** loss-adjusted Bayes rules and asymptotic optimality under sparsity for general additive loss.
- **Survey-based health-risk modeling:** an interpretable machine-learning pipeline for large-scale questionnaire data.

These projects differ in their immediate objects, but they share a concern with what can be learned from imperfect data, which assumptions make that learning credible, and how uncertainty should enter the final conclusion.

## What belongs in this writing space

This section of the site will contain research notes, reading notes, course-project records, and expository pieces. The aim is not to present unfinished work as a finished result. It is to make the structure of a question, the role of an assumption, or the relationship between methods easier to inspect.

> Project status and technical details may change as the work develops. The Research and CV pages remain the concise record of current projects.
