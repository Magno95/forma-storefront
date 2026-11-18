import { notFound } from "next/navigation";
import { StoreImage } from "@/components/store-image";
import { copy } from "@/lib/copy";
import { heroImage, productImage, textileImage } from "@/lib/media";
import { isLocale } from "@/lib/model";
import { storePath } from "@/lib/paths";
import { storeMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return storeMetadata(locale, "home", "Forma", copy[locale].homeDescription);
}

export default async function Home({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const labels = copy[locale];
  const product = storePath(locale, "product");

  return (
    <>
      <section className="hero shell" aria-labelledby="hero-title">
        <div className="hero-copy">
          <h1 id="hero-title">{labels.homeHeadline}</h1>
          <p>{labels.homeDescription}</p>
          <a className="primary-action" href={product} data-cta="home_hero_product">
            {labels.shop} <span aria-hidden="true">↗</span>
          </a>
        </div>
        <picture className="hero-media">
          <source media="(max-width: 720px)" srcSet={heroImage.mobile} />
          <img src={heroImage.desktop} width={1440} height={960} alt={labels.heroAlt} fetchPriority="high" />
        </picture>
      </section>

      <section className="stories light-panel" aria-labelledby="story-title">
        <div className="shell">
          <div className="section-intro">
            <h2 id="story-title">{labels.details}</h2>
            <p>{labels.detailsDescription}</p>
          </div>
          <div className="story-grid">
            <article>
              <StoreImage className="story-photo" image={productImage} alt={labels.productAlt} sizes="(max-width: 720px) 100vw, 50vw" />
              <h3>{labels.storyOne}</h3>
              <p>{labels.storyOneDescription}</p>
              <a className="text-action" href={`${product}#configure`} data-cta="home_configure">
                {labels.storyOneCta} <span aria-hidden="true">↗</span>
              </a>
            </article>
            <article>
              <StoreImage className="story-photo" image={textileImage} alt={labels.textileAlt} sizes="(max-width: 720px) 100vw, 50vw" />
              <h3>{labels.storyTwo}</h3>
              <p>{labels.storyTwoDescription}</p>
              <a className="text-action" href={`${product}#gallery`} data-cta="home_gallery">
                {labels.storyTwoCta} <span aria-hidden="true">↗</span>
              </a>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
