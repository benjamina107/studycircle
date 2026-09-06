import Image from "next/image";
import type { CSSProperties } from "react";

export type BrandMarkProps = {
  size?: number;
  className?: string;
  style?: CSSProperties;
  /** Use an empty string beside a wordmark or inside an already labeled link. */
  alt?: string;
};

/** The supplied logo, unchanged; all clear space is applied by layout. */
export default function BrandMark({
  size = 40,
  className,
  style,
  alt = "StudyCircle",
}: BrandMarkProps) {
  return (
    <Image
      src="/brand/studycircle-original.png"
      width={1650}
      height={1614}
      alt={alt}
      className={className}
      unoptimized
      style={{
        display: "inline-block",
        flexShrink: 0,
        width: size,
        height: size,
        boxSizing: "border-box",
        padding: size * 0.14,
        objectFit: "contain",
        verticalAlign: "middle",
        ...style,
      }}
    />
  );
}
