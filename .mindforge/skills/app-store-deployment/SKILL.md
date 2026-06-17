---
name: app-store-deployment
version: 1.0.0
min_mindforge_version: 10.4.0
status: stable
triggers: app store deployment, release management mobile, staged rollout mobile, app store compliance, app review guideline, mobile A/B testing, app store optimization deployment, mobile release pipeline, code push update, hot patch mobile, mobile feature flags, app store submission
---

# Skill — App Store Deployment & Release Management

## When this skill activates
This skill activates when managing mobile app releases, including app store submissions, staged rollouts, A/B testing, release automation, code push updates, or ensuring compliance with platform guidelines.

## Mandatory actions when this skill is active

### Before writing any code
1. Review App Store Review Guidelines (iOS) and Google Play policies (Android) to ensure compliance
2. Establish release checklist: version bumps, changelog, screenshots, metadata, certificates, entitlements
3. Plan rollout strategy: percentage-based staged rollout, internal testing groups, beta testing timelines
4. Configure feature flags or code push mechanism for post-release updates without app store review

### During implementation
- Implement proper build versioning (semantic versioning, build numbers, consistent across platforms)
- Use Fastlane or similar automation for code signing, building, uploading, and screenshot generation
- Configure app store metadata, descriptions, keywords, categories, and age ratings correctly
- Set up staged rollout configuration (Google Play: percentage rollout, iOS: phased release)
- Implement A/B testing framework with proper analytics events and experiment tracking
- Use code push (CodePush, Expo Updates) for JavaScript-only changes that don't require app store review
- Prepare app store assets: screenshots (all required device sizes), app previews, promotional text

### After implementation
- Submit to internal testing tracks first (TestFlight, Google Play Internal Testing) before production
- Monitor crash rates and user feedback during staged rollout, pause if issues detected
- Track rollout metrics: adoption rate, crash-free sessions, key performance indicators
- Respond to app review feedback promptly with clarifications or necessary changes
- Validate that all app store links, privacy policy URLs, and support contacts are functional

## Self-check before task completion
- [ ] App complies with platform guidelines (no private API usage, proper permission descriptions, content policies)
- [ ] Release pipeline is automated with minimal manual steps (Fastlane, GitHub Actions, Bitrise, CircleCI)
- [ ] Staged rollout is configured to gradually release to users with ability to halt if issues arise
- [ ] Feature flags are in place for high-risk features to enable quick rollback without new submission
- [ ] App store metadata is complete, optimized, and localized for target markets
- [ ] Monitoring and alerting are configured to detect issues during rollout (crash rates, performance regressions)
