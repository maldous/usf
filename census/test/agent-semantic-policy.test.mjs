import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../..");
const submodulePolicyAvailable = existsSync(resolve(root, "v2/usf/AGENTS.md"));
const accepted = `Semantics establish truth.      (Model)
    Truth demands evidence.         (Evidence)
    Evidence warrants proof.        (Proof)
    Proof specifies features.       (Contract)
    Features shape code.            (Toolchain)
    Code fulfils requirements.      (Validation)`;
const rejected = `Requirements establish code.    (Ticket)
    Code demands features.          (Toolchain)
    Features warrant proof.         (Testing)
    Proof specifies evidence.       (Reports)
    Evidence shapes truth.           (Review)
    Truth fulfils semantics.        (Documentation)`;

function text(path) {
  return readFileSync(resolve(root, path), "utf8");
}
const normalized = (value) => value.split("\n").map((line) => line.trimStart()).join("\n");

test("the canonical agent policy contains one accepted and one rejected lifecycle", { skip: !submodulePolicyAvailable }, () => {
  const files = ["AGENTS.md", "CLAUDE.md", "CODEX.md", "v2/usf/AGENTS.md", "v2/usf/CLAUDE.md", "v2/usf/CODEX.md"];
  const corpus = files.map((path) => [path, text(path)]);
  const acceptedPattern = /Semantics establish truth\.[ \t]+\(Model\)\nTruth demands evidence\.[ \t]+\(Evidence\)\nEvidence warrants proof\.[ \t]+\(Proof\)\nProof specifies features\.[ \t]+\(Contract\)\nFeatures shape code\.[ \t]+\(Toolchain\)\nCode fulfils requirements\.[ \t]+\(Validation\)/g;
  const rejectedPattern = /Requirements establish code\.[ \t]+\(Ticket\)\nCode demands features\.[ \t]+\(Toolchain\)\nFeatures warrant proof\.[ \t]+\(Testing\)\nProof specifies evidence\.[ \t]+\(Reports\)\nEvidence shapes truth\.[ \t]+\(Review\)\nTruth fulfils semantics\.[ \t]+\(Documentation\)/g;
  assert.equal(corpus.reduce((n, [, body]) => n + (normalized(body).match(acceptedPattern)?.length || 0), 0), 1);
  assert.equal(corpus.reduce((n, [, body]) => n + (normalized(body).match(rejectedPattern)?.length || 0), 0), 1);
  assert.match(text("v2/usf/AGENTS.md"), /Reject the build-first inversion:/);
  for (const path of ["CLAUDE.md", "CODEX.md", "v2/usf/CLAUDE.md", "v2/usf/CODEX.md"]) {
    assert.equal(text(path).includes(accepted), false, `${path} duplicates shared policy`);
    assert.equal(text(path).includes(rejected), false, `${path} duplicates shared policy`);
  }
});

test("agent policy separates lifecycle roles and rejects the legacy hierarchy", () => {
  const policies = [text("AGENTS.md")];
  if (submodulePolicyAvailable) policies.push(text("v2/usf/AGENTS.md"));
  for (const body of policies) {
    assert.match(body, /validated semantic state in Stardog is the sole USF semantic authority/i);
    assert.doesNotMatch(body, /semantic definitions\s*>\s*ADRs\s*>\s*validators\s*>\s*runtime proof\s*>\s*source\s*>\s*generated reports/i);
    for (const role of ["Model", "Evidence", "Proof", "Contract", "ADR", "Toolchain", "Code", "Validation", "Report", "Ticket"]) {
      assert.match(body, new RegExp(`\\b${role}\\b`, "i"));
    }
  }
});
