/**
 * @vitest-environment node
 */
import { type LineTemplate, type LinkGroup, type LyricLine, useProjectStore } from "@/stores/project";
import { beforeEach, describe, expect, it } from "vitest";

beforeEach(() => {
  useProjectStore.getState().reset();
  useProjectStore.getState().clearHistory();
});

function seedGroup(id: string, overrides: Partial<LinkGroup> = {}): LinkGroup {
  return { id, label: "Chorus", color: "#f472b6", templateVersion: 1, ...overrides };
}

describe("project store · group types", () => {
  it("ProjectState includes empty groups array initially", () => {
    expect(useProjectStore.getState().groups).toEqual([]);
  });

  it("LyricLine accepts optional group fields", () => {
    const line: LyricLine = {
      id: "l1",
      text: "I love you",
      agentId: "v1",
      groupId: "g1",
      instanceIdx: 0,
      templateLineIdx: 0,
      detached: false,
    };
    expect(line.groupId).toBe("g1");
    expect(line.instanceIdx).toBe(0);
    expect(line.templateLineIdx).toBe(0);
    expect(line.detached).toBe(false);
  });

  it("LinkGroup has the expected shape", () => {
    const g: LinkGroup = { id: "g1", label: "Chorus", color: "#f472b6", templateVersion: 1 };
    expect(g.id).toBe("g1");
    expect(g.label).toBe("Chorus");
    expect(g.color).toBe("#f472b6");
    expect(g.templateVersion).toBe(1);
  });
});

describe("project store · history captures groups", () => {
  it("undo restores groups alongside lines", () => {
    const initialGroups = [seedGroup("g1")];
    useProjectStore.setState({ groups: initialGroups, lines: [] });

    useProjectStore
      .getState()
      .setLinesWithHistory([{ id: "l1", text: "test", agentId: "v1", groupId: "g1" }]);

    useProjectStore.setState({ groups: [] });

    useProjectStore
      .getState()
      .setLinesWithHistory([{ id: "l2", text: "test2", agentId: "v1" }]);

    useProjectStore.getState().undo();

    expect(useProjectStore.getState().groups).toEqual(initialGroups);
  });

  it("redo restores the post-edit groups", () => {
    useProjectStore.setState({ groups: [seedGroup("g1")], lines: [] });

    useProjectStore.getState().setLinesWithHistory([{ id: "l1", text: "a", agentId: "v1" }]);

    useProjectStore.setState({ groups: [seedGroup("g1"), seedGroup("g2", { label: "Verse" })] });

    useProjectStore.getState().setLinesWithHistory([{ id: "l2", text: "b", agentId: "v1" }]);

    useProjectStore.getState().undo();
    expect(useProjectStore.getState().groups.map((g) => g.id)).toEqual(["g1"]);

    useProjectStore.getState().redo();
    expect(useProjectStore.getState().groups.map((g) => g.id)).toEqual(["g1", "g2"]);
  });

  it("commitHistory snapshots groups (verified through moveWordToBg path)", () => {
    useProjectStore.setState({ groups: [seedGroup("g1")] });
    const before = useProjectStore.getState().groups;

    useProjectStore.setState({
      lines: [
        {
          id: "l1",
          text: "hi there",
          agentId: "v1",
          words: [
            { text: "hi ", begin: 0, end: 1 },
            { text: "there", begin: 1, end: 2 },
          ],
        },
      ],
    });

    useProjectStore.getState().moveWordToBg("l1", [0], 0, 60);
    useProjectStore.getState().undo();

    expect(useProjectStore.getState().groups).toEqual(before);
  });
});

