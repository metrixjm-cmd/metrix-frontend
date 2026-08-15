/**
 * Modelos del módulo Licencias (plantilla / solo frontend).
 *
 * No hay backend todavía: `LicensingService` trabaja sobre estos tipos en memoria
 * y persiste en localStorage. Cuando exista el endpoint, basta con cambiar el
 * servicio — estos contratos ya están pensados para viajar por HTTP.
 */

export type Moneda = 'MXN' | 'USD';

/** Ciclo con el que se muestran los precios en la lista. */
export type CicloFacturacion = 'MENSUAL' | 'ANUAL';

/** Paleta de acento de cada paquete. Las clases se escriben literales para que Tailwind las detecte. */
export type LicenseAccent = 'slate' | 'cyan' | 'violet' | 'amber';

export interface LicenseFeature {
  label:    string;
  incluido: boolean;
}

export interface LicensePackage {
  id:          string;
  nombre:      string;
  /** Etiqueta corta bajo el nombre: "1 sucursal", "Cadena mediana"… */
  etiqueta:    string;
  descripcion: string;

  moneda:        Moneda;
  precioMensual: number;
  precioAnual:   number;
  /** Cuando es true se ignoran los precios y se muestra "A cotizar". */
  precioPersonalizado: boolean;

  /** null = ilimitado */
  maxUsuarios:   number | null;
  /** null = ilimitado */
  maxSucursales: number | null;

  soporte:   string;
  funciones: LicenseFeature[];

  accent:    LicenseAccent;
  destacado: boolean;
  activo:    boolean;
}

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

/**
 * Catálogo base de funciones. Todos los paquetes arrancan con estas mismas
 * filas (cambia el `incluido`), lo que permite la tabla comparativa.
 */
export const CATALOGO_FUNCIONES: readonly string[] = [
  'Tareas y checklists operativos',
  'Panel de métricas (KPIs)',
  'Incidencias con evidencia fotográfica',
  'Capacitaciones y exámenes',
  'Gamificación y ranking',
  'Reportes PDF automáticos',
  'Notificaciones en tiempo real',
  'API de integración',
  'Gerente de cuenta dedicado',
] as const;

/** Construye la lista de funciones marcando como incluidas las primeras `n`. */
function funcionesHasta(n: number): LicenseFeature[] {
  return CATALOGO_FUNCIONES.map((label, i) => ({ label, incluido: i < n }));
}

/** Los 4 paquetes de arranque. Editables desde la UI. */
export const LICENSE_PACKAGES_SEED: LicensePackage[] = [
  {
    id:          'esencial',
    nombre:      'Esencial',
    etiqueta:    'Una sucursal',
    descripcion: 'Lo mínimo para operar un punto de venta: tareas del turno, incidencias y el tablero de métricas básico.',
    moneda:        'MXN',
    precioMensual: 1499,
    precioAnual:   14990,
    precioPersonalizado: false,
    maxUsuarios:   15,
    maxSucursales: 1,
    soporte:       'Correo, respuesta en 48 h',
    funciones:     funcionesHasta(3),
    accent:        'slate',
    destacado:     false,
    activo:        true,
  },
  {
    id:          'profesional',
    nombre:      'Profesional',
    etiqueta:    'Hasta 5 sucursales',
    descripcion: 'El paquete para cadenas en crecimiento: suma capacitaciones, exámenes y el módulo de gamificación.',
    moneda:        'MXN',
    precioMensual: 3499,
    precioAnual:   34990,
    precioPersonalizado: false,
    maxUsuarios:   60,
    maxSucursales: 5,
    soporte:       'Correo y chat, respuesta en 24 h',
    funciones:     funcionesHasta(5),
    accent:        'cyan',
    destacado:     true,
    activo:        true,
  },
  {
    id:          'corporativo',
    nombre:      'Corporativo',
    etiqueta:    'Hasta 20 sucursales',
    descripcion: 'Operación multi-sucursal con reportes automáticos, alertas en tiempo real y consolidado por región.',
    moneda:        'MXN',
    precioMensual: 6999,
    precioAnual:   69990,
    precioPersonalizado: false,
    maxUsuarios:   250,
    maxSucursales: 20,
    soporte:       'Chat prioritario, respuesta en 8 h',
    funciones:     funcionesHasta(7),
    accent:        'violet',
    destacado:     false,
    activo:        true,
  },
  {
    id:          'enterprise',
    nombre:      'Enterprise',
    etiqueta:    'Sucursales ilimitadas',
    descripcion: 'Para cadenas nacionales: integración con sistemas propios, SLA por contrato y acompañamiento dedicado.',
    moneda:        'MXN',
    precioMensual: 0,
    precioAnual:   0,
    precioPersonalizado: true,
    maxUsuarios:   null,
    maxSucursales: null,
    soporte:       'SLA dedicado 24/7',
    funciones:     funcionesHasta(9),
    accent:        'amber',
    destacado:     false,
    activo:        true,
  },
];
