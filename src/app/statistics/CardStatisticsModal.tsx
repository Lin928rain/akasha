import { NoteType } from "@/logic/note/note";
import { Modal } from "@mantine/core";
import { useTranslation } from "react-i18next";
import ModalProps from "../../components/ModalProps";
import { Card } from "../../logic/card/card";
import CardHistory from "./CardHistory";

interface DeckOptionsModalProps extends ModalProps {
  card?: Card<NoteType>;
}

function DeckOptionsModal({ opened, setOpened, card }: DeckOptionsModalProps) {
  const [t] = useTranslation();
  return (
    <Modal
      opened={opened}
      onClose={() => setOpened(false)}
      title={t("statistics.title")}
    >
      <CardHistory card={card} />
    </Modal>
  );
}

export default DeckOptionsModal;
