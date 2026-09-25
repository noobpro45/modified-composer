import { describe, expect, it } from "vitest";
import { useEffect, useRef, useState } from "react";
import { WordEditOverlay } from "@/views/timeline/word-edit-overlay";
import { useProjectStore } from "@/stores/project";
import { useTimelineStore } from "@/views/timeline/timeline-store";
import { createLine, createWord } from "@/test/factories";
import { render } from "@/test/render";

function BareHarness({ lineId }: { lineId: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref}>
      <WordEditOverlay lineId={lineId} wordIndex={0} type="word" scrollContainerRef={ref} />
    </div>
  );
}

function PositionedHarness({ lineId, wordKey }: { lineId: string; wordKey: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return (
    <div ref={ref} style={{ position: "relative", width: 800, height: 200 }}>
      <div
        data-word-block
        id={wordKey}
        style={{ position: "absolute", left: "0px", top: "100px", width: "60px", height: "20px" }}
      />
      {mounted && <WordEditOverlay lineId={lineId} wordIndex={0} type="word" scrollContainerRef={ref} />}
    </div>
  );
}

describe("WordEditOverlay", () => {
  it("renders nothing when the target line does not exist", async () => {
    await render(<BareHarness lineId="nope" />);
    expect(document.querySelector("input")).toBeNull();
  });

  it("renders nothing when the word block is not present in the scroll container", async () => {
    const line = createLine({ words: [createWord({ text: "hello", begin: 0, end: 1 })] });
    useProjectStore.setState({ lines: [line] });
    await render(<BareHarness lineId={line.id} />);
    expect(document.querySelector("input")).toBeNull();
  });

  it("labels the edit input once positioned over a word block", async () => {
    const line = createLine({ id: "line-1", words: [createWord({ text: "hello", begin: 0, end: 1 })] });
    useProjectStore.setState({ lines: [line] });
    useTimelineStore.setState({ zoom: 100 });
    const screen = await render(<PositionedHarness lineId={line.id} wordKey={`${line.id}-word-0`} />);
    await expect.element(screen.getByRole("textbox", { name: "Edit word" })).toBeInTheDocument();
  });

  it("disables browser autocomplete and inline predictions on word edit inputs", async () => {
    const line = createLine({ id: "line-1", words: [createWord({ text: "hello", romaji: "konnichiwa", begin: 0, end: 1 })] });
    useProjectStore.setState({ lines: [line] });
    useTimelineStore.setState({ zoom: 100, showRomaji: true });
    const screen = await render(<PositionedHarness lineId={line.id} wordKey={`${line.id}-word-0`} />);
    const wordInput = screen.getByRole("textbox", { name: "Edit word" }).element() as HTMLInputElement;
    const romajiInput = screen.getByRole("textbox", { name: "Edit romaji" }).element() as HTMLInputElement;

    expect(wordInput.getAttribute("autocomplete")).toBe("off");
    expect(wordInput.getAttribute("spellcheck")).toBe("false");
    expect(wordInput.getAttribute("aria-autocomplete")).toBe("none");

    expect(romajiInput.getAttribute("autocomplete")).toBe("off");
    expect(romajiInput.getAttribute("spellcheck")).toBe("false");
    expect(romajiInput.getAttribute("aria-autocomplete")).toBe("none");
  });
});
