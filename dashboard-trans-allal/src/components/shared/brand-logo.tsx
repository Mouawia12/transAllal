import { cn } from "../../lib/utils/cn";

type BrandLogoProps = {
  size?: number;
  alt?: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
};

export function BrandLogo({
  size = 56,
  alt = "Trans Allal",
  className,
  imageClassName,
  priority = false,
}: BrandLogoProps) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-[22px] border border-black/10 bg-white/90 shadow-[0_18px_40px_rgba(12,107,88,0.14)]",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <img
        src="/brand/logo.png"
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        className={cn("block h-full w-full object-cover", imageClassName)}
      />
    </div>
  );
}
