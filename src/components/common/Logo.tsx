import { Wine } from "lucide-react";
import { cn } from "../ui/utils";
import { memo } from "react";

type Props = {
  className?: string;
  size?: number;
};

/**
 * Logo component optimized with React.memo
 * Props rarely change, so memoization prevents unnecessary re-renders
 */
export const Logo = memo(({ className, size = 20 }: Props) => {
  return (
    <span className={cn("inline-flex items-center", className)}>
      <Wine className="text-primary" style={{ width: size, height: size }} />
    </span>
  );
});

Logo.displayName = "Logo";
