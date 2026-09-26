import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  isScannableFile,
  parseAddedLines,
  scanSource,
  selectFiles,
  workshopScopes,
} from "./check-dashboard-i18n.mjs";

const values = (source) => scanSource(source).map((finding) => finding.value);

test("reports static JSX and visible attributes, including expression attributes", () => {
  assert.deepEqual(
    values(`
    <><h1>Factory settings</h1><Input placeholder="Search jobs" />
    <button title={'Retry capture'} aria-label={busy ? 'Capturing' : 'Capture'}
      aria-description={notice} aria-title={job.status} /></>
  `),
    [
      "Factory settings",
      "Search jobs",
      "Retry capture",
      "Capturing",
      "Capture",
      "notice",
      "job.status",
    ],
  );
});

test("reports status/state/kind/enum and exception labels at displayed output sites", () => {
  assert.deepEqual(
    values(`
    <>{job.status}{run.reconciliationState}{child.kind}{device.adapterKind}
    {account.bucket}{exc.title}{exc.description}{exc.actionLabel}{errorMessage}
    {notice}{job['status']}{STATUS_LABELS[job.status]}{statusLabels[job.status]}</>
  `),
    [
      "job.status",
      "run.reconciliationState",
      "child.kind",
      "device.adapterKind",
      "account.bucket",
      "exc.title",
      "exc.description",
      "exc.actionLabel",
      "errorMessage",
      "notice",
      "job['status']",
      "STATUS_LABELS[job.status]",
      "statusLabels[job.status]",
    ],
  );
});

test("reports fallback and conditional output, not the conditions selecting it", () => {
  assert.deepEqual(
    values(`
    <>{job.status === 'READY' ? 'Ready to receive' : 'In progress'}
    {error && <p>{error.message || 'Could not load job'}</p>}
    {job.product ?? 'Unnamed product'}{busy && 'Saving'}
    {job.state === 'OPEN' && <T>Open</T>}</>
  `),
    [
      "Ready to receive",
      "In progress",
      "error.message",
      "Could not load job",
      "Unnamed product",
      "Saving",
    ],
  );
});

test("reports constructed output and text transformations without scanning replacement syntax", () => {
  assert.deepEqual(
    values(
      [
        "<>{'Status: ' + job.status}{String(job.state).replaceAll('_', ' ')}",
        "{job.kind.toLowerCase()}{`Job ${job.id} is ready`}",
        "{job.status.replace(/_/g, ' ')}{weight.toFixed(3)}</>",
      ].join("\n"),
    ),
    [
      "Status:",
      "job.status",
      "job.state",
      "job.kind",
      "`Job ${job.id} is ready`",
      "job.status",
    ],
  );
});

test("accepts existing translation helpers and components", () => {
  assert.deepEqual(
    values(`
    <><T>Factory settings</T><T>{job.status ?? 'Pending'}</T>
    <Input placeholder={t('Search jobs')} title={t(errorMessage)} />
    {t(job.kind)}{ready ? t('Ready') : <T>Working</T>}
    <bdi>SKU-ABC</bdi><code>GOLD_995</code></>
    alert(t('Continue?')); toast({ title: t('Saved'), description: t(notice) });
  `),
    [],
  );
});

test("does not exempt attributes inside T, bdi, or code", () => {
  assert.deepEqual(
    values(`<T><span title="Retry">Translated text</span></T>`),
    ["Retry"],
  );
});

test("never scans data props, payload keys, comparison enums, handlers or style strings", () => {
  assert.deepEqual(
    values(`
    const payload = { status: 'READY', kind: 'PIECE', description: 'Internal payload' };
    <><ScaleCapturePanel movementKind={kind} sourceBucket="WIP" materialKey="GOLD_995"
      titleId="job-title" status={job.status} data-state={state} description={description}
      onCaptured={() => save({ kind: 'PIECE', status: state })} />
    <option value="REWORK" key={kind}><T>Rework</T></option>
    <Badge variant={job.status === 'READY' ? 'default' : 'outline'}><T>Ready</T></Badge>
    <Input value={notice} className={error ? 'text-red-700' : 'text-green-700'} />
    <WorkshopPageHeader heading="Factory settings" description="Translated in child" /></>
  `),
    [],
  );
});

test("leaves names, IDs, material keys, dates, weights and numbers alone", () => {
  assert.deepEqual(
    values(`
    <>{job.id}{job.sku}{job.product}{artisan.name}{user.fullName}{user.email}
    {tree.labelId}{materialKey}{account.materialKey}{job.createdAt}
    {weight}{weight.toFixed(3)}{count + 1}{items.length}
    {formatDate(job.createdAt, 'yyyy-MM-dd')}{lookup(job.id)}
    <span title={product.name}>{product.name}</span>
    <Input placeholder="0.000" /> 10 kg · 25% · — </>
  `),
    [],
  );
  assert.deepEqual(values("<>{`${weight} kg`}</>"), []);
});

