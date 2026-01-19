
export interface Scene {
  id: number;
  title: string;
  narration: string;
  dialogue?: string;
  visualPrompt: string;
  themeColor: string;
  semiotics: {
    composition: string;
    eyes: string;
  };
}

export interface AppState {
  currentSceneIndex: number;
  generatedImages: Record<number, string>;
  isImageLoading: boolean;
  isAudioLoading: boolean;
  error: string | null;
  isStarted: boolean;
  isMuted: boolean;
}
