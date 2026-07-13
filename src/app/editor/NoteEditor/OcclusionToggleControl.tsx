import { RichTextEditor } from "@mantine/tiptap";
import { IconEyeOff } from "@tabler/icons-react";
import type { Editor } from "@tiptap/react";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  OCCLUSION_END_MARKER,
  OCCLUSION_START_MARKER,
} from "@/logic/type-implementations/occlusion/types";

export interface OcclusionToggleControlProps {
  editor: Editor | null;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function OcclusionToggleControl({
  editor,
}: OcclusionToggleControlProps) {
  const [t] = useTranslation();
  const isSelectionEmpty = editor?.state.selection.empty ?? true;

  const isActive = useMemo(() => {
    if (!editor || isSelectionEmpty) return false;
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, "\n", "\n");
    if (
      selectedText.startsWith(OCCLUSION_START_MARKER) &&
      selectedText.endsWith(OCCLUSION_END_MARKER)
    ) {
      return true;
    }

    const docSize = editor.state.doc.content.size;
    const before = editor.state.doc.textBetween(
      clamp(from - 2, 0, docSize),
      from,
      "",
      ""
    );
    const after = editor.state.doc.textBetween(
      to,
      clamp(to + 2, 0, docSize),
      "",
      ""
    );
    return before === OCCLUSION_START_MARKER && after === OCCLUSION_END_MARKER;
  }, [editor, isSelectionEmpty]);

  const toggle = useCallback(() => {
    if (!editor || isSelectionEmpty) return;

    const { from, to } = editor.state.selection;
    const docSize = editor.state.doc.content.size;
    const selectedText = editor.state.doc.textBetween(from, to, "\n", "\n");

    if (
      selectedText.startsWith(OCCLUSION_START_MARKER) &&
      selectedText.endsWith(OCCLUSION_END_MARKER)
    ) {
      editor
        .chain()
        .focus()
        .insertContentAt(
          { from, to },
          selectedText.slice(2, selectedText.length - 2)
        )
        .run();
      return;
    }

    const before = editor.state.doc.textBetween(
      clamp(from - 2, 0, docSize),
      from,
      "",
      ""
    );
    const after = editor.state.doc.textBetween(
      to,
      clamp(to + 2, 0, docSize),
      "",
      ""
    );

    if (before === OCCLUSION_START_MARKER && after === OCCLUSION_END_MARKER) {
      editor
        .chain()
        .focus()
        .deleteRange({ from: to, to: clamp(to + 2, 0, docSize) })
        .deleteRange({ from: clamp(from - 2, 0, docSize), to: from })
        .run();
      return;
    }

    if (selectedText.includes("\n")) {
      editor
        .chain()
        .focus()
        .insertContentAt(
          { from, to },
          `${OCCLUSION_START_MARKER}${selectedText.replace(/\n/g, "<br />")}${OCCLUSION_END_MARKER}`
        )
        .run();
      return;
    }

    editor
      .chain()
      .focus()
      .insertContentAt({ from: to, to }, OCCLUSION_END_MARKER)
      .insertContentAt({ from, to: from }, OCCLUSION_START_MARKER)
      .run();
  }, [editor, isSelectionEmpty]);

  return (
    <RichTextEditor.Control
      tabIndex={-1}
      aria-label={t("note.edit.toolbar.toggle-occlusion")}
      title={t("note.edit.toolbar.toggle-occlusion")}
      onMouseDown={(event) => event.preventDefault()}
      onClick={toggle}
      disabled={!editor || isSelectionEmpty}
      active={isActive}
    >
      <IconEyeOff />
    </RichTextEditor.Control>
  );
}

export default OcclusionToggleControl;