test("recognizes map enum labels even with short parameter names, preserving indices", () => {
  assert.deepEqual(
    values(`
    <>{['OPEN', 'CLOSED'].map((s, index) => <option key={s} value={s}>{s}{index}</option>)}
    {['Ready', 'Working'].map(value => <span>{value}</span>)}
    {statuses.map(st => <span>{st}</span>)}
    {['Alice'].map(name => <span>{name}</span>)}
    {products.map(product => <span>{product.name}</span>)}</>
  `),
    ["s", "value", "st"],
  );
});

test("reports dynamic dialog/toast messages but ignores stored messages translated at render", () => {
  assert.deepEqual(
    values(`
    alert(error.message || 'Failed'); window.confirm(ready ? 'Continue?' : 'Wait');
    toast({ title: 'Problem', description: errorMessage || 'Try again', variant: 'destructive' });
    toast.error('Failed to save'); toast.success(t('Saved'));
    toast({ title, description }); toast('Saved');
    setError('Stored English'); const content = { title: 'Deferred title' };
    <p>{t(error)}</p>
  `),
    [
      "error.message",
      "Failed",
      "Continue?",
      "Wait",
      "Problem",
      "errorMessage",
      "Try again",
      "Failed to save",
      "title",
      "description",
      "Saved",
    ],
  );
});

test("reasoned user-content exemption applies only to its dynamic expression", () => {
  assert.deepEqual(
    values(`
    <>{/* i18n-user-content: operator-entered batch label */ child.label}
    {child.kind}{/* i18n-user-content: customer description */ product.description || 'No description'}
    <span title={/* i18n-user-content: user-authored title */ note.title} />
    {notice}</>
  `),
    ["child.kind", "No description", "notice"],
  );
});

test("empty, unrelated and sibling comments cannot suppress violations", () => {
  assert.deepEqual(
    values(`
    <>{/* i18n-user-content: */ child.label}
    {/* i18n-user-content: explains only this empty JSX comment */}
    {job.status}{/* ordinary comment */ notice}</>
  `),
    ["child.label", "job.status", "notice"],
  );
});

test("TS wrappers cannot hide raw output and numeric placeholders remain valid", () => {
  assert.deepEqual(
    values(
      `<>{(job.status as string)!}{('Pending' satisfies string)}<Input placeholder={'0.000'} /></>`,
    ),
    ["job.status", "Pending"],
  );
});

test("does not translate CSS, scripts, material keys or hardware identifiers", () => {
  assert.deepEqual(
    values(
      [
        "<><style jsx>{`@media print { @page { size: A4; margin: 10mm; } }`}</style>",
        '<script>{`window.state = "READY";`}</script>',
        '<Input placeholder={ports.length ? ports[0] : "COM3"} />',
        '<Input placeholder="192.168.1.20" /><option value="goldGrains24k">goldGrains24k</option>',
        '{job.metalKey || "goldGrains995"}{job.metalKey ?? "silverBullion999"}</>',
      ].join("\n"),
    ),
    [],
  );
  assert.deepEqual(
    values('<>{job.status || "READY"}{job.kind ?? "DESIGN_GROUP"}</>'),
    ["job.status", "READY", "job.kind", "DESIGN_GROUP"],
  );
});

test("string/ReactNode render boundaries accept the non-string branch only", () => {
  assert.deepEqual(
    values(`
    <>{typeof exc.description === 'string' ? <T>{exc.description}</T> : exc.description}
    {typeof description !== 'string' ? description : t(description)}</>
  `),
    [],
  );
  assert.deepEqual(
    values(`
    <>{typeof exc.description === 'string' ? exc.description : exc.description}
    {typeof description === 'string' ? t(description) : notice}</>
  `),
    ["exc.description", "notice"],
  );
});

test("directly pretranslated const labels pass without trusting mutable or shadowed labels", () => {
  assert.deepEqual(
    values(`
    const label = t('Ready');
    const title = (t('Capture'));
    <><span>{label}</span><button title={title} /></>;
    function Nested({ label }) { return <span>{label}</span>; }
    function Other() { const label = 'Raw'; return <span>{label}</span>; }
    function Mutable() { let label = t('Before'); label = 'After'; return <span>{label}</span>; }
  `),
    ["label", "label", "label"],
  );
});

test("directly rendered arrays and map returns are visible, but payload arrays are not", () => {
  assert.deepEqual(
    values(`
    <>{['Ready', 'Working']}{jobs.map(job => job.status)}
    {jobs.map(job => { return job.kind; })}
    {Object.values(JobStatus).map(s => <span>{s}</span>)}
    <Panel values={jobs.map(job => job.status)} /></>
  `),
    ["Ready", "Working", "job.status", "job.kind", "s"],
  );
});

test("added-line filtering applies at the actual visible expression line", () => {
  const source = `<div>Old text
    <span>{job.status}</span>
    <Input placeholder={
      'Search jobs'
    } />
  </div>`;
  const findings = scanSource(source, "view.tsx", new Set([4]));
  assert.deepEqual(findings, [
    {
      line: 4,
      column: 7,
      kind: "raw placeholder attribute",
      value: "Search jobs",
    },
  ]);
});

