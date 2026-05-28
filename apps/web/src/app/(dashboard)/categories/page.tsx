'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag, Plus, X, Edit, Trash2, Package } from 'lucide-react';
import { api } from '@/lib/api';
import { formatNumber } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#f97316'];

export default function CategoriesPage() {
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories', { params: { limit: 100 } }).then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });

  const deleteCategory = useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      toast.success('Categoría eliminada');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const categories: any[] = data?.items ?? [];

  return (
    <div className="flex-1 overflow-auto custom-scroll">
      <div className="p-6 space-y-6 max-w-[1000px] mx-auto">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Categorías</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{formatNumber(categories.length)} categorías de productos</p>
          </div>
          <Button size="sm" className="gap-2 bg-nexus-600 hover:bg-nexus-500" onClick={() => { setSelected(null); setShowModal(true); }}>
            <Plus className="h-4 w-4" /> Nueva categoría
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="nexus-card p-5 h-32 animate-pulse bg-muted/50" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Tag className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No hay categorías</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <>
              {categories.map((cat: any, i: number) => (
                <div
                  key={cat.id}
                  className="nexus-card p-5 group hover:border-nexus-500/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `${cat.color ?? '#6366f1'}20` }}
                    >
                      <Tag className="h-5 w-5" style={{ color: cat.color ?? '#6366f1' }} />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setSelected(cat); setShowModal(true); }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteCategory.mutate(cat.id)}
                        className="text-muted-foreground hover:text-rose-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="font-semibold text-sm">{cat.name}</p>
                  {cat.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{cat.description}</p>
                  )}
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Package className="h-3 w-3" />
                    <span>{formatNumber(cat._count?.products ?? 0)} productos</span>
                  </div>
                </div>
              ))}
            </>
          </div>
        )}
      </div>

      <>
        {showModal && (
          <CategoryModal
            category={selected}
            onClose={() => setShowModal(false)}
            onSaved={() => {
              queryClient.invalidateQueries({ queryKey: ['categories'] });
              setShowModal(false);
              setSelected(null);
            }}
          />
        )}
      </>
    </div>
  );
}

function CategoryModal({ category, onClose, onSaved }: { category: any; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!category;
  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      name: category?.name ?? '',
      description: category?.description ?? '',
      color: category?.color ?? '#6366f1',
    },
  });
  const color = watch('color');

  const save = useMutation({
    mutationFn: (data: any) =>
      isEdit ? api.patch(`/categories/${category.id}`, data) : api.post('/categories', data),
    onSuccess: () => {
      toast.success(isEdit ? 'Categoría actualizada' : 'Categoría creada');
      onSaved();
    },
    onError: () => toast.error('Error al guardar'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-sm nexus-card">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="font-semibold">{isEdit ? 'Editar categoría' : 'Nueva categoría'}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => save.mutate(d))} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Nombre *</Label>
            <Input placeholder="Ej: Electrónica" {...register('name', { required: true })} />
          </div>
          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Input placeholder="Descripción opcional" {...register('description')} />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setValue('color', c)}
                  className={cn(
                    'w-7 h-7 rounded-full transition-transform',
                    color === c && 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-background',
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="bg-nexus-600 hover:bg-nexus-500" disabled={save.isPending}>
              {isEdit ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
