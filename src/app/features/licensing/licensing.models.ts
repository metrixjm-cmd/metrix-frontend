/**
 * Modelos del módulo Licencias — sincronizados con el backend METRIX.
 */

export type Moneda = 'MXN' | 'USD';

export type CicloFacturacion = 'MENSUAL' | 'ANUAL';

export type LicensePricingModel = 'PER_BRANCH' | 'FLAT_MONTHLY' | 'PER_USER';

export type LicenseAccent = 'slate' | 'cyan' | 'violet' | 'amber';

export interface LicenseFeature {
  label:    string;
  incluido: boolean;
}

export interface LicensePackage {
  id:          string;
  nombre:      string;
  etiqueta:    string;
  descripcion: string;

  moneda:        Moneda;
  pricingModel:  LicensePricingModel;
  precioMensual: number;
  precioAnual:   number;
  precioImplementacion: number;
  precioPersonalizado: boolean;

  minUsuarios:   number | null;
  maxUsuarios:   number | null;
  minSucursales: number | null;
  maxSucursales: number | null;

  soporte:   string;
  funciones: LicenseFeature[];

  accent:    LicenseAccent;
  destacado: boolean;
  activo:    boolean;
}

export const LICENSE_PRICING_MODELS: readonly LicensePricingModel[] = [
  'PER_BRANCH',
  'FLAT_MONTHLY',
  'PER_USER',
] as const;

export const LICENSE_PRICING_LABELS: Record<LicensePricingModel, string> = {
  PER_BRANCH:   'Por sucursal / mes',
  FLAT_MONTHLY: 'Precio fijo / mes',
  PER_USER:     'Por usuario / mes',
};

/** Clases Tailwind por acento. Literales a propósito: Tailwind escanea los .ts. */
export const LICENSE_ACCENTS: Record<LicenseAccent, {
  header: string;
  border: string;
  chip:   string;
  icon:   string;
  price:  string;
  check:  string;
}> = {
  slate: {
    header: 'bg-gradient-to-br from-slate-500/20 to-transparent',
    border: 'border-slate-400/25',
    chip:   'bg-slate-500/15 text-slate-200 border border-slate-400/25',
    icon:   'bg-slate-500/20 text-slate-200',
    price:  'text-slate-100',
    check:  'text-slate-300',
  },
  cyan: {
    header: 'bg-gradient-to-br from-cyan-500/25 to-transparent',
    border: 'border-cyan-400/35',
    chip:   'bg-cyan-500/15 text-cyan-200 border border-cyan-400/30',
    icon:   'bg-cyan-500/20 text-cyan-200',
    price:  'text-cyan-100',
    check:  'text-cyan-300',
  },
  violet: {
    header: 'bg-gradient-to-br from-violet-500/25 to-transparent',
    border: 'border-violet-400/30',
    chip:   'bg-violet-500/15 text-violet-200 border border-violet-400/30',
    icon:   'bg-violet-500/20 text-violet-200',
    price:  'text-violet-100',
    check:  'text-violet-300',
  },
  amber: {
    header: 'bg-gradient-to-br from-amber-500/25 to-transparent',
    border: 'border-amber-400/30',
    chip:   'bg-amber-500/15 text-amber-200 border border-amber-400/30',
    icon:   'bg-amber-500/20 text-amber-200',
    price:  'text-amber-100',
    check:  'text-amber-300',
  },
};

export const MONEDAS: readonly Moneda[] = ['MXN', 'USD'] as const;

export const ACCENTS_DISPONIBLES: readonly LicenseAccent[] = ['slate', 'cyan', 'violet', 'amber'] as const;

export const CATALOGO_FUNCIONES: readonly string[] = [
  'Tareas y checklists operativos',
  'Panel de métricas (KPIs)',
  'Incidencias con evidencia fotográfica',
  'Capacitaciones y exámenes',
  'Gamificación y ranking',
  'Reportes PDF automáticos',
  'Notificaciones en tiempo real - tareas realizadas y pendientes',
  'Notificaciones en tiempo real - todas -',
  'API de integración',
  'Gerente de cuenta dedicado',
] as const;

export function sufijoPrecio(model: LicensePricingModel, ciclo: CicloFacturacion): string {
  if (ciclo === 'ANUAL') return '/año';
  switch (model) {
    case 'PER_BRANCH':   return '/ mes · por sucursal';
    case 'PER_USER':     return '/ usuario / mes';
    default:             return '/ mes';
  }
}
