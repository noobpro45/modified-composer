// -- Types ---------------------------------------------------------------------

interface CobaltInstance {
  id: string;
  label: string;
  url: string;
}

interface CobaltInstanceStatus {
  status: "success" | "error";
  errorMessage?: string;
  at: number;
}

// -- Constants -----------------------------------------------------------------

const DEFAULT_COBALT_INSTANCE_ID = "default";

const BUILTIN_COBALT_INSTANCE: CobaltInstance = {
  id: DEFAULT_COBALT_INSTANCE_ID,
  label: "Composer",
  url: "https://cobalt.boidu.dev",
};

// -- Helpers -------------------------------------------------------------------

interface CobaltState {
  selectedCobaltInstanceId: string;
  cobaltInstances: CobaltInstance[];
}

function resolveActiveCobaltInstance(state: CobaltState): CobaltInstance {
  if (state.selectedCobaltInstanceId === DEFAULT_COBALT_INSTANCE_ID) return BUILTIN_COBALT_INSTANCE;
  return state.cobaltInstances.find((i) => i.id === state.selectedCobaltInstanceId) ?? BUILTIN_COBALT_INSTANCE;
}

function resolveIsDefaultCobaltInstance(state: CobaltState): boolean {
  if (state.selectedCobaltInstanceId === DEFAULT_COBALT_INSTANCE_ID) return true;
  return !state.cobaltInstances.some((i) => i.id === state.selectedCobaltInstanceId);
}

interface CobaltStoreSlice {
  cobaltInstances: CobaltInstance[];
  selectedCobaltInstanceId: string;
  cobaltInstanceStatus: Record<string, CobaltInstanceStatus>;
}

type CobaltSetter = (fn: (state: CobaltStoreSlice) => Partial<CobaltStoreSlice>) => void;

function createCobaltActions(set: CobaltSetter) {
  return {
    addCobaltInstance: (instance: Omit<CobaltInstance, "id">) =>
      set((s) => ({ cobaltInstances: [...s.cobaltInstances, { ...instance, id: crypto.randomUUID() }] })),
    updateCobaltInstance: (id: string, updates: Partial<Omit<CobaltInstance, "id">>) =>
      set((s) => ({ cobaltInstances: s.cobaltInstances.map((i) => (i.id === id ? { ...i, ...updates } : i)) })),
    removeCobaltInstance: (id: string) =>
      set((s) => {
        const { [id]: _removedStatus, ...nextStatus } = s.cobaltInstanceStatus;
        return {
          cobaltInstances: s.cobaltInstances.filter((i) => i.id !== id),
          selectedCobaltInstanceId:
            s.selectedCobaltInstanceId === id ? DEFAULT_COBALT_INSTANCE_ID : s.selectedCobaltInstanceId,
          cobaltInstanceStatus: nextStatus,
        };
      }),
    selectCobaltInstance: (id: string) => set(() => ({ selectedCobaltInstanceId: id })),
    recordCobaltInstanceResult: (id: string, status: "success" | "error", errorMessage?: string) =>
      set((s) => ({
        cobaltInstanceStatus: { ...s.cobaltInstanceStatus, [id]: { status, errorMessage, at: Date.now() } },
      })),
  };
}

// -- Exports -------------------------------------------------------------------

export {
  BUILTIN_COBALT_INSTANCE,
  DEFAULT_COBALT_INSTANCE_ID,
  createCobaltActions,
  resolveActiveCobaltInstance,
  resolveIsDefaultCobaltInstance,
};
export type { CobaltInstance, CobaltInstanceStatus, CobaltState };