describe("project store · group registry mutators", () => {
  it("addGroup pushes to registry with history", () => {
    useProjectStore.getState().addGroup(seedGroup("g1"));
    expect(useProjectStore.getState().groups).toHaveLength(1);
    expect(useProjectStore.getState().groups[0].label).toBe("Chorus");
    expect(useProjectStore.getState().canUndo()).toBe(true);
  });

  it("addGroup is undoable", () => {
    useProjectStore.getState().addGroup(seedGroup("g1"));
    useProjectStore.getState().undo();
    expect(useProjectStore.getState().groups).toHaveLength(0);
  });

  it("updateGroup merges fields", () => {
    useProjectStore.getState().addGroup(seedGroup("g1"));
    useProjectStore.getState().updateGroup("g1", { label: "Refrain", color: "#60a5fa" });

    const g = useProjectStore.getState().groups[0];
    expect(g.label).toBe("Refrain");
    expect(g.color).toBe("#60a5fa");
    expect(g.templateVersion).toBe(1);
  });

  it("updateGroup leaves other groups untouched", () => {
    useProjectStore.getState().addGroup(seedGroup("g1"));
    useProjectStore.getState().addGroup(seedGroup("g2", { label: "Verse" }));

    useProjectStore.getState().updateGroup("g1", { label: "Refrain" });

    const groups = useProjectStore.getState().groups;
    expect(groups.find((g) => g.id === "g1")?.label).toBe("Refrain");
    expect(groups.find((g) => g.id === "g2")?.label).toBe("Verse");
  });

  it("removeGroup deletes registry entry and clears group fields on lines", () => {
    useProjectStore.getState().addGroup(seedGroup("g1"));
    useProjectStore.setState({
      lines: [
        {
          id: "l1",
          text: "test",
          agentId: "v1",
          groupId: "g1",
          instanceIdx: 0,
          templateLineIdx: 0,
        },
        {
          id: "l2",
          text: "untouched",
          agentId: "v1",
        },
      ],
    });

    useProjectStore.getState().removeGroup("g1");

    expect(useProjectStore.getState().groups).toHaveLength(0);
    expect(useProjectStore.getState().lines[0].groupId).toBeUndefined();
    expect(useProjectStore.getState().lines[0].instanceIdx).toBeUndefined();
    expect(useProjectStore.getState().lines[0].templateLineIdx).toBeUndefined();
    expect(useProjectStore.getState().lines[1].text).toBe("untouched");
  });

  it("removeGroup is undoable (group + line fields restored together)", () => {
    useProjectStore.getState().addGroup(seedGroup("g1"));
    useProjectStore
      .getState()
      .setLinesWithHistory([
        { id: "l1", text: "test", agentId: "v1", groupId: "g1", instanceIdx: 0, templateLineIdx: 0 },
      ]);

    useProjectStore.getState().removeGroup("g1");
    expect(useProjectStore.getState().groups).toHaveLength(0);
    expect(useProjectStore.getState().lines[0].groupId).toBeUndefined();

    useProjectStore.getState().undo();
    expect(useProjectStore.getState().groups).toHaveLength(1);
    expect(useProjectStore.getState().lines[0].groupId).toBe("g1");
    expect(useProjectStore.getState().lines[0].instanceIdx).toBe(0);
  });
});

