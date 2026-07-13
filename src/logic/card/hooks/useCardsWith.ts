import { DbTable, db } from "../../db";
import { NoteType } from "../../note/note";
import { useDbQuery } from "../../useDbQuery";
import { Card } from "../card";

export function useCardsWith(
  querier: (
    cards: DbTable<Card<NoteType>>
  ) => Promise<Card<NoteType>[] | undefined>,
  dependencies: any[]
): [Card<NoteType>[] | undefined, boolean] {
  return useDbQuery(
    () => querier(db.cards).then((cards) => [cards, cards !== undefined]),
    dependencies,
    [undefined, false]
  );
}
