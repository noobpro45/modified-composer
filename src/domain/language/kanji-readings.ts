import { normalizeRomaji } from "@/domain/language/kana-map";

// -- Common Kanji Readings ----------------------------------------------------

const COMMON_KANJI_READINGS: Record<string, string[]> = {
  今: ["ko", "ima", "kon"],
  年: ["toshi", "nen"],
  春: ["haru", "shun"],
  夏: ["natsu", "ka"],
  秋: ["aki", "shuu"],
  冬: ["fuyu", "tou"],
  来: ["ku", "ki", "rai"],
  行: ["i", "yu", "kou"],
  見: ["mi", "ken"],
  聞: ["ki", "bun"],
  言: ["i", "koto", "gen"],
  思: ["omo", "shi"],
  知: ["shi", "chi"],
  時: ["toki", "ji"],
  日: ["hi", "bi", "nichi"],
  月: ["tsuki", "getsu"],
  人: ["hito", "jin", "nin"],
  花: ["hana", "ka"],
  空: ["sora", "kuu"],
  雨: ["ame", "u"],
  雪: ["yuki", "setsu"],
  風: ["kaze", "fuu"],
  心: ["kokoro", "shin"],
  声: ["koe", "sei"],
  愛: ["ai"],
  夢: ["yume", "mu"],
  道: ["michi", "dou"],
  手: ["te", "shu"],
  目: ["me", "moku"],
  夜: ["yoru", "ya"],
  朝: ["asa", "chou"],
  海: ["umi", "kai"],
  音: ["oto", "ne", "on"],
  光: ["hikari", "kou"],
  影: ["kage", "ei"],
  色: ["iro", "shiki"],
  君: ["kimi", "kun"],
  僕: ["boku"],
  私: ["watashi", "shi"],
  懐: ["natsu", "kai"],
  遠: ["too", "en"],
  近: ["chika", "kin"],
  誰: ["dare"],
  何: ["nani", "nan"],
  前: ["mae", "zen"],
  後: ["ato", "nochi", "ushiro", "go"],
  想: ["omo", "sou"],
  歌: ["uta", "ka"],
};

function matchesKanjiReading(kanji: string, romaji: string): boolean {
  const readings = COMMON_KANJI_READINGS[kanji];
  if (!readings) return false;
  return readings.includes(normalizeRomaji(romaji));
}

export { matchesKanjiReading };
