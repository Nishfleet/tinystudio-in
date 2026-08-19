import assert from "node:assert/strict"
import {comparePatches, detectDuplicates, makeApi, parseDiff, ratio, upsertComment} from "./check-pr-duplicates.mjs"

const {equal: eq, ok, deepEqual: deq} = assert

// --- similarity -------------------------------------------------------------

{
	const lines = ["a", "b", "c"]
	eq(ratio(lines, [...lines]), 1, "identical patches score 1")
	eq(ratio([], []), 1, "two empty patches score 1")
	eq(ratio(lines, ["x", "y", "z"]), 0, "disjoint patches score 0")
	eq(ratio(lines, []), 0, "one empty side scores 0")
	const near = ["a", "b", "c", "d", "e", "f"]
	const near2 = ["a", "b", "c", "D", "e", "f"]
	ok(ratio(near, near2) > 0.8 && ratio(near, near2) < 1, "near-identical patches score between 0.8 and 1")
	const sub = [...lines, "extra", "lines", "here"]
	ok(ratio(lines, sub) > 0.5, "subset/superset patches still score high")
}

// --- diff parsing -----------------------------------------------------------

{
	const diff = [
		"diff --git a/scripts/a.mjs b/scripts/a.mjs",
		"index 000..111 100644",
		"--- a/scripts/a.mjs",
		"+++ b/scripts/a.mjs",
		"@@ -1,3 +1,4 @@",
		" same",
		"-gone",
		"+added",
		"diff --git a/scripts/b.mjs b/scripts/b.mjs",
		"@@ -5 +5 @@",
		"-old",
		"+new",
		"",
	].join("\n")
	const files = parseDiff(diff)
	eq(files.size, 2, "one entry per changed file")
	eq([...files.keys()].join(","), "scripts/a.mjs,scripts/b.mjs", "paths are the a/ paths")
	ok(files.get("scripts/a.mjs").includes("+added"), "a-side patch keeps its lines")
	eq(parseDiff("").size, 0, "empty diff yields no files")
}

// --- coverage + similarity comparison --------------------------------------

{
	const patchA = parseDiff("diff --git a/x b/x\n@@ -1 +1 @@\n-a\n+b\n")
	const patchB = parseDiff("diff --git a/x b/x\n@@ -1 +1 @@\n-a\n+b\n")
	const m = comparePatches(patchA, patchB)
	eq(m.coverage, 1, "identical file sets have full coverage")
	eq(m.similarity, 1, "identical patches have full similarity")
	deq(m.sharedFiles, ["x"], "shared file listed once")

	const patchC = parseDiff("diff --git a/x b/x\n@@ -1 +1 @@\n-a\n+z\n")
	const m2 = comparePatches(patchA, patchC)
	eq(m2.coverage, 1, "same file set still full coverage")
	ok(m2.similarity > 0.4 && m2.similarity < 1, "context lines keep small edits somewhat similar")

	const patchD = parseDiff("diff --git a/y b/y\n@@ -1 +1 @@\n-a\n+b\n")
	eq(comparePatches(patchA, patchD), null, "disjoint file sets are no match")
	eq(comparePatches(patchA, parseDiff("")), null, "empty patch is no match")
}

// --- duplicate detection with an injected API -------------------------------

const DIFF_A = "diff --git a/scripts/export-a.mjs b/scripts/export-a.mjs\n@@ -1,2 +1,3 @@\n line\n-remove\n+added\n"
const DIFF_B = "diff --git a/scripts/export-a.mjs b/scripts/export-a.mjs\n@@ -1,2 +1,3 @@\n line\n-remove\n+added\n"
const DIFF_C = "diff --git a/scripts/export-a.mjs b/scripts/export-a.mjs\n@@ -9,2 +9,2 @@\n other\n-old\n+new\n"
const DIFF_D = "diff --git a/scripts/unrelated.mjs b/scripts/unrelated.mjs\n@@ -1 +1 @@\n-x\n+y\n"

