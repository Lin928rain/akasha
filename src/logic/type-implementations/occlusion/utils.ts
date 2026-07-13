import { notifications } from "@mantine/notifications";
import { t } from "i18next";
import { createCardSkeleton } from "../../card/createCardSkeleton";
import { newCard } from "../../card/newCard";
import { db } from "../../db";
import { Deck } from "../../deck/deck";
import { NoteContent } from "../../note/NoteContent";
import { newNote } from "../../note/newNote";
import { Note } from "../../note/note";
import { NoteType } from "../../note/note";
import { updateNote } from "../../note/updateNote";
import {
  OCCLUSION_END_MARKER,
  OCCLUSION_START_MARKER,
  OcclusionNoteContent,
} from "./types";

export interface OcclusionItem {
  id: string;
  content: string;
  startIndex: number;
  endIndex: number;
}

// Generate a unique ID for occlusion blocks
export function generateOcclusionId(): string {
  return `occ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create a new occlusion note and associated card
export async function createOcclusionNote(
  front: string,
  back: string,
  deck: Deck
): Promise<void> {
  try {
    const content: OcclusionNoteContent = {
      type: NoteType.ImageOcclusion,
      front,
      back,
    };

    await db.transaction("rw", db.notes, db.decks, db.cards, async () => {
      const noteId = await newNote(
        deck,
        content as NoteContent<NoteType.ImageOcclusion>
      );
      await newCard(
        {
          ...createCardSkeleton(),
          note: noteId,
          content: { type: NoteType.ImageOcclusion },
        },
        deck
      );
    });

    notifications.show({
      title: t("notification.added"),
      message: t("notification.added-message"),
      color: "teal",
    });
  } catch (error) {
    console.error("Failed to create occlusion note:", error);
    notifications.show({
      title: t("notification.error"),
      message: t("notification.add-failed"),
      color: "red",
    });
  }
}

// Deprecated: use createOcclusionNote instead
export const createImageOcclusionNote = createOcclusionNote;

// Update an existing occlusion note
export async function updateOcclusionNote(
  note: Note<NoteType.ImageOcclusion>,
  front: string,
  back: string
): Promise<void> {
  try {
    const content: OcclusionNoteContent = {
      type: NoteType.ImageOcclusion,
      front,
      back,
    };
    await updateNote(note.id, {
      content: content as NoteContent<NoteType.ImageOcclusion>,
    });
    notifications.show({
      title: t("notification.saved"),
      message: t("notification.saved-message"),
      color: "green",
    });
  } catch (error) {
    console.error("Failed to update occlusion note:", error);
    notifications.show({
      title: t("notification.error"),
      message: t("notification.save-failed"),
      color: "red",
    });
  }
}

// Deprecated: use updateOcclusionNote instead
export const updateImageOcclusionNote = updateOcclusionNote;

// Parse occlusions from text (extract {{text}} markers)
export function parseOcclusionsFromText(text: string): OcclusionItem[] {
  const occlusions: OcclusionItem[] = [];
  let index = 0;

  while (true) {
    const startIndex = text.indexOf(OCCLUSION_START_MARKER, index);
    if (startIndex === -1) break;

    const contentStart = startIndex + OCCLUSION_START_MARKER.length;
    const endIndex = text.indexOf(OCCLUSION_END_MARKER, contentStart);

    if (endIndex === -1) break;

    const content = text.slice(contentStart, endIndex);
    const fullEndIndex = endIndex + OCCLUSION_END_MARKER.length;

    occlusions.push({
      id: `occ_${startIndex}_${fullEndIndex}`,
      content,
      startIndex,
      endIndex: fullEndIndex,
    });

    index = fullEndIndex;
  }

  return occlusions;
}

// Add occlusion markers around selected text
export function addOcclusionMarkers(
  text: string,
  selectionStart: number,
  selectionEnd: number
): string {
  const before = text.slice(0, selectionStart);
  const selected = text.slice(selectionStart, selectionEnd);
  const after = text.slice(selectionEnd);

  return `${before}${OCCLUSION_START_MARKER}${selected}${OCCLUSION_END_MARKER}${after}`;
}

// Remove occlusion markers from a specific range
export function removeOcclusionMarkers(
  text: string,
  startIndex: number,
  endIndex: number
): string {
  // Check if the range includes occlusion markers
  const segment = text.slice(startIndex, endIndex);

  // If segment starts with {{ and ends with }}, remove them
  if (
    segment.startsWith(OCCLUSION_START_MARKER) &&
    segment.endsWith(OCCLUSION_END_MARKER)
  ) {
    const before = text.slice(0, startIndex);
    const content = segment.slice(
      OCCLUSION_START_MARKER.length,
      segment.length - OCCLUSION_END_MARKER.length
    );
    const after = text.slice(endIndex);
    return `${before}${content}${after}`;
  }

  // Otherwise, try to find and remove any occlusion in the selection
  const occlusions = parseOcclusionsFromText(text);
  for (const occ of occlusions) {
    if (occ.startIndex >= startIndex && occ.endIndex <= endIndex) {
      return removeOcclusionMarkers(text, occ.startIndex, occ.endIndex);
    }
  }

  return text;
}

// Get list of occluded content (for displaying in editor)
export function getOccludedContentList(text: string): OcclusionItem[] {
  return parseOcclusionsFromText(text);
}

// Get sort field from note content (plain text without markers)
export function getSortFieldFromContent(content: OcclusionNoteContent): string {
  // Remove occlusion markers and get plain text
  const plainText = content.front
    .replace(
      new RegExp(
        `${OCCLUSION_START_MARKER}([^}]+)${OCCLUSION_END_MARKER}`,
        "g"
      ),
      "$1"
    )
    .replace(/<[^>]+>/g, " ");

  const temp = document.createElement("div");
  temp.innerHTML = plainText;
  return (temp.textContent || temp.innerText || "").trim();
}

// Count number of occlusions in text
export function countOcclusions(text: string): number {
  return parseOcclusionsFromText(text).length;
}

// Check if text has any occlusions
export function hasOcclusions(text: string): boolean {
  return (
    text.includes(OCCLUSION_START_MARKER) && text.includes(OCCLUSION_END_MARKER)
  );
}
