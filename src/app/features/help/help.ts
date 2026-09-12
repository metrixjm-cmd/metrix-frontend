import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { APP_VERSION } from '../../../environments/app-version';
import { AuthService } from '../auth/services/auth.service';
import { PwaInstall } from '../../shared/components/pwa-install/pwa-install';

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
  imports: [RouterLink, PwaInstall],
  templateUrl: './help.html',
})
export class Help {
  private readonly auth = inject(AuthService);

  readonly appVersion = APP_VERSION;
  readonly openIds = signal<Set<string>>(new Set());

  /** ADMIN de una licencia (no Admin 0). Puede abrir sucursales desde el Banco. */
  readonly isTenantAdmin = computed(() =>
    this.auth.hasRole('ADMIN') && !this.auth.isPlatformAdmin(),
  );

  private readonly tenantCategories: FaqCategory[] = [
    {
      id:    'tasks',
      label: 'Tareas',
      icon:  'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
      items: [
        {
          id: 't1',
          question: '¿Cómo asigno una tarea a un colaborador?',
          answer:   'Ve a Tareas → "Asignar Tarea". El alta va en tres pasos: Tarea (título, descripción, categoría, si es crítica), Responsables y Ejecución (fecha límite, checklist y repetición). Solo GERENTE y ADMIN crean. La cadena es fija: el ADMIN asigna a un GERENTE; el GERENTE, a EJECUTADORES de su sucursal. Si marcas a varias personas, se crea una tarea por cada una. El turno no se elige: se copia del perfil del asignado. Al guardar, avisan el asignado y su gerente. Puedes cargar una plantilla desde el formulario o desde Banco de Datos → Plantillas de tareas, y guardar lo armado como plantilla nueva.',
        },
        {
          id: 't7',
          question: '¿Qué es el checklist de procesos de una tarea?',
          answer:   'Una tarea puede incluir pasos ordenados (título y descripción). Se marcan desde la lista, expandiendo la tarjeta, y solo si está En Progreso. Al checar un paso puedes adjuntar archivo, video o tomar foto con la cámara; esa evidencia queda en la tarea. En el detalle los pasos son solo lectura. Todos ven el mismo checklist. Para Completar hay que tener todos los pasos hechos; si en la lista cierras con pasos pendientes, METRIX pide justificación y la marca Fallida.',
        },
        {
          id: 't8',
          question: '¿Cómo programo una tarea que se repite?',
          answer:   'En Ejecución activa "Tarea repetitiva" y elige los días (LUN a DOM) más el horario. Eso guarda el patrón en la misma tarea (el detalle muestra días y horas en lugar de una fecha límite). No se genera una copia nueva cada día: si hace falta otra ejecución, hay que asignarla de nuevo o partir de una plantilla.',
        },
        {
          id: 't2',
          question: '¿Qué significa cada estado de tarea?',
          answer:   'Pendiente: asignada, aún no inicia. En Progreso: el asignado la empezó. Completada: se cerró con éxito (estado terminal). Fallida: no se pudo completar. Solo el asignado cambia Pendiente → En Progreso → Completada o Fallida. Para Completar hacen falta al menos una evidencia, todos los pasos del checklist y que el plazo no haya vencido. Si ya venció, hay que marcarla Fallida con la causa. El GERENTE ve "Mis Tareas" (las que le asignó el ADMIN) y "Tareas Delegadas" (las de su equipo).',
        },
        {
          id: 't3',
          question: '¿Cómo adjunto evidencia fotográfica o de video?',
          answer:   'Solo el asignado, con la tarea En Progreso. En el detalle arrastra o elige archivos: imágenes JPG, PNG o WebP (hasta 10 MB) y videos MP4, MOV o WebM (hasta 50 MB). La cámara del teléfono se abre al marcar un paso del checklist en la lista, no en el detalle. Subir evidencia exige rol EJECUTADOR: un GERENTE que ejecuta una tarea que le asignó el ADMIN no puede cargarla por esa vía. Sin al menos una evidencia no se puede Completar.',
        },
        {
          id: 't6',
          question: '¿Puedo eliminar una evidencia subida por error?',
          answer:   'Sí. En el detalle, cada evidencia tiene un botón de papelera. El asignado puede borrarlas mientras la tarea está En Progreso. GERENTE (su sucursal) y ADMIN pueden eliminarlas en cualquier estado. La acción pide confirmación y no se puede deshacer.',
        },
        {
          id: 't4',
          question: '¿Qué pasa si una tarea falla?',
          answer:   'El asignado la marca Fallida y escribe el motivo (mínimo 10 caracteres). Completada no se reabre. Si el plazo ya pasó, tampoco se Completa: hay que fallarla con la causa. Cada Fallida suma al KPI de Re-trabajo (tareas con al menos un fallo) y afecta el Over-all. Hoy no hay un botón para reabrir una Fallida: si hay que repetir el trabajo, se asigna de nuevo.',
        },
        {
          id: 't5',
          question: '¿Cómo evalúo la calidad de una tarea completada?',
          answer:   'GERENTE y ADMIN pueden poner de 1 a 5 estrellas (y un comentario opcional) en el detalle de una tarea Completada. El asignado no califica su propia ejecución. Si no hay calificaciones, la fórmula de respaldo del Over-all usa 50 de calidad.',
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
          answer:   'El Índice Global de Ejecución Operativa mide el desempeño de 0 a 100. Un Over-all ≥ 80 es excelente; entre 60 y 79 es aceptable; menor a 60 requiere atención. Es el mismo indicador que antes se llamaba IGEO: solo cambió el nombre en pantalla. El ADMIN lo ve de toda la cadena; el GERENTE, de su sucursal.',
        },
        {
          id: 'k5',
          question: '¿Cómo se calcula exactamente el Over-all?',
          answer:   'La tarjeta del Dashboard te dice qué fórmula estás viendo. Si el servicio analítico responde, el subtítulo es "Analítico · 4 pilares": Cumplimiento 40%, Tiempo 25%, Calidad 20% y Consistencia 15%. Si no responde, el subtítulo es "Respaldo · on-time, re-trabajo y calidad": On-Time × 0.5 + (100 − Re-trabajo) × 0.3 + Calidad × 0.2. Si nadie calificó tareas, esa calidad de respaldo vale 50. Sin tareas cerradas verás "S/D", no un 0. El detalle por módulo está en Métricas.',
        },
        {
          id: 'k2',
          question: '¿Qué mide el On-Time Rate?',
          answer:   'De las tareas ya cerradas (completadas o fallidas), qué porcentaje terminó dentro del plazo (dueAt). Se calcula como: a tiempo / total cerradas × 100. El denominador no es solo lo completado: una fallida también cuenta como cierre. Un On-Time alto indica buena planificación y disciplina. Sin cierres en el período verás "S/D".',
        },
        {
          id: 'k3',
          question: '¿Qué reportes puedo descargar y cómo?',
          answer:   'Ve a "Ver Reportes" en el menú. Hay tres PDFs: Cierre diario (una sucursal en una fecha), Ranking gerencial (todos los gerentes de la cadena, solo ADMIN) y Ranking de colaboradores (una sucursal). Elige el reporte, la sucursal y la fecha o el período, y usa "Descargar PDF". La descarga en Excel del cierre diario ya no existe. Disponible para ADMIN y GERENTE.',
        },
        {
          id: 'k4',
          question: '¿Cómo interpreto el cumplimiento por turno?',
          answer:   'En el Dashboard del GERENTE, "Cumplimiento por Turno" muestra el On-Time de cada turno (MATUTINO, VESPERTINO, NOCTURNO), con cuántas se cerraron a tiempo de cuántas cerradas. La barra va verde en 80% o más, en el color de acento del rol entre 60 y 79%, y roja por debajo de 60%. Si un turno no tiene cierres, verás "S/D".',
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
          question: '¿Cuáles son los roles del sistema?',
          answer:   'Hay tres roles de operación: ADMIN (cadena completa: sucursales, usuarios, indicadores globales), GERENTE (tareas, equipo e incidencias de su sucursal) y EJECUTADOR (ejecuta tareas, sube evidencias y puede abrir incidencias). Admin 0 no es un cuarto rol: es un ADMIN de plataforma (código METRIX) que ve Clientes METRIX y Licencias.',
        },
        {
          id: 'r2',
          question: '¿Cómo creo un nuevo colaborador?',
          answer:   'Ve a Banco de Datos → Colaboradores → "Nuevo". El ADMIN crea administradores o gerentes (el correo es obligatorio para un ADMIN). El GERENTE solo crea EJECUTADORES de su sucursal. Completas nombre, puesto, turno y contraseña (mínimo 8 caracteres); el número de usuario lo asigna METRIX según el puesto, no se escribe a mano. El correo y la fecha de nacimiento son opcionales salvo el correo del ADMIN. (La sección de personal antes se llamaba RH; hoy vive en Banco de Datos.)',
        },
        {
          id: 'r3',
          question: '¿Cómo quito a un colaborador que ya no trabaja?',
          answer:   'En Banco de Datos → Colaboradores → perfil → "Eliminar". Esa acción borra al usuario (el GERENTE solo puede eliminar EJECUTADORES de su sucursal). Las tareas que ya cerró siguen en los KPIs del período en que ocurrieron. No hay un botón de "Desactivar" en el perfil.',
        },
        {
          id: 'r4',
          question: '¿Por qué el ADMIN no ve datos de "su" sucursal?',
          answer:   'Porque el ADMIN de la licencia no tiene sucursal asignada: su alcance es toda la cadena. Por eso usa indicadores globales y en Gamificación ve el Ranking Gerencial. El GERENTE sí trabaja siempre acotado a su sucursal.',
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
          answer:   'Cuando ocurra un evento inesperado que afecte la operación: equipo dañado, falta de insumos, problema de personal, incidente de seguridad u otro. Cualquier colaborador puede abrirla en Incidencias → "Reportar incidencia". Elige categoría, severidad, turno y, si aplica, personas implicadas y evidencias.',
        },
        {
          id: 'i2',
          question: '¿Qué significan los niveles de severidad?',
          answer:   'BAJA: sin impacto inmediato. MEDIA: afecta parcialmente el turno. ALTA: compromete un área o proceso. CRÍTICA: paraliza la operación o es un riesgo; la alerta llega con prioridad crítica. Toda incidencia nueva avisa al gerente responsable (o a los administradores si la reporta un gerente). El resumen está en Métricas → Incidencias.',
        },
        {
          id: 'i3',
          question: '¿Cómo se atiende y se cierra una incidencia?',
          answer:   'Nace Abierta. Solo GERENTE o ADMIN pueden "Tomar en resolución" y después "Cerrar incidencia"; no se cierra directo desde Abierta. Al cerrar se pide quién la cierra y cómo se resolvió (mínimo 10 caracteres). Si el problema vuelve, "Re-abrir" la regresa a Abierta.',
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
          answer:   'El menú Capacitación solo aparece si el plan incluye ese módulo. Ve a Capacitación → "Nueva capacitación": tema, sucursal, turno, participantes y periodo (inicio, fin y hora). Puedes partir de una plantilla del Banco o armarla desde cero y adjuntar materiales del banco o cargarlos al vuelo. Solo GERENTE y ADMIN crean y editan. El ADMIN programa para gerentes; el GERENTE, para su equipo. El asignado las ve en su lista.',
        },
        {
          id: 'c2',
          question: '¿Qué estados tiene una capacitación?',
          answer:   'Programada: agendada. En curso: el participante la inició. Completada: la terminó. No completada: se cerró sin terminar o ya venció. El avance agregado está en Métricas → Capacitaciones.',
        },
        {
          id: 'c3',
          question: '¿Quién crea, asigna y presenta un examen?',
          answer:   'El menú Exámenes (al GERENTE le aparece "Mis Exámenes") solo se muestra si el plan incluye el módulo. El ADMIN arma el examen en Banco de Datos → Bitácora de exámenes → "Nuevo examen" (mínimo 5 preguntas; para gerentes o para ejecutadores). En Exámenes, el ADMIN asigna a gerentes y el GERENTE a ejecutadores. Quien esté asignado —gerente o colaborador— lo presenta en ese mismo módulo. Los resultados se ven ahí; la Bitácora es el catálogo, no el historial de intentos.',
        },
        {
          id: 'c4',
          question: '¿Cómo se aprueba un examen y cuántos intentos hay?',
          answer:   'El puntaje mínimo por defecto es 70%. La duración se elige en horas (1 a 5) y es obligatoria. Hay un intento; si alguien reprueba, GERENTE o ADMIN pueden dar una segunda oportunidad. El resumen de la cadena está en Métricas → Exámenes.',
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
          answer:   'Es el catálogo del que se alimenta el resto del sistema, para ADMIN y GERENTE. El núcleo siempre está: Colaboradores, Puestos, Categorías y Plantillas de tareas. El ADMIN además gestiona Sucursales ahí (ya no hay un menú de Configuración aparte). Plantillas y Materiales de capacitación aparecen si el plan incluye Capacitación; la Bitácora de exámenes, si incluye Exámenes.',
        },
        {
          id: 'b2',
          question: '¿Para qué sirven las plantillas de tareas?',
          answer:   'Para no volver a escribir las tareas que se repiten. La plantilla guarda título, descripción, categoría y el checklist. Al crear una tarea partes de ella y ajustas responsable y fechas. El multimedia de la plantilla se ve al cargarla, pero no se copia a la tarea.',
        },
        {
          id: 'b3',
          question: '¿Dónde configuro las sucursales?',
          answer:   'En Banco de Datos → Sucursales. Solo el ADMIN de la licencia crea, edita o desactiva sedes. El GERENTE trabaja siempre en la sucursal que ya tiene asignada.',
        },
      ],
    },
    {
      id:    'account',
      label: 'Cuenta, plan y acceso',
      icon:  'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
      items: [
        {
          id: 'a1',
          question: '¿Cómo inicio sesión?',
          answer:   'En el inicio de sesión necesitas tres datos: código de plataforma, número de usuario y contraseña. El código identifica a tu empresa (ejemplo TACOS-A3F2) y se muestra al crear tu METRIX. Admin 0 entra con el código METRIX. El número de usuario lo asigna el sistema al dar de alta a la persona.',
        },
        {
          id: 'a2',
          question: '¿Qué hago si olvidé mi contraseña?',
          answer:   'En el login, "¿Olvidaste tu contraseña?" solo aplica al ADMIN de una licencia (no a GERENTE, EJECUTADOR ni al código METRIX). Envía código de plataforma y número de usuario; Admin 0 revisa y, si aprueba, llega una liga de un solo uso. Si alguien del equipo necesita otra clave y tú sí puedes entrar, ábrelo en Banco de Datos → Colaboradores → perfil y cámbiala ahí (confirmas primero tu propia contraseña).',
        },
        {
          id: 'a3',
          question: '¿Qué es el modo prueba?',
          answer:   'Al activar un plan suele haber días de prueba (por defecto 7) sin cobro. Mientras está vigente verás un aviso con los días que quedan y un enlace para pagar. Cuando termina la prueba, hay que activar el plan para seguir operando. Admin 0 puede alargar o acortar esos días desde Clientes METRIX.',
        },
        {
          id: 'a4',
          question: '¿Por qué no veo Capacitación, Exámenes o Gamificación?',
          answer:   'Esos módulos dependen del plan. Si no están incluidos, el menú y las secciones premium del Banco no aparecen. Dashboard, Tareas, Incidencias, Reportes (ADMIN/GERENTE) y el Banco de Datos núcleo sí están en todos los planes. En login, "Ver planes" abre el catálogo público.',
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
          answer:   'No. El color se asigna según el rol (ADMIN azul, GERENTE rojo, EJECUTADOR naranja) para distinguir el perfil de un vistazo. Antes había un selector de tema; se retiró.',
        },
        {
          id: 'g2',
          question: '¿Las notificaciones funcionan en tiempo real?',
          answer:   'Sí. METRIX usa SSE (Server-Sent Events). El punto verde en la campana indica conexión activa. Llegan avisos al asignarte una tarea, al cambiar su estado, al acercarse o vencer el plazo, y al reportar una incidencia. Si la sesión caduca (unas 24 h), METRIX te manda otra vez al login.',
        },
        {
          id: 'g3',
          question: '¿Puedo usar METRIX en mi teléfono o tableta?',
          answer:   'Sí. Es una PWA con diseño responsive. En el teléfono el menú se abre con ☰. Para instalarla como app usa "Instalar METRIX" en esta página o en el login: en Android y computadora el botón abre el diálogo del navegador; en iPhone hay que usar Compartir → Agregar a pantalla de inicio.',
        },
        {
          id: 'g4',
          question: '¿Qué es la Gamificación?',
          answer:   'El menú solo aparece si el plan incluye Gamificación. Calcula insignias y rankings (semana y mes). El GERENTE ve a los colaboradores de su sucursal; el ADMIN ve el Ranking Gerencial por Over-all de equipo. El podio marca a los tres primeros con medalla.',
        },
        {
          id: 'g5',
          question: '¿Cómo se ganan las insignias?',
          answer:   'Se otorgan solas: Puntual Elite (On-Time de 95% o más), Cero Retrabajos (sin tareas devueltas por mala ejecución), Velocidad Rayo (tiempo de ejecución igual o menor a la mitad del promedio de la sucursal), Racha de 7 (7 o más tareas completadas en los últimos 7 días) y Colaborador del Mes (primer lugar del ranking mensual de la sucursal).',
        },
      ],
    },
  ];

