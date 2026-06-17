# Release Checklist

Gate before any release ships. Every box must be checked.

## Quality
- [ ] All tests pass (`npm test`)
- [ ] Build succeeds
- [ ] No known Medium+ security findings
- [ ] Coverage meets the project threshold

## Versioning
- [ ] Version bumped in all source-of-truth files
- [ ] CHANGELOG updated with this release's entry
- [ ] Git tag created and matches package version

## Verification
- [ ] Installed artifact verified end-to-end (not just source)
- [ ] Release notes reviewed
- [ ] Rollback plan documented

## Sign-off
- [ ] Owner approved
