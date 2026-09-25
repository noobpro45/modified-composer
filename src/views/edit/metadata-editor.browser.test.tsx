import { MetadataEditor } from "@/views/edit/metadata-editor";
import { useProjectStore } from "@/stores/project";
import { render } from "@/test/render";
import { userEvent } from "vitest/browser";
import { beforeEach, describe, expect, it } from "vitest";

describe("MetadataEditor", () => {
  beforeEach(() => {
    useProjectStore.getState().reset();
  });

  it("renders Title, Artist, and Language inputs", async () => {
    const screen = await render(<MetadataEditor />);
    await expect.element(screen.getByLabelText("Title")).toBeInTheDocument();
    await expect.element(screen.getByLabelText("Artist")).toBeInTheDocument();
    await expect.element(screen.getByLabelText("Language")).toBeInTheDocument();
  });

  it("updates store language when typing into Language input", async () => {
    const screen = await render(<MetadataEditor />);
    const languageInput = screen.getByLabelText("Language");
    await userEvent.type(languageInput, "ja");
    expect(useProjectStore.getState().metadata.language).toBe("ja");
  });

  it("opens dropdown and selects a preset on click", async () => {
    const screen = await render(<MetadataEditor />);
    const toggleButton = screen.getByRole("button", { name: "Show presets" });
    await userEvent.click(toggleButton);

    const japaneseOption = screen.getByRole("button", { name: /Japanese/i });
    await expect.element(japaneseOption).toBeInTheDocument();

    await userEvent.click(japaneseOption);
    expect(useProjectStore.getState().metadata.language).toBe("ja");
  });
});

