function imageUrl(configured: string | undefined, fallback: string) {
  if (!configured) return fallback;
  const url = new URL(configured);
  if (url.protocol !== "https:") throw new Error("Hero media URLs must be absolute HTTPS URLs.");
  return url.href;
}

export const heroImage = {
  mobile: imageUrl(process.env.FORMA_HERO_MOBILE_URL, "/images/forma-bedroom-mobile.webp"),
  desktop: imageUrl(process.env.FORMA_HERO_DESKTOP_URL, "/images/forma-bedroom.webp"),
};

export const productImage = {
  src: "/images/forma-product.webp",
  small: "/images/forma-product-small.webp",
  width: 1440,
  height: 1080,
};

export const textileImage = {
  src: "/images/forma-textile.webp",
  small: "/images/forma-textile-small.webp",
  width: 1080,
  height: 810,
};
