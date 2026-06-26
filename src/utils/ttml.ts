import type { Agent } from "@/domain/agent/model";
import type { LinkGroup } from "@/domain/group/template";
import type { LyricLine } from "@/domain/line/model";
import type { ProjectMetadata } from "@/domain/project/metadata";
import { formatTime } from "@/utils/format-time";
import { stripSplitCharacter } from "@/utils/split-character";
import { COMPOSER_NS } from "@/utils/lyrics-parsers/composer-namespace";
import { effectiveBounds } from "@/domain/line/bounds";

// -- Helpers ------------------------------------------------------------------

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

function emitWordSpan(word: { text: string; begin: number; end: number; explicit?: true }, text: string): string {
  const explicitAttr = word.explicit ? ' composer:explicit="true"' : "";
  return `<span begin="${formatTime(word.begin)}" end="${formatTime(word.end)}"${explicitAttr}>${escapeXml(text)}</span>`;
}

// -- Generator ----------------------------------------------------------------

interface TTMLOptions {
  metadata: ProjectMetadata;
  agents: Agent[];
  lines: LyricLine[];
  groups?: LinkGroup[];
  granularity: "line" | "word";
  minify?: boolean;
  duration?: number;
}

function generateTTML({ metadata, agents, lines, groups, granularity, minify = false, duration }: TTMLOptions): string {
  const nl = minify ? "" : "\n";
  const ind = (n: number) => (minify ? "" : "  ".repeat(n));

  const effectiveGranularity = lines.some((l) => l.words?.length) ? "word" : "line";

  const parts: string[] = [];

  const hasRomaji = lines.some((l) =>
    l.words?.some((w) => w.romaji?.trim()) || l.backgroundWords?.some((w) => w.romaji?.trim()) || l.romaji?.trim()
  );

  const itunesNs = hasRomaji ? ' xmlns:itunes="http://music.apple.com/lyric-ttml-internal"' : "";

  // Root element with namespaces
  parts.push(
    `<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" xmlns:ttp="http://www.w3.org/ns/ttml#parameter" xmlns:composer="${COMPOSER_NS}"${itunesNs} ttp:timeBase="media" xml:lang="${escapeXml(metadata.language || "en")}" composer:timing="${effectiveGranularity === "word" ? "Word" : "Line"}">`,
  );

  // Head section
  parts.push(`${ind(1)}<head>`);
  parts.push(`${ind(2)}<metadata>`);
  if (metadata.title) {
    parts.push(`${ind(3)}<ttm:title>${escapeXml(metadata.title)}</ttm:title>`);
  }
  for (const agent of agents) {
    if (agent.name) {
      parts.push(`${ind(3)}<ttm:agent xml:id="${escapeXml(agent.id)}" type="${agent.type}">`);
      parts.push(`${ind(4)}<ttm:name>${escapeXml(agent.name)}</ttm:name>`);
      parts.push(`${ind(3)}</ttm:agent>`);
    } else {
      parts.push(`${ind(3)}<ttm:agent xml:id="${escapeXml(agent.id)}" type="${agent.type}"/>`);
    }
  }

  if (hasRomaji) {
    parts.push(`${ind(3)}<iTunesMetadata xmlns="http://music.apple.com/lyric-ttml-internal">`);
    parts.push(`${ind(4)}<transliterations>`);
    parts.push(`${ind(5)}<transliteration>`);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!effectiveBounds(line)) continue;
      
      const hasLineRomaji = line.romaji?.trim() || line.words?.some((w) => w.romaji?.trim()) || line.backgroundWords?.some((w) => w.romaji?.trim());
      if (!hasLineRomaji) continue;
      
      let transliterationContent = "";
      
      if (granularity === "word" && line.words?.length) {
        const words = line.words;
        for (let j = 0; j < words.length; j++) {
          const word = words[j];
          const text = word.romaji ? word.romaji.trimEnd() : "";
          const needsSpace = j < words.length - 1 && (word.romaji?.endsWith(" ") || word.text.endsWith(" "));
          const explicitAttr = word.explicit ? ' composer:explicit="true"' : "";
          transliterationContent += `<span begin="${formatTime(word.begin)}" end="${formatTime(word.end)}"${explicitAttr}>${escapeXml(text)}</span>${needsSpace ? " " : ""}`;
        }
      } else if (line.romaji) {
        transliterationContent = escapeXml(stripSplitCharacter(line.romaji));
      }

      if (transliterationContent) {
        parts.push(`${ind(6)}<text for="L${i + 1}">${transliterationContent}</text>`);
      }
    }
    
    parts.push(`${ind(5)}</transliteration>`);
    parts.push(`${ind(4)}</transliterations>`);
    parts.push(`${ind(3)}</iTunesMetadata>`);
  }

  if (groups && groups.length > 0) {
    parts.push(`${ind(3)}<composer:groups>`);
    for (const g of groups) {
      parts.push(
        `${ind(4)}<composer:group id="${escapeXml(g.id)}" label="${escapeXml(g.label)}" color="${escapeXml(g.color)}" templateVersion="${g.templateVersion}"/>`,
      );
    }
    parts.push(`${ind(3)}</composer:groups>`);
  }
  parts.push(`${ind(2)}</metadata>`);
  parts.push(`${ind(1)}</head>`);

  // Body section
  const durAttr = duration ? ` dur="${formatTime(duration)}"` : "";
  parts.push(`${ind(1)}<body${durAttr}>`);
  parts.push(`${ind(2)}<div>`);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const timing = effectiveBounds(line);
    if (!timing) continue;

    const agentAttr = line.agentId ? ` ttm:agent="${escapeXml(line.agentId)}"` : "";
    const itunesKeyAttr = hasRomaji ? ` itunes:key="L${i + 1}"` : "";
    const groupAttr = line.groupId
      ? ` composer:groupId="${escapeXml(line.groupId)}" composer:instanceIdx="${line.instanceIdx ?? 0}" composer:templateLineIdx="${line.templateLineIdx ?? 0}"${line.detached ? ' composer:detached="true"' : ""}`
      : "";
    let content = "";

    if (granularity === "word" && line.words?.length) {
      const words = line.words;
      const wordCount = words.length;
      for (let j = 0; j < wordCount; j++) {
        const word = words[j];
        const text = word.text.trimEnd();
        const needsSpace = j < wordCount - 1 && word.text.endsWith(" ");
        content += `${emitWordSpan(word, text)}${needsSpace ? " " : ""}`;
      }
    } else {
      content = escapeXml(stripSplitCharacter(line.text));
    }

    if (line.backgroundText && line.backgroundWords?.length) {
      const bgWords = line.backgroundWords;
      const bgCount = bgWords.length;
      let bgContent = "";
      for (let j = 0; j < bgCount; j++) {
        const bgWord = bgWords[j];
        const text = bgWord.text.trimEnd();
        const needsSpace = j < bgCount - 1 && bgWord.text.endsWith(" ");
        bgContent += `${emitWordSpan(bgWord, text)}${needsSpace ? " " : ""}`;
      }
      content += `<span ttm:role="x-bg">${bgContent}</span>`;
    } else if (line.backgroundText) {
      content += `<span ttm:role="x-bg"><span begin="${formatTime(timing.begin)}" end="${formatTime(timing.end)}">${escapeXml(line.backgroundText)}</span></span>`;
    }

    parts.push(
      `${ind(3)}<p begin="${formatTime(timing.begin)}" end="${formatTime(timing.end)}"${agentAttr}${itunesKeyAttr}${groupAttr}>${content}</p>`,
    );
  }

  parts.push(`${ind(2)}</div>`);
  parts.push(`${ind(1)}</body>`);
  parts.push("</tt>");

  return parts.join(nl);
}

// -- Exports ------------------------------------------------------------------

export { generateTTML };
