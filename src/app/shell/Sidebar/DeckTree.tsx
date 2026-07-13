import { DeckSummary } from "@/logic/deck/deck";
import { NavLink } from "@mantine/core";
import { IconCards } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";

function DeckTree({ deck: parentDeck }: { deck: DeckSummary }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <NavLink
      label={parentDeck.name}
      leftSection={<IconCards size="1rem" stroke={1.5} />}
      active={location.pathname === `/deck/${parentDeck.id}`}
      onClick={() => {
        navigate(`/deck/${parentDeck.id}`);
      }}
      variant="subtle"
    />
  );
}
export default DeckTree;