test("diff parser keeps only added line numbers across hunks and files", () => {
  const diff = `+++ b/apps/web/src/components/shop/workshop/A.tsx
@@ -2,2 +2,3 @@
-old
+new
+another
 context
@@ -10 +11 @@
-before
+after
\\ No newline at end of file
+++ b/apps/web/src/components/shop/karigar/B.tsx
@@ -0,0 +1 @@
+first`;
  assert.deepEqual(
    [...parseAddedLines(diff)].map(([file, lines]) => [file, [...lines]]),
    [
      ["apps/web/src/components/shop/workshop/A.tsx", [2, 3, 11]],
      ["apps/web/src/components/shop/karigar/B.tsx", [1]],
    ],
  );
});

for (const header of ["+++ /dev/null", "+++ other/ignored.tsx"]) {
  test(`diff parser clears the previous file and hunk for ${header}`, () => {
    const diff = `+++ b/apps/web/src/components/shop/workshop/A.tsx
@@ -1 +1 @@
+first
${header}
+outside a hunk
@@ -1 +5 @@
+not a supported destination
+++ b/apps/web/src/components/shop/workshop/B.tsx
+outside the next hunk
@@ -1 +1 @@
+second`;
    assert.deepEqual(
      [...parseAddedLines(diff)].map(([file, lines]) => [file, [...lines]]),
      [
        ["apps/web/src/components/shop/workshop/A.tsx", [1]],
        ["apps/web/src/components/shop/workshop/B.tsx", [1]],
      ],
    );
  });
}

test("test/mock/fixture files are excluded from scanning on Windows and POSIX", () => {
  for (const file of [
    "View.test.tsx",
    "View.spec.jsx",
    "a/__tests__/View.tsx",
    "a\\__tests__\\View.tsx",
    "a/tests/View.tsx",
    "a/__mocks__/View.tsx",
    "a/__fixtures__/View.tsx",
    "Types.d.ts",
    "image.svg",
  ]) {
    assert.equal(isScannableFile(file), false, file);
  }
  for (const file of ["View.tsx", "View.jsx", "messages.ts", "messages.js"])
    assert.equal(isScannableFile(file), true, file);
});

test("plain TS helpers are not misparsed as JSX but visible messages are checked", () => {
  const findings = scanSource(
    "const identity = <Value>(value: Value): Value => value; alert('Try again');",
    "messages.ts",
  );
  assert.deepEqual(findings.map((finding) => finding.value), ["Try again"]);
});

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "dashboard-i18n-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (file, content = "<p>Untranslated</p>") => {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), content);
  };
  return { root, write };
}

test("--workshop scans all relevant trees including unchanged shared panels, excludes unrelated/test files", (t) => {
  const { root, write } = fixture(t);
  const expected = workshopScopes.map((scope) =>
    scope.endsWith(".tsx") ? scope : `${scope}/View.tsx`,
  );
  expected.push(
    "apps/web/src/components/shop/workshop/shared/ScaleCapturePanel.tsx",
  );
  for (const file of expected) write(file);
  write("apps/web/src/components/shop/workshop/__tests__/View.tsx");
  write("apps/web/src/components/shop/karigar/View.test.tsx");
  write("apps/web/src/components/shop/Other.tsx");
  write("apps/web/src/app/dashboard/shop/pos/page.tsx");
  const selected = selectFiles(root, ["--workshop", "--base", "unused-ref"]);
  assert.deepEqual([...selected.keys()].sort(), expected.sort());
  assert.ok([...selected.values()].every((lines) => lines === null));
  assert.throws(
    () => selectFiles(root, ["--base"]),
    /requires a Git reference/,
  );
});

test("CLI fails for a full workshop audit, passes after translation, and filters added lines", (t) => {
  const { root, write } = fixture(t);
  const file = "apps/web/src/components/shop/workshop/View.tsx";
  write(file, "<p>{job.status}</p>\n");
  write("apps/web/src/components/shop/workshop/View.test.tsx");
  const git = (...args) =>
    execFileSync("git", args, { cwd: root, stdio: "pipe" });
  git("init");
  git("add", ".");
  git(
    "-c",
    "user.name=Test",
    "-c",
    "user.email=test@example.invalid",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "-m",
    "fixture",
  );
  const script = fileURLToPath(
    new URL("./check-dashboard-i18n.mjs", import.meta.url),
  );
  const run = (...args) =>
    spawnSync(process.execPath, [script, ...args], {
      cwd: root,
      encoding: "utf8",
    });
  assert.equal(run().status, 0, "unchanged raw text is outside the diff");
  const audit = run("--workshop");
  assert.equal(audit.status, 1);
  assert.match(audit.stderr, /View.tsx:1:5 raw JSX expression: job.status/);
  assert.match(audit.stderr, /full audit; 1 file\(s\) scanned/);
  write(file, "<p><T>{job.status}</T></p>\n");
  assert.equal(run("--workshop").status, 0);
  write(file, "<p>{job.kind}</p>\n");
  assert.equal(
    run().status,
    1,
    "new raw expression is checked in default mode",
  );
});
