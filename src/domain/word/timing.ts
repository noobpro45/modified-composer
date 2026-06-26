// -- Types --------------------------------------------------------------------

interface WordTiming {
  text: string;
  romaji?: string;
  begin: number;
  end: number;
  explicit?: true;
  syllableGroupId?: string;
}

// -- Exports ------------------------------------------------------------------

export type { WordTiming };
