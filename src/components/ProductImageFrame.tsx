import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ProductImageFrameProps {
  src: string;
  alt: string;
  loading?: "lazy" | "eager";
  className?: string;
  imageClassName?: string;
}

const ProductImageFrame = ({
  src,
  alt,
  loading = "lazy",
  className,
  imageClassName,
}: ProductImageFrameProps) => {
  const isPlaceholder = !src || src.includes("placeholder.svg");
  const [hasError, setHasError] = useState(isPlaceholder);
  const [isLoaded, setIsLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setHasError(isPlaceholder);
    // No HTML pré-renderizado a imagem pode terminar de carregar antes da hidratação,
    // e aí o onLoad nunca dispara.
    const image = imageRef.current;
    setIsLoaded(Boolean(!isPlaceholder && image?.complete && image.naturalWidth > 0));
  }, [isPlaceholder, src]);

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden border-b border-border bg-[radial-gradient(circle_at_50%_35%,hsl(84_81%_44%/.12),transparent_30%),linear-gradient(145deg,#fff,#f3f6f8)]",
        className,
      )}
    >
      <div className="absolute inset-x-6 bottom-5 h-px bg-gradient-to-r from-transparent via-secondary/15 to-transparent" />

      {hasError ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-5 text-center">
          <span className="text-xs font-bold uppercase tracking-[0.24em] text-lime-dark">
            Hidroconex
          </span>
          <span className="max-w-[16rem] text-sm font-semibold leading-snug text-secondary/75">
            Imagem técnica em atualização
          </span>
        </div>
      ) : (
        <>
          {!isLoaded && (
            <div
              className="absolute inset-5 flex items-center justify-center rounded-md bg-white/60 text-center shadow-inner"
              aria-hidden="true"
            >
              {/* Texto via CSS: não entra no conteúdo indexado de cada card. */}
              <span className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-lime-dark/50 before:content-['Hidroconex']" />
            </div>
          )}
          <img
            ref={imageRef}
            src={src}
            alt={alt}
            loading={loading}
            decoding="async"
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            className={cn(
              "relative z-10 max-h-full max-w-full object-contain transition duration-300",
              imageClassName,
            )}
          />
        </>
      )}
    </div>
  );
};

export default ProductImageFrame;
