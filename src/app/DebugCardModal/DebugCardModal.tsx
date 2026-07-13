import { NoteType } from "@/logic/note/note";
import { Modal, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Card } from "../../logic/card/card";
import DebugCardTable from "./DebugCardTable";

interface DebugCardModalProps {
  opened: boolean;
  setOpened: Function;
  card?: Card<NoteType>;
}

function DebugCardModal({ opened, setOpened, card }: DebugCardModalProps) {
  const [t] = useTranslation();
  try {
    return (
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={t("debug.title")}
      >
        <DebugCardTable card={card} />
      </Modal>
    );
  } catch (e) {
    console.error(e);
    return (
      <Text c="red" fw="700" fz="sm">
        {t("debug.faulty-card")}
      </Text>
    );
  }
}

export default DebugCardModal;
