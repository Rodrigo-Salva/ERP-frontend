import { api } from '@/lib/api/client';
import { fetchAllPages } from '@/lib/api/paging';
import type { Category, ListParams, Page, Unit } from '@/lib/api/types';
import type { Product, Variant } from './types';

const base = (o: string) => `/organizations/${o}`;

export interface ProductParams extends ListParams {
  categoryId?: string;
}

export const productsKey = (o: string, params?: ProductParams) =>
  ['organizations', o, 'products', params ?? {}] as const;
export const productsPrefix = (o: string) =>
  ['organizations', o, 'products'] as const;
export const variantsKey = (o: string, productId: string) =>
  ['organizations', o, 'product-variants', productId] as const;

export const fetchProducts = (
  o: string,
  params: ProductParams,
  signal?: AbortSignal,
) =>
  api.get<Page<Product>>(`${base(o)}/products`, {
    query: { ...params },
    signal,
  });

export interface ProductBody {
  name?: string;
  sku?: string;
  barcode?: string | null;
  unitId?: string;
  categoryId?: string | null;
  description?: string | null;
  cost?: string;
  price?: string;
  lowStockThreshold?: string;
}

export const createProduct = (o: string, body: ProductBody) =>
  api.post<Product>(`${base(o)}/products`, { body });

export const updateProduct = (o: string, id: string, body: ProductBody) =>
  api.patch<Product>(`${base(o)}/products/${id}`, { body });

export const setProductArchived = (o: string, id: string, archived: boolean) =>
  api.post<Product>(
    `${base(o)}/products/${id}/${archived ? 'archive' : 'restore'}`,
    {
      body: {},
    },
  );

export const fetchVariants = (
  o: string,
  productId: string,
  signal?: AbortSignal,
) =>
  fetchAllPages<Variant>(
    `${base(o)}/products/${productId}/variants`,
    {},
    signal,
  );

export interface VariantBody {
  name?: string;
  sku?: string;
  barcode?: string | null;
  price?: string;
  cost?: string;
  archived?: boolean;
}

export const createVariant = (
  o: string,
  productId: string,
  body: VariantBody,
) => api.post<Variant>(`${base(o)}/products/${productId}/variants`, { body });

export const updateVariant = (
  o: string,
  productId: string,
  id: string,
  body: VariantBody,
) =>
  api.patch<Variant>(`${base(o)}/products/${productId}/variants/${id}`, {
    body,
  });

// Categorías y unidades comparten la misma forma de operaciones.
export type TaxonomyKind = 'categories' | 'units';

export const fetchTaxonomy = <T extends Category | Unit>(
  o: string,
  kind: TaxonomyKind,
  params: ListParams,
  signal?: AbortSignal,
) => api.get<Page<T>>(`${base(o)}/${kind}`, { query: { ...params }, signal });

export const createTaxonomy = (
  o: string,
  kind: TaxonomyKind,
  body: Record<string, unknown>,
) => api.post<Category | Unit>(`${base(o)}/${kind}`, { body });

export const updateTaxonomy = (
  o: string,
  kind: TaxonomyKind,
  id: string,
  body: Record<string, unknown>,
) => api.patch<Category | Unit>(`${base(o)}/${kind}/${id}`, { body });

export const setTaxonomyArchived = (
  o: string,
  kind: TaxonomyKind,
  id: string,
  archived: boolean,
) =>
  api.post<Category | Unit>(
    `${base(o)}/${kind}/${id}/${archived ? 'archive' : 'restore'}`,
    {
      body: {},
    },
  );
