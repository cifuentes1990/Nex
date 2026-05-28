'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Banknote, DollarSign, TrendingUp, ShoppingCart,
  Lock, Unlock, AlertTriangle, X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatters';
import { usePermissions } from '@/hooks/use-permissions';

export default function CashRegisterPage() {
  const perms = usePermissions();
  const qc = useQueryClient();

  // Cargar cajas disponibles
  const { data: registers, isLoading } = useQuery({
    queryKey: ['cash-registers'],
    queryFn: () => api.get('/cash-registers').then((r) => r.data.data),
  });

  // Mi caja activa
  const { data: myRegister, isLoading: loadingMine } = useQuery({
    queryKey: ['cash-registers', 'my'],
    queryFn: () => api.get('/cash-registers/my').then((r) => r.data.data).catch(() => null),
  });

  const [selected, setSelected] = useState<any>(null);
  const [showOpenModal, setOpenModal] = useState(false);
  const [showCloseModal, setCloseModal] = useState(false);

  const allRegisters: any[] = Array.isArray(registers) ? registers : [];

  // Summary del turno actual
  const { data: summary } = useQuery({
    queryKey: ['cash-register-summary', myRegister?.id],
    queryFn: () => api.get(`/cash-registers/${myRegister!.id}/summary`).then((r) => r.data.data),
    enabled: !!myRegister?.id,
  });

  const openRegister = useMutation({
    mutationFn: ({ id, openingBalance }: { id: string; openingBalance: number }) =>
      api.patch(`/cash-registers/${id}/open`, { openingBalance }),
    onSuccess: () => {
      toast.success('Caja abierta');
      qc.invalidateQueries({ queryKey: ['cash-registers'] });
      setOpenModal(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error'),
  });

  const closeRegister = useMutation({
    mutationFn: ({ id, closingBalance, notes }: { id: string; closingBalance: number; notes?: string }) =>
      api.patch(`/cash-registers/${id}/close`, { closingBalance, notes }),
    onSuccess: () => {
      toast.success('Caja cerrada');
      qc.invalidateQueries({ queryKey: ['cash-registers'] });
      setCloseModal(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error'),
  });

  return (
    <div className="flex-1 overflow-auto custom-scroll">
      <div className="p-6 space-y-6 max-w-[1200px] mx-auto">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Caja</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Gestión del turno y balance de caja</p>
        </div>

        {/* Mi caja activa */}
        {!loadingMine && myRegister ? (
          <div className="nexus-card p-6 space-y-4 border-nexus-500/30">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                  <Unlock className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="font-semibold">{myRegister.name}</p>
                  <p className="text-xs text-emerald-500">Caja abierta · {myRegister.branch?.name ?? 'Sin sede'}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-2 border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                onClick={() => { setSelected(myRegister); setCloseModal(true); }}
              >
                <Lock className="h-4 w-4" /> Cerrar caja
              </Button>
            </div>

            {/* Stats del turno */}
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-border">
                <StatBox
                  label="Balance inicial"
                  value={formatCurrency(summary.register?.openingBalance ?? 0)}
                  icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
                />
                <StatBox
                  label="Ventas del turno"
                  value={formatCurrency(summary.totalSales ?? 0)}
                  icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
                  highlight
                />
                <StatBox
                  label="Órdenes"
                  value={String(summary.orderCount ?? 0)}
                  icon={<ShoppingCart className="h-4 w-4 text-nexus-500" />}
                />
                <StatBox
                  label="Balance esperado"
                  value={formatCurrency(summary.expectedBalance ?? 0)}
                  icon={<DollarSign className="h-4 w-4 text-amber-500" />}
                />
              </div>
            )}

            {/* Últimas ventas */}
            {summary?.orders?.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Últimas ventas del turno
                </p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scroll">
                  {summary.orders.slice(0, 10).map((o: any) => (
                    <div key={o.id} className="flex items-center justify-between text-sm py-1 px-2 rounded-lg hover:bg-muted/50">
                      <div>
                        <span className="font-mono text-xs text-muted-foreground">{o.number}</span>
                        {o.customer?.firstName && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            · {o.customer.firstName} {o.customer.lastName ?? ''}
                          </span>
                        )}
                      </div>
                      <span className="font-medium text-emerald-500">{formatCurrency(o.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : !loadingMine && !myRegister && (
          <div className="nexus-card p-6 text-center space-y-3">
            <Lock className="h-10 w-10 mx-auto text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">No tienes ninguna caja abierta</p>
            <p className="text-xs text-muted-foreground">Selecciona una caja abajo para iniciar tu turno</p>
          </div>
        )}

        {/* Lista de cajas */}
        {perms.canManageCashRegisters && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Todas las cajas
            </h2>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="nexus-card p-5 h-20 animate-pulse bg-muted/50" />
                ))}
              </div>
            ) : allRegisters.length === 0 ? (
              <div className="nexus-card p-8 text-center text-muted-foreground">
                <p className="text-sm">No hay cajas configuradas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {allRegisters.map((reg: any) => (
                  <div key={reg.id} className="nexus-card p-5">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                        reg.isOpen ? 'bg-emerald-500/15' : 'bg-muted',
                      )}>
                        {reg.isOpen
                          ? <Unlock className="h-4 w-4 text-emerald-500" />
                          : <Lock className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{reg.name}</p>
                          <span className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                            reg.isOpen ? 'bg-emerald-500/15 text-emerald-400' : 'bg-muted text-muted-foreground',
                          )}>
                            {reg.isOpen ? 'Abierta' : 'Cerrada'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {reg.branch?.name ?? 'Sin sede'}
                          {reg.user && ` · ${reg.user.name}`}
                          {reg.openedAt && ` · Abierta ${new Date(reg.openedAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!reg.isOpen && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
                            onClick={() => { setSelected(reg); setOpenModal(true); }}
                          >
                            <Unlock className="h-3.5 w-3.5" /> Abrir
                          </Button>
                        )}
                        {reg.isOpen && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                            onClick={() => { setSelected(reg); setCloseModal(true); }}
                          >
                            <Lock className="h-3.5 w-3.5" /> Cerrar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Open Modal */}
      {showOpenModal && selected && (
        <OpenRegisterModal
          register={selected}
          onClose={() => setOpenModal(false)}
          onConfirm={(balance) => openRegister.mutate({ id: selected.id, openingBalance: balance })}
          isPending={openRegister.isPending}
        />
      )}

      {/* Close Modal */}
      {showCloseModal && selected && (
        <CloseRegisterModal
          register={selected}
          summary={summary}
          onClose={() => setCloseModal(false)}
          onConfirm={(balance, notes) => closeRegister.mutate({ id: selected.id, closingBalance: balance, notes })}
          isPending={closeRegister.isPending}
        />
      )}
    </div>
  );
}

function StatBox({ label, value, icon, highlight }: {
  label: string; value: string; icon: React.ReactNode; highlight?: boolean;
}) {
  return (
    <div className={cn('p-3 rounded-xl', highlight ? 'bg-emerald-500/10' : 'bg-muted/40')}>
      <div className="flex items-center gap-2 mb-1">{icon}<p className="text-xs text-muted-foreground">{label}</p></div>
      <p className={cn('font-bold text-lg', highlight && 'text-emerald-500')}>{value}</p>
    </div>
  );
}

function OpenRegisterModal({
  register, onClose, onConfirm, isPending,
}: {
  register: any;
  onClose: () => void;
  onConfirm: (balance: number) => void;
  isPending: boolean;
}) {
  const [balance, setBalance] = useState('0');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm nexus-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Abrir caja: {register.name}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <div className="space-y-1.5">
          <Label>Balance inicial (efectivo en caja)</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            className="text-lg font-bold"
          />
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button
            className="flex-1 bg-emerald-600 hover:bg-emerald-500"
            disabled={isPending}
            onClick={() => onConfirm(Number(balance))}
          >
            <Unlock className="h-4 w-4 mr-2" /> Abrir turno
          </Button>
        </div>
      </div>
    </div>
  );
}

function CloseRegisterModal({
  register, summary, onClose, onConfirm, isPending,
}: {
  register: any;
  summary?: any;
  onClose: () => void;
  onConfirm: (balance: number, notes?: string) => void;
  isPending: boolean;
}) {
  const [balance, setBalance] = useState('0');
  const [notes, setNotes] = useState('');
  const expected = summary?.expectedBalance ?? 0;
  const diff = Number(balance) - expected;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm nexus-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Cerrar caja: {register.name}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>

        {summary && (
          <div className="bg-muted/40 rounded-xl p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Balance inicial</span>
              <span>{formatCurrency(summary.register?.openingBalance ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ventas del turno</span>
              <span className="text-emerald-500">{formatCurrency(summary.totalSales ?? 0)}</span>
            </div>
            <div className="flex justify-between font-semibold border-t border-border pt-1.5 mt-1.5">
              <span>Balance esperado</span>
              <span>{formatCurrency(expected)}</span>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Efectivo contado en caja</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            className="text-lg font-bold"
          />
        </div>

        {Number(balance) > 0 && (
          <div className={cn(
            'flex items-center gap-2 text-sm p-2.5 rounded-lg',
            Math.abs(diff) < 1 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400',
          )}>
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Diferencia: {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
              {Math.abs(diff) < 1 ? ' ✓ Sin diferencia' : ''}
            </span>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Notas (opcional)</Label>
          <Input placeholder="Observaciones del cierre..." value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button
            className="flex-1 bg-rose-600 hover:bg-rose-500"
            disabled={isPending}
            onClick={() => onConfirm(Number(balance), notes || undefined)}
          >
            <Lock className="h-4 w-4 mr-2" /> Cerrar turno
          </Button>
        </div>
      </div>
    </div>
  );
}
