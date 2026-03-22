Results: 81 passed, 0 failed

✅ All tests passed. Day 1 foundation is solid.


> mindforge-cc@2.0.0-alpha.2 lint
> eslint .


/home/runner/work/MindForge/MindForge/bin/autonomous/auto-runner.js
Warning:    9:7  warning  'repairOperator' is assigned a value but never used   no-unused-vars
Warning:   11:7  warning  'steeringManager' is assigned a value but never used  no-unused-vars

/home/runner/work/MindForge/MindForge/bin/autonomous/repair-operator.js
Warning:   17:5  warning  'planId' is assigned a value but never used        no-unused-vars
Warning:   18:5  warning  'phase' is assigned a value but never used         no-unused-vars
Warning:   20:5  warning  'errorOutput' is assigned a value but never used   no-unused-vars
Warning:   24:5  warning  'repairBudget' is assigned a value but never used  no-unused-vars

/home/runner/work/MindForge/MindForge/bin/autonomous/stuck-monitor.js
Warning:   7:7  warning  'fs' is assigned a value but never used  no-unused-vars

/home/runner/work/MindForge/MindForge/bin/browser/browser-daemon.js
Warning:   10:7   warning  'fs' is assigned a value but never used       no-unused-vars
Warning:   11:7   warning  'path' is assigned a value but never used     no-unused-vars
Warning:   67:87  warning  'name' is assigned a value but never used     no-unused-vars
Warning:   68:21  warning  'context' is assigned a value but never used  no-unused-vars

/home/runner/work/MindForge/MindForge/bin/browser/daemon-manager.js
Warning:   66:30  warning  'opts' is assigned a value but never used  no-unused-vars

/home/runner/work/MindForge/MindForge/bin/browser/session-manager.js
Warning:   36:14  warning  'err' is defined but never used  no-unused-vars

/home/runner/work/MindForge/MindForge/bin/change-classifier.js
Error:   80:52  error  Strings must use singlequote  quotes

/home/runner/work/MindForge/MindForge/bin/governance/approve.js
Error:   50:15  error  Strings must use singlequote  quotes
Error:   54:15  error  Strings must use singlequote  quotes

/home/runner/work/MindForge/MindForge/bin/migrations/migrate.js
Warning:    90:5   warning  'backupCreated' is assigned a value but never used  no-unused-vars
Warning:    98:16  warning  'err' is defined but never used                     no-unused-vars
Warning:   144:14  warning  'err' is defined but never used                     no-unused-vars

/home/runner/work/MindForge/MindForge/bin/models/cost-tracker.js
Warning:    34:14  warning  'e' is defined but never used  no-unused-vars
Error:    35:28  error    Strings must use singlequote   quotes
Warning:   113:14  warning  'e' is defined but never used  no-unused-vars
Error:   113:17  error    Empty block statement          no-empty

/home/runner/work/MindForge/MindForge/bin/research/research-engine.js
Warning:   14:7   warning  'Router' is assigned a value but never used  no-unused-vars
Error:   28:12  error    Strings must use singlequote                 quotes
Error:   29:23  error    Strings must use singlequote                 quotes
Error:   30:22  error    Strings must use singlequote                 quotes
Error:   31:15  error    Strings must use singlequote                 quotes

/home/runner/work/MindForge/MindForge/bin/review/cross-review-engine.js
Warning:   6:7  warning  'fs' is assigned a value but never used    no-unused-vars
Warning:   7:7  warning  'path' is assigned a value but never used  no-unused-vars

/home/runner/work/MindForge/MindForge/bin/review/review-report-writer.js
Error:   40:14  error  Strings must use singlequote  quotes

/home/runner/work/MindForge/MindForge/bin/updater/self-update.js
Warning:   10:9  warning  'compareSemver' is assigned a value but never used  no-unused-vars

/home/runner/work/MindForge/MindForge/bin/validate-config.js
Warning:   11:7  warning  'path' is assigned a value but never used  no-unused-vars

/home/runner/work/MindForge/MindForge/tests/audit.test.js
Warning:    7:7   warning  'path' is assigned a value but never used  no-unused-vars
Warning:   44:16  warning  'e' is defined but never used              no-unused-vars

/home/runner/work/MindForge/MindForge/tests/autonomous.test.js
Warning:   7:7  warning  'fs' is assigned a value but never used  no-unused-vars

/home/runner/work/MindForge/MindForge/tests/browser.test.js
Warning:   9:7  warning  'SessionMgr' is assigned a value but never used  no-unused-vars

/home/runner/work/MindForge/MindForge/tests/ci-mode.test.js
Warning:   15:10  warning  'isCiMode' is defined but never used  no-unused-vars

/home/runner/work/MindForge/MindForge/tests/compaction.test.js
Warning:   38:10  warning  'validateStateHasCompactionCheckpoint' is defined but never used  no-unused-vars

/home/runner/work/MindForge/MindForge/tests/distribution.test.js
Warning:    6:27  warning  'path' is assigned a value but never used          no-unused-vars
Warning:   21:10  warning  'parseSkillFrontmatter' is defined but never used  no-unused-vars
Warning:   36:10  warning  'parseMindforgeMd' is defined but never used       no-unused-vars

/home/runner/work/MindForge/MindForge/tests/migration.test.js
Warning:   10:7  warning  'path' is assigned a value but never used  no-unused-vars
Warning:   11:7  warning  'os' is assigned a value but never used    no-unused-vars

/home/runner/work/MindForge/MindForge/tests/model-routing.test.js
Warning:   10:7  warning  'GeminiProvider' is assigned a value but never used  no-unused-vars

/home/runner/work/MindForge/MindForge/tests/production.test.js
Warning:   11:7  warning  'path' is assigned a value but never used  no-unused-vars

/home/runner/work/MindForge/MindForge/tests/skills-platform.test.js
Warning:    61:10  warning  'parseManifest' is defined but never used   no-unused-vars
Warning:   381:24  warning  'patch' is assigned a value but never used  no-unused-vars

/home/runner/work/MindForge/MindForge/tests/wave-engine.test.js
Warning:   7:7  warning  'fs' is assigned a value but never used    no-unused-vars
Warning:   8:7  warning  'path' is assigned a value but never used  no-unused-vars

✖ 50 problems (10 errors, 40 warnings)
  9 errors and 0 warnings potentially fixable with the `--fix` option.

Error: Process completed with exit code 1.
0s
0s
0s
