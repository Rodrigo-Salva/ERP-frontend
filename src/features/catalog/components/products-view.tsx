'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Package, Plus, Search } from 'lucide-react';
import { useOrganization } from '@/components/providers/organization-context';
import { Badge } from '@/components/ui/data/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/forms/input';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/data/pagination';
import { EmptyBlock, QueryState } from '@/components/ui/data/query-state';
import { Select } from '@/components/ui/forms/select';
import { Table, TD, TH, THead, TR } from '@/components/ui/data/table';
import { useApiMutation } from '@/lib/hooks/use-api-mutation';
import { useDebounced } from '@/lib/hooks/use-debounced';
import { useCategories } from '@/lib/queries/reference';
import { formatQuantity } from '@/lib/money';
import {
  fetchProducts,
  productsKey,
  productsPrefix,
  setProductArchived,
} from '../api';
import type { Product } from '../types';
import { ProductFormDialog } from './product-form-dialog';
import { VariantsDialog } from './variants-dialog';

const LIMIT = 20;

export function ProductsView() {
  const { organizationId, money, isManager, canSeeCosts, locale } =
    useOrganization();
  const [page, setPage] = useState(1);
  const [text, setText] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('active');
  const q = useDebounced(text.trim());
  const [form, setForm] = useState<{ product: Product | null } | null>(null);
  const [variants, setVariants] = useState<Product | null>(null);
  const categories = useCategories(organizationId);
  const categoryName = (id: string | null) =>
    id ? (categories.data?.find((c) => c.id === id)?.name ?? '—') : '—';

  const params = {
    page,
    limit: LIMIT,
    q: q || undefined,
    status,
    categoryId: categoryId || undefined,
  };
  const products = useQuery({
    queryKey: productsKey(organizationId, params),
    queryFn: ({ signal }) => fetchProducts(organizationId, params, signal),
  });

  const archive = useApiMutation({
    mutationFn: (product: Product) =>
      setProductArchived(organizationId, product.id, !product.archivedAt),
    invalidate: [productsPrefix(organizationId)],
    successMessage: (p: Product) =>
      p.archivedAt ? 'Producto archivado' : 'Producto restaurado',
  });

  const reset = () => setPage(1);

  return (
    <>
      <PageHeader
        title="Productos"
        description="Catálogo con variantes, códigos de barras y umbrales de stock."
        actions={
          isManager ? (
            <Button onClick={() => setForm({ product: null })}>
              <Plus aria-hidden className="size-4" />
              Nuevo producto
            </Button>
          ) : null
        }
      />
      <div className="mb-5 grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.7fr)]">
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground"
          />
          <Input
            className="pl-10"
            aria-label="Buscar producto"
            placeholder="Nombre, SKU o código de barras"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              reset();
            }}
          />
        </div>
        <Select
          aria-label="Categoría"
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            reset();
          }}
        >
          <option value="">Todas las categorías</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Estado"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            reset();
          }}
        >
          <option value="active">Activos</option>
          <option value="archived">Archivados</option>
          <option value="all">Todos</option>
        </Select>
      </div>

      <QueryState
        query={products}
        isEmpty={(d) => d.items.length === 0}
        empty={
          <EmptyBlock
            title="No hay productos"
            description={
              q ? 'Prueba con otra búsqueda.' : 'Crea el primero para empezar.'
            }
            action={
              isManager ? (
                <Button onClick={() => setForm({ product: null })}>
                  Nuevo producto
                </Button>
              ) : undefined
            }
          />
        }
      >
        {(data) => (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Producto</TH>
                  <TH>SKU</TH>
                  <TH>Categoría</TH>
                  <TH numeric>Precio</TH>
                  {canSeeCosts ? <TH numeric>Costo</TH> : null}
                  <TH numeric>Umbral</TH>
                  <TH>
                    <span className="sr-only">Acciones</span>
                  </TH>
                </TR>
              </THead>
              <tbody>
                {data.items.map((product) => (
                  <TR key={product.id}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden
                          className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/7 text-primary"
                        >
                          <Package className="size-4" />
                        </span>
                        <span className="font-medium">{product.name}</span>
                      </div>{' '}
                      {product.archivedAt ? <Badge>Archivado</Badge> : null}
                      {product.barcode ? (
                        <span className="block text-xs text-muted-foreground">
                          {product.barcode}
                        </span>
                      ) : null}
                    </TD>
                    <TD>{product.sku}</TD>
                    <TD>{categoryName(product.categoryId)}</TD>
                    <TD numeric>{money(product.price)}</TD>
                    {canSeeCosts ? (
                      <TD numeric>
                        {product.cost ? money(product.cost) : '—'}
                      </TD>
                    ) : null}
                    <TD numeric>
                      {formatQuantity(product.lowStockThreshold, locale)}
                    </TD>
                    <TD>
                      {isManager ? (
                        <div className="flex justify-end gap-1">
                          {!product.archivedAt ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setForm({ product })}
                              >
                                Editar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setVariants(product)}
                              >
                                Variantes
                              </Button>
                            </>
                          ) : null}
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={archive.isPending}
                            onClick={() => archive.mutate(product)}
                          >
                            {product.archivedAt ? 'Restaurar' : 'Archivar'}
                          </Button>
                        </div>
                      ) : null}
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
            <Pagination
              page={page}
              count={data.items.length}
              limit={LIMIT}
              onPageChange={setPage}
            />
          </>
        )}
      </QueryState>

      <ProductFormDialog
        open={form !== null}
        product={form?.product ?? null}
        onClose={() => setForm(null)}
      />
      <VariantsDialog product={variants} onClose={() => setVariants(null)} />
    </>
  );
}
