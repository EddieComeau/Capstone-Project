// src/components/cards/CardWrapper.jsx
import React from "react";
import SkillCard from "./SkillCard";
import OLineCard from "./OLineCard";
import OLineAdvancedCard from "./OLineAdvancedCard";
import SpecialTeamsCard from "./SpecialTeamsCard";
import DefenseCard from "./DefenseCard";

export default function CardWrapper({ card }) {
  if (!card) return null;

  switch (card.cardType) {
    case "skill":
      return <SkillCard card={card} />;
    case "oline-basic":
      return <OLineCard card={card} />;
    case "oline-advanced":
      return <OLineAdvancedCard card={card} />;
    case "special-teams":
      return <SpecialTeamsCard card={card} />;
    case "defense":
      return <DefenseCard card={card} />;
    default:
      return null;
  }
}