  private readonly platformCategory: FaqCategory = {
    id:    'platform',
    label: 'Plataforma (Admin 0)',
    icon:  'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    items: [
      {
        id: 'p1',
        question: '¿Qué veo en Clientes METRIX?',
        answer:   'La lista de instancias provisionadas (no incluye el demo operativo). Desde ahí suspendes o reactivas un cliente, envías una liga de reset y ajustas los días de prueba. En Licencias armas los paquetes comerciales que se venden en /productos.',
      },
      {
        id: 'p2',
        question: '¿Cómo apruebo un olvido de contraseña?',
        answer:   'Cuando el ADMIN de una licencia pide reset, llega una notificación y aparece en la bandeja de Clientes METRIX. Aprueba para enviarle la liga de un solo uso; si el correo no salió, copia la URL que se muestra una vez. También puedes enviar la liga directo desde la fila del cliente. GERENTE y EJECUTADOR no generan solicitudes.',
      },
      {
        id: 'p3',
        question: '¿Cómo sumo o resto días de prueba?',
        answer:   'En la fila del cliente, mientras la prueba esté activa, escribe cuántos días (1 a 365) y usa + d o − d. No hace falta un clic por día. Confirma el cambio antes de aplicarlo.',
      },
    ],
  };

  readonly categories = computed(() =>
    this.auth.isPlatformAdmin()
      ? [...this.tenantCategories, this.platformCategory]
      : this.tenantCategories,
  );

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
