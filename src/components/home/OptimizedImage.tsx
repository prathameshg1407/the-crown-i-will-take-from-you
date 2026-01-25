// components/home/OptimizedImage.tsx
import Image from "next/image";

interface OptimizedImageProps {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
  sizes?: string;
}

export default function OptimizedImage({
  src,
  alt,
  priority = false,
  className = "",
  sizes = "(min-width: 1024px) 33vw, 50vw",
}: OptimizedImageProps) {
  // Generate blur placeholder
  const shimmer = (w: number, h: number) => `
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${w}" height="${h}" fill="#1a1a1a"/>
    </svg>
  `;

  const toBase64 = (str: string) =>
    typeof window === "undefined"
      ? Buffer.from(str).toString("base64")
      : window.btoa(str);

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      quality={80}
      priority={priority}
      placeholder="blur"
      blurDataURL={`data:image/svg+xml;base64,${toBase64(shimmer(700, 475))}`}
      className={`object-contain ${className}`}
    />
  );
}