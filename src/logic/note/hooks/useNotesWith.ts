import { DbTable, db } from "../../db";
import { useDbQuery } from "../../useDbQuery";
import { Note, NoteType } from "../note";

export function useNotesWith(
  querier: (
    notes: DbTable<Note<NoteType>>
  ) => Promise<Note<NoteType>[] | undefined>,
  dependencies: any[]
): [Note<NoteType>[] | undefined, boolean] {
  return useDbQuery(
    () => querier(db.notes).then((notes) => [notes, notes !== undefined]),
    dependencies,
    [undefined, false]
  );
}
