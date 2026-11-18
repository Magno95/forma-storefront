type Props = {
  image: { src: string; small: string; width: number; height: number };
  alt: string;
  priority?: boolean;
  sizes: string;
  className?: string;
};

export function StoreImage({ image, alt, priority, sizes, className }: Props) {
  return (
    <img
      className={className}
      src={image.src}
      srcSet={`${image.small} ${image.width / 2}w, ${image.src} ${image.width}w`}
      sizes={sizes}
      width={image.width}
      height={image.height}
      alt={alt}
      fetchPriority={priority ? "high" : undefined}
      loading={priority ? undefined : "lazy"}
      decoding="async"
    />
  );
}
