import { getByBarcode, searchByName } from "@/lib/food/openfoodfacts";
import { withAuth, ok } from "@/lib/api";

// GET /api/food/search?q=...  OR  ?barcode=...
export const GET = withAuth(async (_userId, req) => {
  const { searchParams } = new URL(req.url);
  const barcode = searchParams.get("barcode")?.trim();
  const q = searchParams.get("q")?.trim();

  if (barcode) {
    const product = await getByBarcode(barcode);
    return ok({ products: product ? [product] : [], notFound: !product });
  }
  if (q) {
    const products = await searchByName(q);
    return ok({ products, notFound: products.length === 0 });
  }
  return ok({ products: [], notFound: false });
});
