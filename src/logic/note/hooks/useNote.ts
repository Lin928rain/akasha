import { db } from "../../db";
import { useDbQuery } from "../../useDbQuery";
import { Note, NoteType } from "../note";

export function useNote(noteId: string, cache?: Map<string, Note<NoteType>>) {
  return useDbQuery(
    () => {
      if (noteId && cache?.has(noteId)) {
        return Promise.resolve(cache.get(noteId));
      }

      return db.notes.get(noteId);
    },
    [noteId, cache],
    undefined
  );
}
