import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

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
  /** IDs de preguntas abiertas (accordion multi-open) */
  readonly openIds = signal<Set<string>>(new Set());

  readonly categories: FaqCategory[] = [
    {
      id:    'tasks',
      label: 'Tareas',
      icon:  'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
      items: [
        {
          id: 't1',
          question: '¿Cómo asigno una tarea a un colaborador?',
          answer:   'Ve a Tareas → "Nueva Tarea". Completa el título, categoría, turno, fecha límite y selecciona al colaborador asignado. Solo GERENTE y ADMIN pueden crear tareas. Una vez guardada, el colaborador recibirá una notificación en tiempo real. Si la tarea es de rutina, puedes partir de una plantilla creada en Banco de Datos → Plantillas de tareas en lugar de escribirla desde cero.',
        },
        {
          id: 't7',
          question: '¿Qué es el checklist de procesos de una tarea?',
          answer:   'Una tarea puede incluir una lista de pasos ordenados (procesos). El colaborador los va marcando conforme avanza y puede dejar una nota en cada paso; el sistema guarda la hora en que se completó cada uno. Los pasos llevan etiquetas, de modo que cada perfil ve el checklist que le corresponde. Es la forma recomendada de estandarizar tareas largas o que siempre se ejecutan igual.',
        },
        {
          id: 't8',
          question: '¿Cómo programo una tarea que se repite?',
          answer:   'Al crear la tarea activa la opción de recurrencia y elige los días de la semana (LUN a DOM) más la hora de inicio y de fin. La tarea se vuelve a generar en cada día seleccionado dentro de ese horario, sin que nadie tenga que capturarla de nuevo.',
        },
        {
          id: 't2',
          question: '¿Qué significa cada estado de tarea?',
          answer:   'PENDIENTE: asignada pero no iniciada. EN PROGRESO: el colaborador la inició. COMPLETADA: finalizada exitosamente. FALLIDA: no pudo completarse; puede reabrirse para re-trabajo. Solo el colaborador asignado puede cambiar el estado de su propia tarea.',
        },
        {
          id: 't3',
          question: '¿Cómo adjunto evidencia fotográfica o de video?',
          answer:   'Abre el detalle de la tarea (debe estar EN PROGRESO). Desplázate a la sección "Evidencias" y arrastra archivos o haz clic en el área de carga. Se aceptan imágenes (JPG, PNG, WebP hasta 10 MB) y videos (MP4, MOV, WebM hasta 50 MB); MOV es el formato que graban los iPhone, así que puedes subirlos tal cual. También puedes tomar la foto en el momento con la cámara del teléfono desde la propia tarea, sin salir de METRIX. Las evidencias quedan almacenadas en la nube. Si subiste un archivo por error, puedes eliminarlo desde el mismo detalle (ver "¿Puedo eliminar una evidencia subida por error?").',
        },
        {
          id: 't6',
          question: '¿Puedo eliminar una evidencia subida por error?',
          answer:   'Sí. En el detalle de la tarea, cada evidencia muestra un botón "Eliminar evidencia" (ícono de papelera). El colaborador asignado puede borrar evidencias mientras la tarea está EN PROGRESO. GERENTE y ADMIN pueden eliminar evidencias en cualquier estado de la tarea. La acción pide confirmación y no se puede deshacer.',
        },
        {
          id: 't4',
          question: '¿Qué pasa si una tarea falla?',
          answer:   'El colaborador puede marcarla como FALLIDA con un motivo. Un GERENTE puede reabrirla (FALLIDA → PENDIENTE) para re-trabajo. Cada ciclo de re-trabajo se contabiliza en el KPI #3 (Re-trabajo) y afecta el Over-all.',
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
          question: '¿Qué es el Over-all?',
          answer:   'El Índice Global de Ejecución Operativa mide el desempeño general de una sucursal en una escala de 0 a 100. Un Over-all ≥ 80 es excelente; entre 60-79 es aceptable; menor a 60 requiere atención inmediata. El Over-all es el mismo indicador que antes aparecía como "IGEO": solo cambió el nombre en pantalla.',
        },
        {
          id: 'k5',
          question: '¿Cómo se calcula exactamente el Over-all?',
          answer:   'METRIX usa dos cálculos y la tarjeta del Dashboard te dice cuál estás viendo. Cuando el servicio analítico está disponible, el subtítulo dice "Analítico (4 pilares)" y el índice combina Cumplimiento (40%), Tiempo (25%), Calidad (20%) y Consistencia (15%). Si ese servicio no responde, el subtítulo dice "Índice Global Ejecución" y METRIX usa la fórmula estándar: On-Time × 0.5 + (100 − Re-trabajo) × 0.3 + Calidad × 0.2. Los dos miden lo mismo, por eso el número puede variar un poco entre uno y otro. Cuando una sucursal no tiene tareas cerradas en el período, verás "S/D" (sin datos) en lugar de un 0.',
        },
        {
          id: 'k2',
          question: '¿Qué mide el On-Time Rate?',
          answer:   'Porcentaje de tareas completadas dentro del plazo establecido (dueAt). Se calcula como: tareas_a_tiempo / total_completadas × 100. Un On-Time Rate alto indica buena planificación y disciplina operativa.',
        },
        {
          id: 'k3',
          question: '¿Qué reportes puedo descargar y cómo?',
          answer:   'Ve a "Ver Reportes" en el menú lateral. Hay tres reportes: Cierre diario (de una sucursal en una fecha), Ranking gerencial (todos los gerentes de la cadena, solo ADMIN) y Ranking de colaboradores (de una sucursal). Elige el reporte, la sucursal y la fecha o el período, y usa "Descargar PDF". Los tres se entregan en PDF; la descarga en Excel del cierre diario se retiró. Disponible para ADMIN y GERENTE.',
        },
        {
          id: 'k4',
          question: '¿Cómo interpreto el cumplimiento por turno?',
          answer:   'En el Dashboard (vista GERENTE) el panel "Cumplimiento por Turno" muestra el On-Time Rate de cada turno (Matutino, Vespertino, Nocturno) junto con cuántas tareas se cerraron a tiempo de cuántas en total. La barra se pinta verde cuando el turno va en 80% o más, en el color de acento de tu tema entre 60-79% y roja por debajo de 60%. Sirve para detectar si un turno concreto está arrastrando el Over-all de la sucursal.',
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
          answer:   'Ve a Banco de Datos → Usuarios → "Nuevo". Completa nombre, número de usuario, turno, puesto, rol y contraseña inicial. El ADMIN puede asignar cualquier rol; el GERENTE solo puede crear EJECUTADORES para su sucursal. (La sección de personal antes se llamaba "RH"; hoy vive dentro de Banco de Datos.)',
        },
        {
          id: 'r3',
          question: '¿Cómo desactivo a un colaborador que ya no trabaja?',
          answer:   'En Banco de Datos → Usuarios → perfil del colaborador → botón "Desactivar". El usuario queda con estado inactivo (soft-delete) y no podrá iniciar sesión. Sus registros históricos se conservan para reportes y auditoría, así que sus tareas pasadas siguen contando en los KPIs del período en que ocurrieron.',
        },
        {
          id: 'r4',
          question: '¿Por qué el ADMIN no ve datos de "su" sucursal?',
          answer:   'Porque el ADMIN no tiene una sucursal asignada: su alcance es toda la cadena. Por eso sus pantallas usan indicadores globales (todas las sucursales) y en Gamificación ve el Ranking Gerencial en lugar del ranking de un equipo. El GERENTE sí trabaja siempre acotado a su sucursal.',
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
      id:    'training',
      label: 'Capacitación y Exámenes',
      icon:  'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
      items: [
        {
          id: 'c1',
          question: '¿Cómo programo una capacitación?',
          answer:   'Ve a Capacitación → "Nueva". Defines el tema, los participantes y la fecha. Solo GERENTE y ADMIN pueden crearlas y editarlas; el colaborador las ve en su propia lista. El material de apoyo se carga previamente en Banco de Datos → Materiales, para reutilizarlo en varias capacitaciones.',
        },
        {
          id: 'c2',
          question: '¿Qué estados tiene una capacitación?',
          answer:   'PROGRAMADA: agendada pero aún no comienza. EN CURSO: ya inició. COMPLETADA: el colaborador la terminó. NO COMPLETADA: se cerró sin completarse. El avance se refleja en la tasa de completación que ves en Métricas → Capacitaciones.',
        },
        {
          id: 'c3',
          question: '¿Quién crea, asigna y presenta un examen?',
          answer:   'Los exámenes se arman en Exámenes → "Nuevo" y solo el ADMIN puede crearlos o editarlos. Asignarlos, consultarlos y ver resultados corresponde a ADMIN y GERENTE (al GERENTE el menú le aparece como "Mis Exámenes"). El colaborador asignado es quien lo presenta desde ese mismo módulo.',
        },
        {
          id: 'c4',
          question: '¿Cómo se aprueba un examen y cuántos intentos hay?',
          answer:   'Cada examen define su puntaje mínimo de aprobación, que por defecto es 70%. Puede tener también un límite de tiempo en minutos y un número máximo de intentos; si el máximo se deja en 0, los intentos son ilimitados. El historial de quién presentó qué y con qué resultado queda en Banco de Datos → Bitácora de exámenes, y el resumen agregado en Métricas → Exámenes.',
        },
      ],
    },
    {
      id:    'banco',
      label: 'Banco de Datos',
      icon:  'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
      items: [
        {
          id: 'b1',
          question: '¿Qué guarda el Banco de Datos?',
          answer:   'Es el catálogo del que se alimenta el resto del sistema, disponible para ADMIN y GERENTE. Ahí viven los Usuarios, los Puestos, las Categorías de tareas, las Plantillas de tareas, las Plantillas y Materiales de capacitación, y la Bitácora de exámenes. La idea es capturarlo una vez ahí y reutilizarlo en el día a día.',
        },
        {
          id: 'b2',
          question: '¿Para qué sirven las plantillas de tareas?',
          answer:   'Para no volver a escribir desde cero las tareas que se repiten. La plantilla guarda el título, la categoría y su checklist de procesos; al crear una tarea partes de ella y solo ajustas turno, responsable y fecha límite. Así todas las sucursales ejecutan el mismo proceso con los mismos pasos.',
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
          question: '¿Puedo cambiar el color de la aplicación?',
          answer:   'No. El color de METRIX se asigna solo según tu rol, para que cada perfil se distinga de un vistazo y la identidad visual sea consistente en toda la cadena. Antes existía un selector de tema; se retiró.',
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
          answer:   'El módulo de Gamificación calcula insignias y rankings para motivar al equipo, con vista semanal y mensual. El GERENTE ve el ranking de los colaboradores de su sucursal; el ADMIN ve el Ranking Gerencial, donde cada gerente se ordena por el Over-all de su equipo. El podio marca a los tres primeros con medalla.',
        },
        {
          id: 'g5',
          question: '¿Cómo se ganan las insignias?',
          answer:   'Se otorgan solas, sin que nadie las asigne a mano: Puntual Elite (On-Time de 95% o más, con al menos 10 tareas cerradas), Cero Retrabajos (0% de re-trabajo con al menos 5 tareas), Velocidad Rayo (tiempo promedio de ejecución igual o menor a la mitad del promedio de tu sucursal), Racha de 7 (7 o más tareas completadas en los últimos 7 días) y Colaborador del Mes (primer lugar del ranking mensual).',
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

}
