'use client';

import { Package, Edit, Trash2, Star, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { Button } from '@/components/ui/button';

interface ProductCardProps {
  product: any;
  onEdit: () => void;
  onDelete: () => void;
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'bg-emerald-500',
  INACTIVE: 'bg-muted-foreground',
  DISCONTINUED: 'bg-rose-500',
  OUT_OF_STOCK: 'bg-amber-500',
};

export function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  return (
    <div
      className="nexus-card group relative overflow-hidden cursor-pointer hover:-translate-y-0.5 transition-transform duration-150"
    >
      {/* Status dot */}
      <div className={cn(
        'absolute top-2 right-2 w-2 h-2 rounded-full z-10',
        STATUS_COLOR[product.status] ?? 'bg-muted-foreground',
      )} />

      {/* Featured star */}
      {product.isFeatured && (
        <div className="absolute top-2 left-2 z-10">
          <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
        </div>
      )}

      {/* Image */}
      <div className="aspect-square bg-muted relative overflow-hidden">
        {product.image ? (
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}

        {/* Low stock warning */}
        {product.isLowStock && product.stock > 0 && (
          <div className="absolute bottom-0 left-0 right-0 bg-amber-500/90 text-white text-[10px] font-medium text-center py-0.5 flex items-center justify-center gap-1">
            <AlertTriangle className="h-2.5 w-2.5" /> Stock bajo
          </div>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
            <span className="text-xs font-medium text-rose-500 bg-rose-500/10 px-2 py-1 rounded-full">Sin stock</span>
          </div>
        )}

        {/* Hover actions */}
        <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 shadow-md"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 shadow-md text-rose-500 hover:text-rose-400"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-medium line-clamp-1 mb-0.5">{product.name}</p>
        <p className="text-[11px] text-muted-foreground font-mono mb-2">{product.sku}</p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold tabular-nums">
            {formatCurrency(product.salePrice ?? product.basePrice)}
          </span>
          <span className={cn(
            'text-[11px] font-medium',
            (product.margin ?? 0) >= 40 ? 'text-emerald-500' :
            (product.margin ?? 0) >= 20 ? 'text-amber-500' : 'text-rose-500',
          )}>
            {(product.margin ?? 0).toFixed(0)}%
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">
          Stock: <span className={cn(
            'font-medium',
            product.stock === 0 ? 'text-rose-500' : product.isLowStock ? 'text-amber-500' : 'text-foreground',
          )}>{product.stock ?? 0}</span>
        </p>
      </div>
    </div>
  );
}
