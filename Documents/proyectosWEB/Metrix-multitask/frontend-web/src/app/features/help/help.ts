import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeService, ThemeId } from '../../core/theme.service';

export interface FaqItem {
  id:       string;
  question: string;
  answer:   string;
}

export interface FaqCategory {
  id:    string;
  label: string;
  icon:  string;
  items: FaqItem[];
}

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './help.html',
})
export class Help {
  readonly themeSvc = inject(ThemeService);

  /** IDs de preguntas abiertas (accordion multi-open) */
  readonly openIds = signal<Set<string>>(new Set());

  readonly categories: FaqCategory[] = [
    {
      id:    'tasks',
      label: 'Tareas y Delegación',
      icon:  'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
      items: [
        {
          id: 't1',
          question: '¿Cómo asigno una tarea a un colaborador?',
          answer:   'Ve a Delegación → "Nueva Tarea". Completa el título, categoría, turno y selecciona al colaborador asignado. Solo GERENTE y ADMIN pueden crear tareas. Una vez guardada, el colaborador recibirá una notificación en tiempo real.',
        },
        {
          id: 't2',
          question: '¿Qué significa cada estado de tarea?',
          answer:   'PENDIENTE: asignada pero no iniciada. EN PROGRESO: el colaborador la inició. COMPLETADA: finalizada exitosamente. FALLIDA: no pudo completarse; puede reabrirse para re-trabajo. Solo el colaborador asignado puede cambiar el estado de su propia tarea.',
        },
        {
          id: 't3',
          question: '¿Cómo adjunto evidencia fotográfica o de video?',
          answer:   'Abre el detalle de la tarea (debe estar EN PROGRESO). Desplázate a la sección "Evidencias" y arrastra archivos o haz clic en el área de carga. Se aceptan imágenes (JPG, PNG, WebP hasta 10 MB) y videos (MP4, WebM hasta 50 MB). Las evidencias quedan almacenadas en la nube.',
        },
        {
          id: 't4',
          question: '¿Qué pasa si una tarea falla?',
          answer:   'El colaborador puede marcarla como FALLIDA con un motivo. Un GERENTE puede reabrirla (FALLIDA → PENDIENTE) para re-trabajo. Cada ciclo de re-trabajo se contabiliza en el KPI #3 (Re-trabajo) y afecta el IGEO.',
        },
        {
          id: 't5',
          question: '¿Cómo evalúo la calidad de una tarea completada?',
          answer:   'Abre el detalle de la tarea completada. En la sección "Evaluación de Calidad" verás 5 estrellas interactivas. Selecciona la calificación y opcionalmente agrega comentarios. Solo GERENTE y ADMIN pueden calificar.',
        },
      ],
    },
    {
      id:    'kpis',
      label: 'KPIs y Reportes',
      icon:  'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      items: [
        {
          id: 'k1',
          question: '¿Qué es el IGEO?',
          answer:   'El Índice Global de Ejecución Operativa mide el desempeño general de una sucursal en una escala de 0 a 100. Se calcula con 4 pilares: Cumplimiento (40%), Tiempo (25%), Calidad (20%) y Consistencia (15%). Un IGEO ≥ 80 es excelente; entre 60-79 es aceptable; menor a 60 requiere atención inmediata.',
        },
        {
          id: 'k2',
          question: '¿Qué mide el On-Time Rate?',
          answer:   'Porcentaje de tareas completadas dentro del plazo establecido (dueAt). Se calcula como: tareas_a_tiempo / total_completadas × 100. Un On-Time Rate alto indica buena planificación y disciplina operativa.',
        },
        {
          id: 'k3',
          question: '¿Cómo descargo un reporte en PDF o Excel?',
          answer:   'Ve a Reportes en el menú lateral. Verás un panel con el reporte diario. Usa el botón "Descargar PDF" o "Descargar Excel" según necesites. El archivo se descarga automáticamente. Solo disponible para ADMIN y GERENTE.',
        },
        {
          id: 'k4',
          question: '¿Cómo interpreto el desglose por turno?',
          answer:   'En el Dashboard (vista GERENTE) el panel "Desglose por Turno" muestra el On-Time Rate de cada turno (Mañana, Tarde, Noche). Las barras de color indican el nivel: verde ≥ 80%, azul 60-79%, rojo < 60%.',
        },
      ],
    },
    {
      id:    'roles',
      label: 'Roles y Usuarios',
      icon:  'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
      items: [
        {
          id: 'r1',
          question: '¿Cuáles son los 3 roles del sistema?',
          answer:   'ADMIN: acceso total al sistema, gestiona sucursales y usuarios de todas las unidades. GERENTE: gestiona tareas, colaboradores e incidencias de su propia sucursal. EJECUTADOR: recibe y ejecuta tareas asignadas, puede registrar evidencias e incidencias.',
        },
        {
          id: 'r2',
          question: '¿Cómo creo un nuevo colaborador?',
          answer:   'Ve a RH → "Nuevo Colaborador". Completa nombre, número de usuario, turno, rol y contraseña inicial. El ADMIN puede asignar cualquier rol; el GERENTE solo puede crear EJECUTADORES para su sucursal.',
        },
        {
          id: 'r3',
          question: '¿Cómo desactivo a un colaborador que ya no trabaja?',
          answer:   'En RH → perfil del colaborador → botón "Desactivar". El usuario queda con estado inactivo (soft-delete) y no podrá iniciar sesión. Sus registros históricos se conservan para reportes y auditoría.',
        },
      ],
    },
    {
      id:    'incidents',
      label: 'Incidencias',
      icon:  'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
      items: [
        {
          id: 'i1',
          question: '¿Cuándo debo crear una incidencia?',
          answer:   'Cuando ocurra un evento inesperado que afecte la operación: equipo dañado, falta de insumos, problema de personal, incidente de seguridad u otro. Cualquier colaborador puede abrir una incidencia desde el menú lateral → Incidencias → Nueva.',
        },
        {
          id: 'i2',
          question: '¿Qué significan los niveles de severidad?',
          answer:   'BAJA: sin impacto inmediato en la operación. MEDIA: afecta parcialmente el turno. ALTA: compromete una área o proceso. CRÍTICA: paraliza la operación o representa un riesgo; genera notificación inmediata a gerentes y administradores.',
        },
        {
          id: 'i3',
          question: '¿Cómo cierro una incidencia?',
          answer:   'Solo GERENTE o ADMIN pueden cerrarla. Abre el detalle de la incidencia → "Cerrar Incidencia". Se requiere escribir las notas de resolución (mínimo 10 caracteres) describiendo cómo se resolvió. También puede reabrirse si el problema persiste.',
        },
      ],
    },
    {
      id:    'general',
      label: 'General',
      icon:  'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      items: [
        {
          id: 'g1',
          question: '¿Cómo cambio el tema de color de la aplicación?',
          answer:   'En la pantalla de inicio de sesión (panel izquierdo) o en el selector de abajo de esta página encontrarás 3 temas: Corporativo (azul), Restaurante (naranja) y Impacto (rojo). El tema se guarda automáticamente en tu navegador.',
        },
        {
          id: 'g2',
          question: '¿Las notificaciones funcionan en tiempo real?',
          answer:   'Sí. METRIX usa SSE (Server-Sent Events) para notificaciones en tiempo real. El punto verde en el ícono de campana indica conexión activa. Recibirás alertas cuando te asignen tareas, cuando venzan plazos y cuando se creen incidencias críticas.',
        },
        {
          id: 'g3',
          question: '¿Puedo usar METRIX en mi teléfono o tableta?',
          answer:   'Sí. METRIX es una PWA (Progressive Web App) con diseño responsive. En dispositivos móviles el menú lateral se convierte en un drawer que se abre con el ícono ☰. También puedes instalarla como app desde el navegador usando "Agregar a pantalla de inicio".',
        },
        {
          id: 'g4',
          question: '¿Qué es la Gamificación?',
          answer:   'El módulo de Gamificación calcula insignias y rankings para motivar al equipo. Las insignias (Puntual Elite, Cero Retrabajos, Velocidad Rayo, etc.) se asignan automáticamente según el desempeño. Puedes ver el leaderboard semanal y mensual en Gamificación → Leaderboard.',
        },
      ],
    },
  ];

  toggle(id: string): void {
    this.openIds.update(set => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  isOpen(id: string): boolean {
    return this.openIds().has(id);
  }

  setTheme(id: ThemeId): void {
    this.themeSvc.set(id);
  }
}
