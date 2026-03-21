# MindForge Monorepo Guide

## Overview
MindForge detects common monorepo setups (npm workspaces, pnpm, Nx, Turborepo, Lerna)
and builds a workspace manifest for multi-package planning.

## Detect workspace
Run:
```
/mindforge:workspace detect
```
This writes `.planning/WORKSPACE-MANIFEST.json` and prints package order.

## Plan across packages
Use:
```
/mindforge:workspace plan phase N
```
Each PLAN file includes `<package>` and `<working-dir>` fields.

## Test across packages
Use:
```
/mindforge:workspace test
```
Tests run in dependency order, then root integration tests if configured.
