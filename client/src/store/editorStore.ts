import { create } from 'zustand';

interface EditorState {
  isCommandPaletteOpen: boolean;
  editorPosition: { lineNumber: number; column: number };
  editorTheme: string;
  
  toggleCommandPalette: () => void;
  setEditorPosition: (position: { lineNumber: number; column: number }) => void;
  setEditorTheme: (theme: string) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  isCommandPaletteOpen: false,
  editorPosition: { lineNumber: 1, column: 1 },
  editorTheme: 'vs-dark',
  
  toggleCommandPalette: () => 
    set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),
  
  setEditorPosition: (position) => 
    set({ editorPosition: position }),
  
  setEditorTheme: (theme) => 
    set({ editorTheme: theme })
}));
