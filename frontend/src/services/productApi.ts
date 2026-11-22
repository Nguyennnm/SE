import { apiClient } from './apiClient';

export interface ProductVariant {
  id?: number | string;
  sku: string;
  variant_name: string;
  ram_gb?: number | null;
  storage_gb?: number | null;
  selling_price_vnd?: number | null;
  price_vnd?: number | null;
  stock: number;
  specifications?: Record<string, unknown>;
  short_description?: string;
}
interface ApiProduct {
  id: number | string; name: string; brand: string; category: string; category_code: string;
  price: number | null; original_price?: number | null; stock: number; rating: number | null;
  review_count: number | null; image_url?: string; variants?: ProductVariant[];
  images?: { variant_id?: number | string | null; image_url: string; alt_text?: string }[];
  variant_count?: number;
  specifications?: Record<string, unknown>; short_description?: string;
}
export interface Product {
  id: string; name: string; brand: string; category: string;
  price: number | null; originalPrice: number | null; stock: number; rating: number | null; reviews: number | null;
  processor: string; ram: number | null; storage: string; display: string;
  imageUrl?: string; images: string[]; variants: ProductVariant[]; description?: string;
  selectedSku?: string;
  variantName?: string; variantCount?: number; variantColor?: string;
  source?: ApiProduct;
  kind: 'laptop' | 'phone' | 'tablet'; color: string; badge?: string;
}
export interface Pagination { page: number; pageSize: number; total: number; totalPages: number }
export interface Category { code: string; name: string }
export interface PriceRange { min: number; max: number | null }
export const specKeys = ['ram', 'storage', 'cpu', 'screenSize', 'screenTech', 'os', 'usage', 'refreshRate'] as const;
export type SpecKey = typeof specKeys[number];
export type SpecSelection = Partial<Record<SpecKey, string[]>>;
export interface FacetGroup {
  key: SpecKey; label: string; options: { value: string; label: string; count: number }[];
  coverage?: { totalProducts: number; knownProducts: number; missingProducts: number; partialProducts: number; totalVariants: number; missingVariants: number };
}
export interface SearchParams extends SpecSelection { q: string; category: string; brands: string[]; maxPrice?: number; inStock: boolean; sort: string; page: number; limit: number; ids?: string[] }
interface Envelope<T> { success: boolean; data: T; pagination?: Pagination }

function adaptProduct(p: ApiProduct, preferredSku?: string): Product {
  const selected = preferredSku ? p.variants?.find(v => v.sku === preferredSku) : undefined;
  const v = selected ?? p.variants?.[0];
  const variantImages = p.images?.filter(i => v?.id != null && String(i.variant_id) === String(v.id));
  const images = variantImages?.length ? variantImages : p.images?.filter(i => i.variant_id == null);
  // Model-level specs were imported from one SKU; do not inherit that SKU's
  // processor/color/etc. when the selected SKU has an incomplete spec sheet.
  const specs = v?.specifications ?? p.specifications ?? {};
  const text = (...keys: string[]) => {
    for (const key of keys) if (typeof specs[key] === 'string' || typeof specs[key] === 'number') return String(specs[key]);
    return '';
  };
  return {
    id: String(p.id), name: p.name, brand: p.brand, category: p.category,
    price: (v ? v.selling_price_vnd : p.price) == null ? null : Number(v ? v.selling_price_vnd : p.price), originalPrice: p.original_price == null ? null : Number(p.original_price),
    stock: Math.max(0, Number(v ? v.stock : p.stock) || 0), rating: p.rating, reviews: p.review_count,
    processor: text('cpu', 'cpu_chipset', 'chipset', 'Bộ vi xử lý', 'CPU') || 'Xem thông số chi tiết',
    ram: v?.ram_gb ?? null, storage: v?.storage_gb ? `${v.storage_gb}GB` : text('storage'),
    display: text('screen', 'display', 'Màn hình') || 'Chưa có thông tin',
    imageUrl: images?.[0]?.image_url ?? (p.images ? undefined : p.image_url), images: images?.map(i => i.image_url) ?? [], variants: p.variants ?? [], description: v?.short_description ?? p.short_description, selectedSku: v?.sku,
    variantName: v?.variant_name, variantCount: p.variant_count ?? p.variants?.length ?? 0,
    variantColor: typeof v?.specifications?.color === 'string' ? v.specifications.color : undefined, source: p,
    kind: p.category_code === 'phone' ? 'phone' : p.category_code === 'tablet' ? 'tablet' : 'laptop', color: '#4879bd',
  };
}
export function selectProductVariant(product: Product, sku: string): Product {
  if (!product.source?.variants?.some(v => v.sku === sku)) return product;
  return adaptProduct(product.source, sku);
}
export function searchQuery(params: SearchParams) {
  const query = new URLSearchParams({ q: params.q, groupBy: 'variant', sort: params.sort, page: String(params.page), limit: String(params.limit) });
  if (params.category !== 'Tất cả') query.set('category', params.category);
  if (params.brands.length) query.set('brand', params.brands.join(','));
  if (params.maxPrice !== undefined) query.set('maxPrice', String(params.maxPrice));
  if (params.inStock) query.set('inStock', 'true');
  if (params.ids) query.set('ids', params.ids.join(','));
  for (const key of specKeys) if (params[key]?.length) query.set(key, params[key]!.join(','));
  return query;
}
export async function searchProducts(params: SearchParams, signal?: AbortSignal) {
  const query = searchQuery(params);
  const { data } = await apiClient.get<Envelope<ApiProduct[]>>(`/products/search?${query}`, { signal });
  if (!data.pagination) throw new Error('API chưa trả thông tin phân trang.');
  return { items: data.data.map(p => adaptProduct(p)), pagination: data.pagination };
}
export async function getProduct(id: string, signal?: AbortSignal, preferredSku?: string) {
  const { data } = await apiClient.get<Envelope<ApiProduct>>(`/products/${encodeURIComponent(id)}`, { signal });
  return adaptProduct(data.data, preferredSku);
}
export async function getCategories(signal?: AbortSignal) {
  const { data } = await apiClient.get<Envelope<Category[]>>('/categories', { signal });
  return data.data;
}
export async function getPriceRange(signal?: AbortSignal) {
  const { data } = await apiClient.get<Envelope<PriceRange>>('/products/price-range', { signal });
  return data.data;
}
export async function getBrands(signal?: AbortSignal, category?: string) {
  const { data } = await apiClient.get<Envelope<string[]>>(`/brands${category && category !== 'Tất cả' ? '?category=' + encodeURIComponent(category) : ''}`, { signal });
  return data.data;
}
export async function getTechnicalFilters(category: string, signal?: AbortSignal) {
  const query = '?groupBy=variant' + (category && category !== 'Tất cả' ? '&category=' + encodeURIComponent(category) : '');
  const { data } = await apiClient.get<Envelope<FacetGroup[]>>(`/products/filters${query}`, { signal });
  return data.data;
}
export async function getSuggestions(params: SearchParams, signal?: AbortSignal) {
  const { data } = await apiClient.get<Envelope<ApiProduct[]>>(`/products/suggestions?${searchQuery(params)}`, { signal });
  return data.data.map(p => adaptProduct(p));
}
export async function getDataSource(signal?: AbortSignal) {
  const { data } = await apiClient.get<{ dataSource: string }>('/health', { signal });
  return data.dataSource;
}
