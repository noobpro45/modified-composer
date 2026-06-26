import { useSettingsStore } from "@/stores/settings";
import { SliderSetting, ToggleSetting, SelectSetting } from "@/ui/settings/setting-controls";
import { MOD_KEY } from "@/utils/platform";
import { useTimelineStore } from "@/views/timeline/timeline-store";

// -- Timeline Section ---------------------------------------------------------

const TimelineSection: React.FC = () => {
  const set = useSettingsStore((s) => s.set);
  const visualizerMode = useSettingsStore((s) => s.visualizerMode);

  return (
    <div className="divide-y divide-composer-border">
      <SelectSetting
        label="Visualizer Mode"
        description="Choose whether to show the traditional waveform or the new spectrogram."
        settingKey="visualizerMode"
        options={[
          { value: "waveform", label: "Waveform" },
          { value: "spectrogram", label: "Spectrogram" },
        ]}
      />
      {visualizerMode === "spectrogram" && (
        <>
          <SliderSetting
            label="Spectrogram height"
            description="Height of the spectrogram track in pixels."
            settingKey="spectrogramHeight"
            min={40}
            max={300}
            step={10}
            format={(v) => `${v}px`}
          />
          <SliderSetting
            label="Spectrogram gain"
            description="Contrast multiplier for the spectrogram display."
            settingKey="spectrogramGain"
            min={0.5}
            max={8.0}
            step={0.1}
            format={(v) => `${v}x`}
          />
        </>
      )}
      <SliderSetting
        label="Default zoom"
        description="Initial zoom level (px/sec) when opening the timeline."
        settingKey="defaultZoom"
        min={20}
        max={500}
        step={20}
        format={(v) => `${v} px/s`}
        action={{
          label: "Use current",
          onClick: () => set("defaultZoom", useTimelineStore.getState().zoom),
        }}
      />
      <SliderSetting
        label="Default row height"
        description="Starting height of each lyric row in the timeline."
        settingKey="defaultRowHeight"
        min={32}
        max={120}
        step={4}
        format={(v) => `${v}px`}
        action={{
          label: "Use current",
          onClick: () => set("defaultRowHeight", useTimelineStore.getState().defaultRowHeight),
        }}
      />
      <ToggleSetting
        label="Snap (magnet)"
        description="Word edges snap to nearby anchors when dragging or resizing."
        settingKey="timelineSnap"
      />
      <ToggleSetting
        label="Vocal onset snap"
        description="Include detected vocal onset anchors as snap targets in the timeline."
        settingKey="vocalOnsetSnap"
      />
      <SliderSetting
        label="Snap threshold"
        description="Distance (in pixels) at which the moving block locks onto an anchor."
        settingKey="timelineSnapThreshold"
        min={4}
        max={24}
        step={1}
        format={(v) => `${v}px`}
      />
      <ToggleSetting
        label="Snap playhead to points"
        description={`Clicking or dragging the playhead snaps it to nearby snap points and vocal onsets. Hold ${MOD_KEY} to bypass.`}
        settingKey="snapPlayheadToPoints"
      />
      <ToggleSetting
        label="Follow playhead"
        description="Auto-scroll the timeline to keep the playhead visible."
        settingKey="followPlayhead"
      />
      <ToggleSetting
        label="Default rolling edit mode"
        description="Start in rolling edit mode when opening a project."
        settingKey="defaultRollingEdit"
      />
      <ToggleSetting
        label="Default preview sidebar"
        description="Open the preview sidebar by default."
        settingKey="defaultPreviewSidebar"
      />
      <ToggleSetting
        label="Scroll wheel scrolls timeline"
        description="Plain scroll moves the timeline horizontally. Hold Shift to scroll vertically."
        settingKey="timelineHorizontalScroll"
      />
    </div>
  );
};

// -- Exports ------------------------------------------------------------------

export { TimelineSection };
