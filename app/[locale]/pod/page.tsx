import { notFound } from "next/navigation";
import { ProductForm } from "@/components/product-form";
import { StoreImage } from "@/components/store-image";
import { copy } from "@/lib/copy";
import { productImage, textileImage } from "@/lib/media";
import { isLocale } from "@/lib/model";
import { storeMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return storeMetadata(locale, "product", "Forma Cover", copy[locale].productDescription);
}

export default async function Product({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const labels = copy[locale];

  return (
    <section className="light-panel">
      <div className="shell product-grid content-pad">
        <div id="gallery" className="product-gallery">
          <StoreImage className="product-photo" image={productImage} alt={labels.productAlt} sizes="(max-width: 720px) 100vw, 55vw" priority />
          <StoreImage className="product-detail" image={textileImage} alt={labels.textileAlt} sizes="(max-width: 720px) 44vw, 27vw" />
        </div>
        <div id="configure" className="product-config">
          <h1>{labels.product}</h1>
          <p className="page-description">{labels.productDescription}</p>
          <ProductForm locale={locale} labels={{
            from: labels.from, size: labels.size, climate: labels.climate,
            choose: labels.choose, double: labels.double, queen: labels.queen, king: labels.king,
            cool: labels.cool, balanced: labels.balanced, warm: labels.warm, add: labels.add,
            adding: labels.adding, added: labels.added, quantityLimit: labels.quantityLimit,
            viewCart: labels.viewCart, loadingConfig: labels.loadingConfig, retry: labels.retry,
            error: labels.error,
          }} />
        </div>
      </div>
    </section>
  );
}
