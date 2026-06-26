import { BridgeSection } from "@/ui/settings/bridge-section";
import { SelectSetting } from "@/ui/settings/setting-controls";

// -- Advanced Section ---------------------------------------------------------

const AdvancedSection: React.FC = () => {

  return (
    <div>
      <SelectSetting
        label="Preview renderer"
        description="Which engine renders synced lyrics in the Preview tab."
        settingKey="previewRenderer"
        options={[
          { value: "braccato", label: "Braccato (default)" },
          { value: "am-lyrics", label: "am-lyrics" },
        ]}
      />

      <BridgeSection />

    </div>
  );
};

// -- Exports ------------------------------------------------------------------

export { AdvancedSection };
