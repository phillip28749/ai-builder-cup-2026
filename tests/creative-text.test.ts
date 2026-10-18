import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultCreative, updateCreativeOption } from "../src/creative-options.js";
import { creativeTextInstructions } from "../server/creative-brief.js";

test("entering display copy enables text, including headline and subheadline", () => {
  for (const key of ["headline", "subheadline", "offer", "cta"] as const) {
    const updated = updateCreativeOption(defaultCreative, key, "My exact copy");
    assert.equal(updated[key], "My exact copy");
    assert.equal(updated.textOverlay, true);
    assert.match(creativeTextInstructions(updated), /REQUIRED VISIBLE TEXT IN THE IMAGE/);
    assert.match(creativeTextInstructions(updated), /My exact copy/);
  }
  assert.equal(defaultCreative.textOverlay, false);
});

test("explicit text-off is respected and unrelated edits do not re-enable it", () => {
  const withCopy = updateCreativeOption(defaultCreative, "headline", "Shop today");
  const off = updateCreativeOption(withCopy, "textOverlay", false);
  const changedScene = updateCreativeOption(off, "direction", "minimalist");
  assert.equal(changedScene.textOverlay, false);
  assert.equal(changedScene.headline, "Shop today");
  assert.match(creativeTextInstructions(changedScene), /Do not render headline, subheadline/);
  assert.equal(updateCreativeOption(defaultCreative, "headline", "   ").textOverlay, false);
});

test("brief requires both exact headline and subheadline as image typography", () => {
  const instructions = creativeTextInstructions({
    ...defaultCreative,
    textOverlay: true,
    headline: '  Made for "you"  ',
    subheadline: "Thoughtfully crafted. Every day.",
    offer: "",
    cta: "Shop now",
  });
  const displayCopy = instructions.match(/<display-copy>\n([^\n]+)\n<\/display-copy>/)?.[1];
  assert.ok(displayCopy);
  assert.deepEqual(JSON.parse(displayCopy), [
    'Made for "you"',
    "Thoughtfully crafted. Every day.",
    "Shop now",
  ]);
  assert.match(instructions, /LAYOUT METADATA .*NEVER visible text/);
  assert.match(instructions, /Do not print field labels/);
  assert.match(instructions, /inside the generated image itself/);
  assert.match(instructions, /Do not omit, paraphrase, translate/);
  assert.ok(!instructions.includes("Do not render headline"));
});

test("text enabled without supplied copy does not invent words", () => {
  const instructions = creativeTextInstructions({
    ...defaultCreative,
    textOverlay: true,
    cta: "",
  });
  assert.match(instructions, /No overlay copy supplied/);
});
