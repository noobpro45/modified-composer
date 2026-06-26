const fs = require("fs");
const { JSDOM } = require("jsdom");

const content = fs.readFileSync("d:/codingan/composer/ttml-romaji/Three Loop - シュワシュワ - Romaji.ttml", "utf-8");

const ELEMENT_PREFIX_REGEX = /<\/?([A-Za-z][\w.-]*):/g;
const ATTRIBUTE_PREFIX_REGEX = /\s([A-Za-z][\w.-]*):[\w.-]+\s*=/g;
const DECLARED_PREFIX_REGEX = /xmlns:([A-Za-z][\w.-]*)\s*=/g;
const ROOT_TT_TAG_REGEX = /<tt\b[^>]*>/;

function declareMissingNamespaces(content) {
  const rootMatch = content.match(ROOT_TT_TAG_REGEX);
  if (!rootMatch) return content;

  const rootTag = rootMatch[0];
  const declared = new Set(["xml", "xmlns"]);
  for (const match of rootTag.matchAll(DECLARED_PREFIX_REGEX)) {
    declared.add(match[1]);
  }

  const used = new Set();
  for (const match of content.matchAll(ELEMENT_PREFIX_REGEX)) {
    used.add(match[1]);
  }
  for (const match of content.matchAll(ATTRIBUTE_PREFIX_REGEX)) {
    used.add(match[1]);
  }

  const missing = [];
  for (const prefix of used) {
    if (!declared.has(prefix)) missing.push(prefix);
  }
  if (missing.length === 0) return content;

  const additions = missing.map((prefix) => ` xmlns:${prefix}="urn:composer:unbound:${prefix}"`).join("");
  const patchedRootTag = rootTag.replace(/>$/, `${additions}>`);
  return content.replace(rootTag, patchedRootTag);
}

const unescapedContent = content.replace(/\\"/g, '"').replace(/\\n/g, "\n");
const cleanedContent = declareMissingNamespaces(unescapedContent);

console.log("Cleaned content length:", cleanedContent.length);

const dom = new JSDOM("");
const parser = new dom.window.DOMParser();
const doc = parser.parseFromString(cleanedContent, "text/xml");

const parseError = doc.querySelector("parsererror");
if (parseError) {
  console.log("Parse error:", parseError.textContent);
} else {
  console.log("Parsed successfully!");
  const pTags = doc.getElementsByTagName("p");
  console.log("Found p tags:", pTags.length);
}
