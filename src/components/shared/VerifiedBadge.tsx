import { CSSProperties } from "react";

/**
 * Facebook-style verified badge — scalloped/starburst shape with a
 * white checkmark. Color is configurable (use a brand or green hex).
 */
export type VerifiedBadgeProps = {
  size?: number;
  color?: string;       // fill of the badge shape
  checkColor?: string;  // color of the inner check
  title?: string;
  className?: string;
  style?: CSSProperties;
};

const SCALLOP_PATH =
  "M50 2 L60 10 L72 6 L78 17 L91 19 L92 32 L102 40 L96 51 L102 62 L92 70 L91 83 L78 85 L72 96 L60 92 L50 100 L40 92 L28 96 L22 85 L9 83 L8 70 L-2 62 L4 51 L-2 40 L8 32 L9 19 L22 17 L28 6 L40 10 Z";

export const VerifiedBadge = ({
  size = 18,
  color = "#1d9bf0",
  checkColor = "#ffffff",
  title = "Verified",
  className,
  style,
}: VerifiedBadgeProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    role="img"
    aria-label={title}
    className={className}
    style={style}
  >
    <title>{title}</title>
    <path d={SCALLOP_PATH} fill={color} />
    <path
      d="M30 52 L45 66 L72 38"
      fill="none"
      stroke={checkColor}
      strokeWidth="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default VerifiedBadge;
