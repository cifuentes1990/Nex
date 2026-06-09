'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Filter, Download, Upload, Grid3X3,
  List, Package, TrendingUp, TrendingDown, Star,
  MoreHorizontal, Edit, Trash2, Eye, Barcode,
  AlertTriangle, ChevronDown, X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ProductModal } from '@/components/products/product-modal';
import { ProductCard } from '@/components/products/product-card';
import { useDebounce } from '@/hooks/use-debounce';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  ACTIVE:       { label: 'Activo',       color: 'bg-emerald-500/15 text-emerald-500' },
  INACTIVE:     { label: 'Inactivo',     color: 'bg-muted text-muted-foreground' },
  DISCONTINUED: { label: 'Descontinuado', color: 'bg-rose-500/15 text-rose-500' },
  OUT_OF_STOCK: { label: 'Sin stock',    color: 'bg-amber-500/15 text-amber-500' },
};

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 400);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['products', debouncedSearch, selectedCategory, selectedStatus, page],
    queryFn: () =>
      api.get('/products', {
        params: {
          search: debouncedSearch || undefined,
          categoryId: selectedCategory || undefined,
          status: selectedStatus || undefined,
          page,
          limit: 24,
        },
      }).then((r) => r.data.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });

  const deleteProduct = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      toast.success('Producto desactivado');
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const exportExcel = async () => {
    try {
      const res = await api.get('/reports/products/excel', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `productos-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Error al exportar productos');
    }
  };

  const stats = [
    { label: 'Total productos', value: formatNumber(data?.total ?? 0), icon: Package, color: 'nexus' },
    { label: 'Activos', value: formatNumber(data?.items?.filter((p: any) => p.status === 'ACTIVE')?.length ?? 0), icon: TrendingUp, color: 'emerald' },
    { label: 'Stock bajo', value: formatNumber(data?.items?.filter((p: any) => p.isLowStock)?.length ?? 0), icon: AlertTriangle, color: 'amber' },
    { label: 'Sin stock', value: formatNumber(data?.items?.filter((p: any) => p.stock === 0)?.length ?? 0), icon: TrendingDown, color: 'rose' },
  ];

  return (
    <div className="flex-1 overflow-auto custom-scroll">
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Productos</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Catálogo completo — {formatNumber(data?.total ?? 0)} productos
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={exportExcel}>
              <Download className="h-4 w-4" /> Exportar
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Upload className="h-4 w-4" /> Importar CSV
            </Button>
            <Button
              size="sm"
              className="gap-2 bg-nexus-600 hover:bg-nexus-500"
              onClick={() => { setEditProduct(null); setShowModal(true); }}
            >
              <Plus className="h-4 w-4" /> Nuevo Producto
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="nexus-card p-4 flex items-center gap-4">
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center',
                  s.color === 'nexus' && 'bg-nexus-500/15',
                  s.color === 'emerald' && 'bg-emerald-500/15',
                  s.color === 'amber' && 'bg-amber-500/15',
                  s.color === 'rose' && 'bg-rose-500/15',
                )}>
                  <Icon className={cn(
                    'h-5 w-5',
                    s.color === 'nexus' && 'text-nexus-500',
                    s.color === 'emerald' && 'text-emerald-500',
                    s.color === 'amber' && 'text-amber-500',
                    s.color === 'rose' && 'text-rose-500',
                  )} />
                </div>
                <div>
                  <p className="text-xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar por nombre, SKU, código..."
              className="pl-9 h-9"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Category filter */}
          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
            className="h-9 px-3 rounded-lg border border-border bg-background text-sm"
          >
            <option value="">Todas las categorías</option>
            {categories?.items?.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
            className="h-9 px-3 rounded-lg border border-border bg-background text-sm"
          >
            <option value="">Todos los estados</option>
            <option value="ACTIVE">Activos</option>
            <option value="INACTIVE">Inactivos</option>
            <option value="OUT_OF_STOCK">Sin stock</option>
          </select>

          {/* View toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden ml-auto">
            <button
              onClick={() => setView('grid')}
              className={cn('p-2 transition-colors', view === 'grid' ? 'bg-nexus-500 text-white' : 'hover:bg-muted')}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView('list')}
              className={cn('p-2 transition-colors', view === 'list' ? 'bg-nexus-500 text-white' : 'hover:bg-muted')}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Products */}
        {isLoading ? (
          <div className={cn(
            'grid gap-4',
            view === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6' : 'grid-cols-1',
          )}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className={cn('bg-muted animate-pulse rounded-xl', view === 'grid' ? 'aspect-[3/4]' : 'h-20')} />
            ))}
          </div>
        ) : view === 'grid' ? (
          <div
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4"
          >
            <>
              {data?.items?.map((product: any) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onEdit={() => { setEditProduct(product); setShowModal(true); }}
                  onDelete={() => deleteProduct.mutate(product.id)}
                />
              ))}
            </>
          </div>
        ) : (
          // List view
          <div className="nexus-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-4 font-medium text-muted-foreground">Producto</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">SKU</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Categoría</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Precio</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Margen</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Stock</th>
                  <th className="text-center p-4 font-medium text-muted-foreground">Estado</th>
                  <th className="p-4" />
                </tr>
              </thead>
              <tbody>
                {data?.items?.map((product: any, i: number) => (
                  <tr
                    key={product.id}
                    className="border-b border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden shrink-0">
                          {product.image
                            ? <img src={product.image} alt="" className="w-full h-full object-cover" />
                            : <Package className="h-5 w-5 m-2.5 text-muted-foreground" />
                          }
                        </div>
                        <div>
                          <p className="font-medium line-clamp-1">{product.name}</p>
                          {product.isFeatured && <Star className="h-3 w-3 text-amber-500 inline" />}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground font-mono text-xs">{product.sku}</td>
                    <td className="p-4 text-muted-foreground">{product.category?.name ?? '—'}</td>
                    <td className="p-4 text-right font-medium tabular-nums">{formatCurrency(product.salePrice ?? product.basePrice)}</td>
                    <td className="p-4 text-right">
                      <span className={cn(
                        'text-xs font-medium',
                        (product.margin ?? 0) >= 40 ? 'text-emerald-500' :
                        (product.margin ?? 0) >= 20 ? 'text-amber-500' : 'text-rose-500',
                      )}>
                        {(product.margin ?? 0).toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className={cn(
                        'font-medium tabular-nums',
                        product.stock === 0 ? 'text-rose-500' :
                        product.isLowStock ? 'text-amber-500' : '',
                      )}>
                        {formatNumber(product.stock ?? 0)}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={cn(
                        'text-xs px-2 py-1 rounded-full font-medium',
                        STATUS_MAP[product.status]?.color ?? '',
                      )}>
                        {STATUS_MAP[product.status]?.label ?? product.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7"
                          onClick={() => { setEditProduct(product); setShowModal(true); }}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-rose-500 hover:text-rose-400"
                          onClick={() => deleteProduct.mutate(product.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data?.items?.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No se encontraron productos</p>
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {page} de {data.pages}
            </span>
            <Button variant="outline" size="sm" disabled={page === data.pages} onClick={() => setPage(p => p + 1)}>
              Siguiente
            </Button>
          </div>
        )}
      </div>

      {/* Product Modal */}
      <ProductModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditProduct(null); }}
        product={editProduct}
      />
    </div>
  );
}
