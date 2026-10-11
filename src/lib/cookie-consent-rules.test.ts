import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CONSENT_MAX_AGE_SECONDS,
  CONSENT_VERSION,
  buildChoice,
  categoriesToClear,
  parseChoice,
  readCookieValue,
  serializeChoice,
  toServerChoices,
} from "./cookie-consent-rules.ts";

const NOW = 1_800_000_000_000;

test("a saved choice reads back the same", () => {
  const stored = buildChoice({ preferences: true, analytics: false }, NOW);
  const back = parseChoice(serializeChoice(stored), NOW + 1000);
  assert.deepEqual(back, stored);
});

test("nothing stored, rubbish or empty means: ask", () => {
  assert.equal(parseChoice(undefined, NOW), null);
  assert.equal(parseChoice("", NOW), null);
  assert.equal(parseChoice("not json", NOW), null);
  assert.equal(parseChoice(encodeURIComponent("null"), NOW), null);
  assert.equal(parseChoice(encodeURIComponent("[]"), NOW), null);
});

test("a choice of an older version or past its time asks again", () => {
  const old = { ...buildChoice({ preferences: true, analytics: true }, NOW), version: CONSENT_VERSION - 1 };
  assert.equal(parseChoice(serializeChoice(old), NOW), null);

  const stored = buildChoice({ preferences: true, analytics: true }, NOW);
  assert.notEqual(parseChoice(serializeChoice(stored), NOW + (CONSENT_MAX_AGE_SECONDS - 5) * 1000), null);
  assert.equal(parseChoice(serializeChoice(stored), NOW + (CONSENT_MAX_AGE_SECONDS + 5) * 1000), null);
});

test("a choice dated in the future is not trusted", () => {
  assert.equal(parseChoice(serializeChoice(buildChoice({ preferences: true, analytics: true }, NOW + 10 * 60_000)), NOW), null);
});

test("only a real true counts as yes", () => {
  const raw = encodeURIComponent(JSON.stringify({ version: CONSENT_VERSION, at: NOW, preferences: "yes", analytics: 1 }));
  assert.deepEqual(parseChoice(raw, NOW), { version: CONSENT_VERSION, at: NOW, preferences: false, analytics: false });
});

test("finds the consent cookie among other cookies", () => {
  assert.equal(readCookieValue("a=1; cookie_consent=xyz; b=2"), "xyz");
  assert.equal(readCookieValue("a=1; b=2"), null);
  assert.equal(readCookieValue(""), null);
  assert.equal(readCookieValue("my_cookie_consent=zzz"), null);
});

test("the server gets personalization and analytics", () => {
  assert.deepEqual(toServerChoices({ preferences: true, analytics: false }), [
    { type: 4, isGranted: true },
    { type: 5, isGranted: false },
  ]);
});

test("switching a category off clears it; first choice with no before clears whatever is off", () => {
  assert.deepEqual(categoriesToClear({ preferences: true, analytics: true }, { preferences: false, analytics: true }), { preferences: true, analytics: false });
  assert.deepEqual(categoriesToClear({ preferences: false, analytics: false }, { preferences: false, analytics: false }), { preferences: false, analytics: false });
  assert.deepEqual(categoriesToClear(null, { preferences: false, analytics: false }), { preferences: true, analytics: true });
  assert.deepEqual(categoriesToClear(null, { preferences: true, analytics: true }), { preferences: false, analytics: false });
});