describe("project store · instance mutators", () => {
  function templateOf(text: string, words: Array<[string, number, number]>): LineTemplate {
    return {
      text,
      agentId: "v1",
      relativeBegin: words[0]?.[1] ?? 0,
      relativeEnd: words[words.length - 1]?.[2] ?? 0,
      words: words.map(([t, b, e]) => ({ text: t, relativeBegin: b, relativeEnd: e })),
    };
  }

  it("addInstance creates lines with shifted absolute timing", () => {
    useProjectStore.getState().addGroup(seedGroup("g1"));
    const structure: LineTemplate[] = [
      templateOf("I love you", [
        ["I ", 0, 0.4],
        ["love ", 0.4, 0.8],
        ["you", 0.8, 1.2],
      ]),
    ];

    useProjectStore.getState().addInstance("g1", structure, 30);

    const created = useProjectStore.getState().lines.filter((l) => l.groupId === "g1");
    expect(created).toHaveLength(1);
    expect(created[0].instanceIdx).toBe(0);
    expect(created[0].templateLineIdx).toBe(0);
    expect(created[0].begin).toBeCloseTo(30);
    expect(created[0].end).toBeCloseTo(31.2);
    expect(created[0].words?.[1].begin).toBeCloseTo(30.4);
    expect(created[0].words?.[2].end).toBeCloseTo(31.2);
  });

  it("addInstance picks the next unused instanceIdx", () => {
    useProjectStore.getState().addGroup(seedGroup("g1"));
    const structure: LineTemplate[] = [templateOf("a", [["a", 0, 0.5]])];

    useProjectStore.getState().addInstance("g1", structure, 10);
    useProjectStore.getState().addInstance("g1", structure, 20);
    useProjectStore.getState().addInstance("g1", structure, 30);

    const indices = useProjectStore
      .getState()
      .lines.filter((l) => l.groupId === "g1")
      .map((l) => l.instanceIdx)
      .sort();
    expect(indices).toEqual([0, 1, 2]);
  });

  it("removeInstance strips group fields from matching lines and leaves siblings", () => {
    useProjectStore.getState().addGroup(seedGroup("g1"));
    useProjectStore.setState({
      lines: [
        { id: "a0", text: "a", agentId: "v1", groupId: "g1", instanceIdx: 0, templateLineIdx: 0 },
        { id: "a1", text: "a", agentId: "v1", groupId: "g1", instanceIdx: 1, templateLineIdx: 0 },
        { id: "b0", text: "b", agentId: "v1", groupId: "g1", instanceIdx: 0, templateLineIdx: 1 },
      ],
    });

    useProjectStore.getState().removeInstance("g1", 0);

    const lines = useProjectStore.getState().lines;
    expect(lines.find((l) => l.id === "a0")?.groupId).toBeUndefined();
    expect(lines.find((l) => l.id === "b0")?.groupId).toBeUndefined();
    expect(lines.find((l) => l.id === "a1")?.groupId).toBe("g1");
    expect(lines.find((l) => l.id === "a1")?.instanceIdx).toBe(1);
    expect(useProjectStore.getState().groups).toHaveLength(1);
  });

  it("removeInstance dissolves the group when removing the last instance", () => {
    useProjectStore.getState().addGroup(seedGroup("g1"));
    useProjectStore.setState({
      lines: [
        { id: "a", text: "a", agentId: "v1", groupId: "g1", instanceIdx: 0, templateLineIdx: 0 },
      ],
    });

    useProjectStore.getState().removeInstance("g1", 0);

    expect(useProjectStore.getState().groups).toHaveLength(0);
    expect(useProjectStore.getState().lines[0].groupId).toBeUndefined();
  });

  it("detachLine clears group fields on a single line and preserves text/timing", () => {
    useProjectStore.getState().addGroup(seedGroup("g1"));
    useProjectStore.setState({
      lines: [
        {
          id: "a",
          text: "I love you",
          agentId: "v1",
          groupId: "g1",
          instanceIdx: 0,
          templateLineIdx: 0,
          words: [
            { text: "I ", begin: 30, end: 30.4 },
            { text: "love ", begin: 30.4, end: 30.8 },
          ],
        },
      ],
    });

    useProjectStore.getState().detachLine("a");

    const line = useProjectStore.getState().lines[0];
    expect(line.groupId).toBeUndefined();
    expect(line.instanceIdx).toBeUndefined();
    expect(line.templateLineIdx).toBeUndefined();
    expect(line.text).toBe("I love you");
    expect(line.words?.[0].begin).toBeCloseTo(30);
  });

  it("instance mutators are undoable", () => {
    useProjectStore.getState().addGroup(seedGroup("g1"));
    const structure: LineTemplate[] = [templateOf("a", [["a", 0, 0.5]])];
    useProjectStore.getState().addInstance("g1", structure, 5);

    expect(useProjectStore.getState().lines).toHaveLength(1);

    useProjectStore.getState().undo();
    expect(useProjectStore.getState().lines).toHaveLength(0);
  });
});
