'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Package, Sparkles, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  sku: z.string().min(2, 'SKU requerido'),
  description: z.string().optional(),
  basePrice: z.coerce.number().min(0, 'Precio inválido'),
  salePrice: z.coerce.number().optional(),
  costPrice: z.coerce.number().optional(),
  stock: z.coerce.number().int().min(0).default(0),
  minStockAlert: z.coerce.number().int().min(0).default(5),
  categoryId: z.string().optional(),
  supplierId: z.string().optional(),
  barcode: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DISCONTINUED', 'OUT_OF_STOCK']).default('ACTIVE'),
  isFeatured: z.boolean().default(false),
});

type FormData = z.infer<typeof schema>;

interface ProductModalProps {
  open: boolean;
  onClose: () => void;
  product?: any;
}

export function ProductModal({ open, onClose, product }: ProductModalProps) {
  const queryClient = useQueryClient();
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const isEdit = !!product;

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const productName = watch('name');

  useEffect(() => {
    if (product) {
      reset({
        name: product.name ?? '',
        sku: product.sku ?? '',
        description: product.description ?? '',
        basePrice: product.basePrice ?? 0,
        salePrice: product.salePrice ?? undefined,
        costPrice: product.costPrice ?? undefined,
        stock: product.inventory?.[0]?.quantity ?? 0,
        minStockAlert: product.inventory?.[0]?.minStock ?? product.minStockAlert ?? 5,
        categoryId: product.categoryId ?? '',
        supplierId: product.supplierId ?? '',
        barcode: product.barcode ?? '',
        status: product.status ?? 'ACTIVE',
        isFeatured: product.isFeatured ?? false,
      });
    } else {
      reset({
        name: '',
        sku: '',
        description: '',
        basePrice: 0,
        stock: 0,
        minStockAlert: 5,
        status: 'ACTIVE',
        isFeatured: false,
      });
    }
  }, [product, reset]);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data.data),
    staleTime: 5 * 60_000,
    enabled: open,
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-list'],
    queryFn: () => api.get('/suppliers', { params: { limit: 100 } }).then((r) => r.data.data),
    staleTime: 5 * 60_000,
    enabled: open,
  });

  const saveMutation = useMutation({
    mutationFn: (data: FormData) =>
      isEdit
        ? api.patch(`/products/${product.id}`, data)
        : api.post('/products', data),
    onSuccess: () => {
      toast.success(isEdit ? 'Producto actualizado' : 'Producto creado');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onClose();
    },
    onError: () => toast.error('Error al guardar el producto'),
  });

  const generateDescription = async () => {
    if (!productName) return toast.error('Escribe el nombre primero');
    setGeneratingDesc(true);
    try {
      const res = await api.post('/ai/products/description', { name: productName, category: watch('categoryId') });
      setValue('description', res.data.data.description);
      toast.success('Descripción generada con IA');
    } catch {
      toast.error('Error al generar descripción');
    } finally {
      setGeneratingDesc(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <div
            className="relative w-full max-w-2xl nexus-card overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-nexus-500/15 flex items-center justify-center">
                  <Package className="h-5 w-5 text-nexus-500" />
                </div>
                <div>
                  <h2 className="font-semibold">{isEdit ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                  <p className="text-xs text-muted-foreground">{isEdit ? `SKU: ${product.sku}` : 'Completa la información del producto'}</p>
                </div>
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="overflow-y-auto custom-scroll">
              <div className="p-6 space-y-5">

                {/* Name + SKU */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Nombre *</Label>
                    <Input id="name" placeholder="Nombre del producto" className={cn(errors.name && 'border-destructive')} {...register('name')} />
                    {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sku">SKU *</Label>
                    <Input id="sku" placeholder="SKU-001" className={cn(errors.sku && 'border-destructive')} {...register('sku')} />
                    {errors.sku && <p className="text-xs text-destructive">{errors.sku.message}</p>}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="description">Descripción</Label>
                    <button
                      type="button"
                      onClick={generateDescription}
                      disabled={generatingDesc}
                      className="flex items-center gap-1.5 text-xs text-nexus-500 hover:text-nexus-400 transition-colors disabled:opacity-50"
                    >
                      {generatingDesc
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <Sparkles className="h-3 w-3" />}
                      Generar con IA
                    </button>
                  </div>
                  <textarea
                    id="description"
                    rows={3}
                    placeholder="Descripción del producto..."
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-nexus-500/50"
                    {...register('description')}
                  />
                </div>

                {/* Prices */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="basePrice">Precio base *</Label>
                    <Input id="basePrice" type="number" step="0.01" placeholder="0.00" className={cn(errors.basePrice && 'border-destructive')} {...register('basePrice')} />
                    {errors.basePrice && <p className="text-xs text-destructive">{errors.basePrice.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="salePrice">Precio venta</Label>
                    <Input id="salePrice" type="number" step="0.01" placeholder="0.00" {...register('salePrice')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="costPrice">Costo</Label>
                    <Input id="costPrice" type="number" step="0.01" placeholder="0.00" {...register('costPrice')} />
                  </div>
                </div>

                {/* Stock */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="stock">Stock inicial</Label>
                    <Input id="stock" type="number" min="0" {...register('stock')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="minStockAlert">Stock mínimo</Label>
                    <Input id="minStockAlert" type="number" min="0" {...register('minStockAlert')} />
                  </div>
                </div>

                {/* Category + Supplier */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Categoría</Label>
                    <select
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm"
                      {...register('categoryId')}
                    >
                      <option value="">Sin categoría</option>
                      {categories?.items?.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Proveedor</Label>
                    <select
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm"
                      {...register('supplierId')}
                    >
                      <option value="">Sin proveedor</option>
                      {suppliers?.items?.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Barcode + Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="barcode">Código de barras</Label>
                    <Input id="barcode" placeholder="7890000000000" {...register('barcode')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Estado</Label>
                    <select
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm"
                      {...register('status')}
                    >
                      <option value="ACTIVE">Activo</option>
                      <option value="INACTIVE">Inactivo</option>
                      <option value="DISCONTINUED">Descontinuado</option>
                      <option value="OUT_OF_STOCK">Sin stock</option>
                    </select>
                  </div>
                </div>

                {/* Featured toggle */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-nexus-500" {...register('isFeatured')} />
                  <span className="text-sm">Producto destacado</span>
                </label>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 p-6 border-t border-border">
                <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                <Button
                  type="submit"
                  className="bg-nexus-600 hover:bg-nexus-500 gap-2"
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isEdit ? 'Guardar cambios' : 'Crear producto'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