function fakeApi({pulls, diffs, comments = []}) {
	const state = {posted: [], deleted: []}
	const fetchImpl = async (url, {method = "GET", body} = {}) => {
		if (/\/pulls\?state=open/.test(url)) {
			return {ok: true, json: async () => pulls}
		}
		if (/\/pulls\//.test(url) && method === "GET") {
			const n = Number(url.match(/\/pulls\/(\d+)$/)?.[1])
			return {ok: true, text: async () => diffs.get(n) ?? ""}
		}
		if (/\/issues\/\d+\/comments$/.test(url) && method === "GET") {
			return {ok: true, json: async () => comments}
		}
		if (/\/issues\/comments\/\d+$/.test(url) && method === "DELETE") {
			state.deleted.push(Number(url.match(/\/comments\/(\d+)$/)?.[1]))
			return {ok: true, text: async () => ""}
		}
		if (/\/issues\/\d+\/comments$/.test(url) && method === "POST") {
			state.posted.push(JSON.parse(body))
			return {ok: true, json: async () => ({})}
		}
		throw new Error(`unexpected fetch: ${method} ${url}`)
	}
	return {fetchImpl, state}
}

{
	const prs = [
		{number: 10, title: "fix(ops): make export-a honor --help", head: {ref: "fix/export-a"}, created_at: "2026-08-01T00:00:00Z", diff_url: "https://api.github.com/repos/o/r/pulls/10"},
		{number: 11, title: "fix(ops): make export-a honor --help", head: {ref: "fix/export-a-lane1"}, created_at: "2026-08-02T00:00:00Z", diff_url: "https://api.github.com/repos/o/r/pulls/11"},
		{number: 12, title: "fix(ops): unrelated change", head: {ref: "fix/unrelated"}, created_at: "2026-08-03T00:00:00Z", diff_url: "https://api.github.com/repos/o/r/pulls/12"},
	]
	const {fetchImpl} = fakeApi({pulls: prs, diffs: new Map([[10, DIFF_A], [11, DIFF_B], [12, DIFF_D]])})
	const report = detectDuplicates({prs, patches: new Map([[10, parseDiff(DIFF_A)], [11, parseDiff(DIFF_B)], [12, parseDiff(DIFF_D)]]), prNumber: 11, coverageThreshold: 0.8, similarityThreshold: 0.5})
	eq(report.matches.length, 1, "later identical fix flags exactly one duplicate")
	eq(report.matches[0].number, 10, "the earlier same-fix PR is named")
	eq(report.matches[0].similarity, 1, "identical patches report full similarity")
}

{
	const prs = [
		{number: 20, title: "fix(ops): export-a help", head: {ref: "fix/a"}, created_at: "2026-08-01T00:00:00Z", diff_url: "https://api.github.com/repos/o/r/pulls/20"},
		{number: 21, title: "fix(ops): export-a copy tweak", head: {ref: "fix/b"}, created_at: "2026-08-02T00:00:00Z", diff_url: "https://api.github.com/repos/o/r/pulls/21"},
	]
	const {fetchImpl} = fakeApi({pulls: prs, diffs: new Map([[20, DIFF_A], [21, DIFF_C]])})
	const report = detectDuplicates({prs, patches: new Map([[20, parseDiff(DIFF_A)], [21, parseDiff(DIFF_C)]]), prNumber: 21, coverageThreshold: 0.8, similarityThreshold: 0.5})
	eq(report.matches.length, 0, "same file but different change is not a same-fix duplicate")
}

{
	// Comment upsert deletes the previous marker comment and posts one new one.
	const comments = [{id: 1, body: "<!-- pr-duplicate-guard -->\nold report"}, {id: 2, body: "unrelated comment"}]
	const {fetchImpl, state} = fakeApi({pulls: [], diffs: new Map(), comments})
	await upsertComment(makeApi({token: null, fetchImpl}), "o", "r", 5, "<!-- pr-duplicate-guard -->\nnew report")
	deq(state.deleted, [1], "previous guard comment is replaced")
	eq(state.posted.length, 1, "one fresh comment is posted")
}

console.log("test-pr-duplicates: ok")
