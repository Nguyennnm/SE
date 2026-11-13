import { apiClient } from './apiClient';

export interface Product { id: string; name: string; brand?: string; category?: string; price: number; imageUrl?: string; }
export async function getProducts(): Promise<Product[]> {
  const { data } = await apiClient.get<{ data: Product[] }>('/products');
  return data.data;
}
