import { Rating } from "fsrs.js";
import classes from "./VisualFeedback.module.css";

interface VisualFeedbackProps {
  rating: Rating | null;
  isSlash?: boolean;
}

export default function VisualFeedback({ rating, isSlash }: VisualFeedbackProps) {
  const getClassName = () => {
    if (isSlash) return classes.Slash;
    if (rating === null) return "";
    const ratingKey = Rating[rating] as keyof typeof classes;
    return classes[ratingKey] || "";
  };

  const className = getClassName();
  return <div className={classes.visualFeedback + " " + className} />;
}
