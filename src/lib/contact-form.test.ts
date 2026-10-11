import { test } from "node:test";
import assert from "node:assert/strict";
import { CONTACT_LIMITS, hasErrors, looksLikeBot, messageCounter, validateContact } from "./contact-form.ts";
import { STATIC_PAGE_NUMBER, getStaticPageGroup, getStaticPageSections, type StaticPageGroup } from "./static-page-rules.ts";

const GOOD = { name: "Ali Khan", email: "ali@example.com", phone: "+92 313 7675517", message: "Hello, I have a question about delivery.", type: 3 };

test("a good message has no errors", () => {
  assert.equal(hasErrors(validateContact(GOOD)), false);
});

test("every field says what is wrong", () => {
  const e = validateContact({ name: " ", email: "nope", phone: "12", message: "short", type: 99 });
  assert.deepEqual(Object.keys(e).sort(), ["email", "message", "name", "phone", "type"]);
});

test("limits match the API", () => {
  assert.ok(validateContact({ ...GOOD, name: "n".repeat(CONTACT_LIMITS.name + 1) }).name);
  assert.ok(validateContact({ ...GOOD, message: "m".repeat(CONTACT_LIMITS.messageMax + 1) }).message);
  assert.equal(validateContact({ ...GOOD, message: "m".repeat(CONTACT_LIMITS.messageMax) }).message, undefined);
  assert.ok(validateContact({ ...GOOD, email: "a".repeat(150) + "@example.com" }).email);
});

test("phone numbers of any country are accepted, rubbish is not", () => {
  for (const phone of ["+923137675517", "0313-7675517", "(021) 345 6789", "+1 333 345 6868"]) {
    assert.equal(validateContact({ ...GOOD, phone }).phone, undefined, phone);
  }
  for (const phone of ["", "abc", "12345", "+92 313 7675517 <b>"]) {
    assert.ok(validateContact({ ...GOOD, phone }).phone, phone);
  }
});

test("a bot's hidden field is recognised", () => {
  assert.equal(looksLikeBot(""), false);
  assert.equal(looksLikeBot("  "), false);
  assert.equal(looksLikeBot("http://spam.example"), true);
});

test("the message counter", () => {
  assert.equal(messageCounter("hello"), "5/4000");
});

const page = (Page: number, title: string, withContent = true): StaticPageGroup => ({
  staticPageModel: { StaticPageId: Page, Page, Title: title, SubTitle: title, Status: 1 },
  panelList: withContent ? [{ StaticPageContentId: Page * 10, Title: "S", UniqueName: "q", PageContent: "text", ParentContentId: 0, RootContentId: 0, Level: 0, SortOrder: 1, IsLeafNode: true, items: [] }] : [],
  contentList: [],
});

test("pages are matched by their kind's number, never by an editable title", () => {
  const pages = [page(2, "Privacy and returns"), page(4, "Our promises"), page(1, "Terms"), page(3, "FAQs about things")];
  assert.equal(getStaticPageGroup(pages, "privacy")?.staticPageModel.Page, 4);
  assert.equal(getStaticPageGroup(pages, "returns")?.staticPageModel.Page, 2);
  assert.equal(getStaticPageGroup(pages, "faqs")?.staticPageModel.Page, 1);
  assert.equal(getStaticPageGroup(pages, "terms")?.staticPageModel.Page, 3);
  assert.equal(getStaticPageGroup(pages, "about"), null);
  assert.equal(getStaticPageGroup([], "contact"), null);
});

test("every kind has its own number", () => {
  const numbers = Object.values(STATIC_PAGE_NUMBER);
  assert.equal(new Set(numbers).size, numbers.length);
  assert.equal(STATIC_PAGE_NUMBER.about, 6);
  assert.equal(STATIC_PAGE_NUMBER.contact, 7);
});

test("sections are read in the admin's order, nested ones included", () => {
  const group = page(6, "About");
  group.panelList = [
    { StaticPageContentId: 2, Title: "Second", UniqueName: "b", PageContent: "b", ParentContentId: 0, RootContentId: 0, Level: 0, SortOrder: 2, IsLeafNode: false, items: [
      { StaticPageContentId: 3, Title: "Child", UniqueName: "c", PageContent: "c", ParentContentId: 2, RootContentId: 2, Level: 1, SortOrder: 1, IsLeafNode: true, items: [] },
    ] },
    { StaticPageContentId: 1, Title: "First", UniqueName: "a", PageContent: "a", ParentContentId: 0, RootContentId: 0, Level: 0, SortOrder: 1, IsLeafNode: true, items: [] },
  ];
  // flattened in tree order, then ordered by the admin's sort number (ties keep the tree order)
  assert.deepEqual(getStaticPageSections(group).map((s) => s.title), ["Child", "First", "Second"]);
  assert.equal(getStaticPageSections(null).length, 0);
});
