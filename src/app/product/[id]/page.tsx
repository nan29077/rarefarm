import { MobileShell } from "@/components/layout/MobileShell";
import { ProductDetail } from "@/components/product/ProductDetail";

export default function ProductPage({ params }: { params: { id: string } }) {
  return (
    <MobileShell>
      <ProductDetail productId={params.id} />
    </MobileShell>
  );
}
