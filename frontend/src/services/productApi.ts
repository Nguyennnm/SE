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
}
interface ApiProduct {
  id: number | string; name: string; brand: string; category: string; category_code: string;
  price: number | null; original_price?: number | null; stock: number; rating: number | null;
  review_count: number | null; image_url?: string; variants?: ProductVariant[];
  images?: { image_url: string; alt_text?: string }[];
  specifications?: Record<string, unknown>; short_description?: string;
}
export interface Product {
  id: string; name: string; brand: string; category: string;
  price: number | null; originalPrice: number | null; stock: number; rating: number | null; reviews: number | null;
  processor: string; ram: number | null; storage: string; display: string;
  imageUrl?: string; images: string[]; variants: ProductVariant[]; description?: string;
  kind: 'laptop' | 'phone' | 'tablet'; color: string; badge?: string;
}
export interface Pagination { page: number; pageSize: number; total: number; totalPages: number }
export interface Category { code: string; name: string }
export interface SearchParams { q: string; category: string; brands: string[]; maxPrice?: number; inStock: boolean; sort: string; page: number; limit: number }
interface Envelope<T> { success: boolean; data: T; pagination?: Pagination }

function adaptProduct(p: ApiProduct): Product {
  const v = p.variants?.[0];
  const specs = { ...p.specifications, ...v?.specifications };
  const text = (...keys: string[]) => {
    for (const key of keys) if (typeof specs[key] === 'string' || typeof specs[key] === 'number') return String(specs[key]);
    return '';
  };
  return {
    id: String(p.id), name: p.name, brand: p.brand, category: p.category,
    price: p.price == null ? null : Number(p.price), originalPrice: p.original_price == null ? null : Number(p.original_price),
    stock: Number(p.stock) || 0, rating: p.rating, reviews: p.review_count,
    processor: text('cpu', 'cpu_chipset', 'chipset', 'Bộ vi xử lý', 'CPU') || 'Xem thông số chi tiết',
    ram: v?.ram_gb ?? null, storage: v?.storage_gb ? `${v.storage_gb}GB` : text('storage'),
    display: text('screen', 'display', 'Màn hình') || 'Chưa có thông tin',
    imageUrl: p.image_url, images: p.images?.map(i => i.image_url) ?? [], variants: p.variants ?? [], description: p.short_description,
    kind: p.category_code === 'phone' ? 'phone' : p.category_code === 'tablet' ? 'tablet' : 'laptop', color: '#4879bd',
  };
}
export async function searchProducts(params: SearchParams, signal?: AbortSignal) {
  const query = new URLSearchParams({ q: params.q, sort: params.sort, page: String(params.page), limit: String(params.limit) });
  if (params.category !== 'Tất cả') query.set('category', params.category);
  if (params.brands.length) query.set('brand', params.brands.join(','));
  if (params.maxPrice !== undefined) query.set('maxPrice', String(params.maxPrice));
  if (params.inStock) query.set('inStock', 'true');
  const { data } = await apiClient.get<Envelope<ApiProduct[]>>(`/products/search?${query}`, { signal });
  if (!data.pagination) throw new Error('API chưa trả thông tin phân trang.');
  return { items: data.data.map(adaptProduct), pagination: data.pagination };
}
export async function getProduct(id: string, signal?: AbortSignal) {
  const { data } = await apiClient.get<Envelope<ApiProduct>>(`/products/${encodeURIComponent(id)}`, { signal });
  return adaptProduct(data.data);
}
export async function getCategories(signal?: AbortSignal) {
  const { data } = await apiClient.get<Envelope<Category[]>>('/categories', { signal });
  return data.data;
}
export async function getBrands(signal?: AbortSignal) {
  const { data } = await apiClient.get<Envelope<string[]>>('/brands', { signal });
  return data.data;
}
export async function getDataSource(signal?: AbortSignal) {
  const { data } = await apiClient.get<{ dataSource: string }>('/health', { signal });
  return data.dataSource;
}
