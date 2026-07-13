import { Note, NoteType } from "@/logic/note/note";
import { NoteSortFunction, NoteSorts } from "@/logic/note/sort";
import { Table } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useVirtualizer } from "@tanstack/react-virtual";
import clsx from "clsx";
import { DataTable, DataTableSortStatus } from "mantine-datatable";
import { useEffect, useMemo, useRef, useState } from "react";
import classes from "./NoteTable.module.css";

interface NoteTableProps {
  noteSet: Note<NoteType>[];
  sort: [NoteSortFunction, boolean];
  setSort: (sort: [NoteSortFunction, boolean]) => void;
  openedNote: Note<NoteType> | undefined;
  setOpenedNote: (note: Note<NoteType> | undefined) => void;
  openModal: () => void;
  selectedNotes: Note<NoteType>[];
  setSelectedNotes: (notes: Note<NoteType>[]) => void;
}

function NoteTable({
  noteSet,
  openedNote,
  setOpenedNote,
  setSort,
  openModal,
  selectedNotes,
  setSelectedNotes,
}: NoteTableProps) {
  const [sortStatus, setSortStatus] = useState<
    DataTableSortStatus<Note<NoteType>>
  >({
    columnAccessor: "sortField",
    sortKey: "bySortField",
    direction: "asc",
  });

  useEffect(() => {
    setSort([
      NoteSorts[sortStatus.sortKey as keyof typeof NoteSorts],
      sortStatus.direction === "asc",
    ]);
  }, [sortStatus]);

  const isTouch = useMediaQuery("(pointer: coarse)");
  const isMobile = useMediaQuery("(max-width: 50em)");

  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: noteSet.length,
    getScrollElement: () => scrollViewportRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const virtualRowMap = useMemo(() => {
    return new Map(virtualRows.map((row) => [row.index, row]));
  }, [virtualRows]);

  return (
    <DataTable
      className={classes.table}
      classNames={{
        table: classes.virtualTable,
        header: classes.virtualHeader,
      }}
      style={
        { "--virtual-body-height": `${totalSize}px` } as React.CSSProperties
      }
      records={noteSet}
      columns={[
        {
          accessor: "sortField",
          title: "Name",
          ellipsis: true,
          width: 200,
          resizable: false,
          filtering: true,
          sortable: true,
          sortKey: "bySortField",
        },
        {
          accessor: "creationDate",
          title: "Creation Date",
          render: (note) => note.creationDate.toLocaleDateString(),
          resizable: false,
          sortable: true,
          sortKey: "byCreationDate",
        },
        {
          accessor: "content.type",
          title: "Note Type",
          resizable: false,
          sortable: true,
          sortKey: "byType",
        },
      ]}
      withTableBorder={false}
      withRowBorders={false}
      highlightOnHover
      borderRadius="md"
      striped="odd"
      height="100%"
      textSelectionDisabled={isTouch}
      scrollViewportRef={scrollViewportRef}
      selectionCheckboxProps={{ size: isMobile ? "sm" : "xs" }}
      selectionColumnStyle={{ width: 40, minWidth: 40 }}
      selectedRecords={selectedNotes}
      onSelectedRecordsChange={setSelectedNotes}
      sortStatus={sortStatus}
      onSortStatusChange={setSortStatus}
      rowClassName={(record) =>
        clsx({
          [classes.selected]: record.id === openedNote?.id,
          [classes.row]: true,
        })
      }
      rowFactory={({ children, rowProps, index }) => {
        const virtualRow = virtualRowMap.get(index);
        if (!virtualRow) {
          return null;
        }
        return (
          <Table.Tr
            {...rowProps}
            className={clsx(rowProps.className, classes.virtualRow)}
            style={
              rowProps.style
                ? [
                    rowProps.style,
                    { transform: `translateY(${virtualRow.start}px)` },
                  ]
                : { transform: `translateY(${virtualRow.start}px)` }
            }
          >
            {children}
          </Table.Tr>
        );
      }}
      onRowClick={(row) => {
        setOpenedNote(row.record);
        if (isMobile) {
          openModal();
        }
      }}
      onRowDoubleClick={(row) => {
        setOpenedNote(row.record);
        openModal();
      }}
    />
  );
}

export default NoteTable;
