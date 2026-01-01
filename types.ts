
export interface WallpaperImage {
  id: string;
  url: string;
  prompt: string;
}

export interface GenerationState {
  isLoading: boolean;
  images: WallpaperImage[];
  error: string | null;
}
