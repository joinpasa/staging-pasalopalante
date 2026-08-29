import { forwardRef } from "react";
import KindnessCard from "./KindnessCard";

interface Props {
  description?: string | null;
  firstName?: string | null;
  mode?: string | null;
  photoUrl?: string | null;
  seed?: string | null;
}

const ShareGraphic = forwardRef<HTMLDivElement, Props>((props, ref) => (
  <KindnessCard ref={ref} variant="branded" {...props} />
));
ShareGraphic.displayName = "ShareGraphic";
export default ShareGraphic;
