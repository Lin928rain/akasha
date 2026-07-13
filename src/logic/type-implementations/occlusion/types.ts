// Types for Occlusion cards (using text markers)
export interface OcclusionNoteContent {
  type: "imageOcclusion";
  front: string; // Text with occlusion markers, e.g., "This is a {{hidden}} word"
  back: string; // Full text without markers or additional explanation
}

// Re-export with old name for backward compatibility
export type ImageOcclusionNoteContent = OcclusionNoteContent;

// Marker format: {{text}} for occluded content
export const OCCLUSION_START_MARKER = "{{";
export const OCCLUSION_END_MARKER = "}}";
