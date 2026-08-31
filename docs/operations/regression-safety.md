# Regression safety runbook

## One-time repository and Railway settings

1. In Railway project settings, enable PR Environments using a staging base
   environment with synthetic data only. Never copy production customer data.
2. Enable Railway's **Wait for CI** / check-suite setting for the production
   services so a commit is not deployed before required GitHub checks pass.
3. Protect `master` with pull requests, conversation resolution, no force push,
   no administrator bypass, and strict required checks. Select these checks from
   a completed PR so GitHub records their exact contexts:
   - `✅ PR Ready` (this already requires the PR-code critical journey job)
   - `CodeRabbit`
   - `Railway PR Preview Smoke` after Railway PR Environments are enabled and
     that check has appeared on a completed PR
4. Require a successful Railway PR deployment for critical UI/API changes.

## What each layer proves

- `PR Check` compiles, migrates, tests, starts, and exercises the checked-out PR
  against disposable Postgres and Redis services.
- `Railway PR Preview Smoke` verifies that the deployed preview reports the PR's
  exact commit SHA and that public/login journeys render.
- `Deploy Guard` validates the merge and completes required backups/migrations
  before Railway starts the production deploy. It does not wait on Railway, so
  Railway's **Wait for CI** setting cannot deadlock the workflow.
- `Post-Deploy Critical Checks` first waits until every changed production
  service reports the merged SHA, then runs public and authenticated canaries.
  A healthy response from an older deployment is not accepted. A failure is
  stored as a crash report and reaches the existing Orivraa Error Bot Slack
  channel.

## Release response

The implementer owns the first 30 minutes after deployment. If a revenue-critical
canary fails twice, stop further merges and use Railway's previous-deployment
rollback while investigating. Automate rollback only after the canaries have
proven low-noise; a false-positive rollback can be as harmful as a regression.

## Customer recovery campaign

From Admin → Crash Reports:

1. Select only verified incidents linked to affected shopkeeper accounts.
2. Choose **Preview 40-day recovery offer** and review every eligible/excluded
   recipient.
3. Send after the corrected production journeys have remained stable for 24–48
   hours. Start with a small group, then continue if delivery and claim metrics
   are healthy.
4. Sending does not mark incidents Fixed. Resolve them only after the production
   fix is validated.

Links contain a 256-bit bearer token in the URL fragment. The server stores only
its SHA-256 hash. Claims require the matching signed-in account, are one-time and
idempotent, do not require a card, and never replace an active paid plan.
