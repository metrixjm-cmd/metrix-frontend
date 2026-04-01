# METRIX: Sistema de Gestión de Ejecución Operativa y Analítica

## 1. Objetivos Generales del Software (22 Puntos)
El sistema METRIX está diseñado para garantizar el cumplimiento operativo a través de los siguientes objetivos:

1.  **Delegación Inteligente:** Organizar la delegación de actividades por persona y puesto.
2.  **Escalabilidad de Carga:** Soportar mínimo 30 usuarios por unidad de trabajo (operarios y ejecutores).
3.  **Gestión de Perfiles:** Registro de usuarios (Nombre / Puesto / Tienda / Turno / #Usuario).
4.  **Control de Estatus:** Flujo completo: Asignación -> Lectura -> Ejecución -> Marcado (✔/X) con aviso en tiempo real al administrador.
5.  **Multisectorial:** Capacidad de administrar de 5 a 10 unidades de trabajo simultáneas.
6.  **Multi-Administración:** Interacción simultánea de diferentes administradores.
7.  **Gestión del Tiempo:** Organización de tareas por contenido y duración estimada.
8.  **Alertas Activas:** Generación de avisos automáticos de tareas terminadas o inconclusas.
9.  **Notificaciones Real-Time:** Sistema de alertas instantáneas para desviaciones operativas.
10. **Registro de Identidad:** Control centralizado de usuarios y accesos.
11. **Almacenamiento de Resultados:** Persistencia de datos históricos para consulta de KPIs.
12. **Analíticas Amigables:** Capacidad de compartir analíticas en formatos claros y exportables.
13. **Evidencia Multimedia:** Almacenamiento de videos y fotos como testigos de ejecución (vía GCS).
14. **Incentivos:** Identificación de usuarios con alto desempeño para programas de recompensa.
15. **Gestión de Turnos:** Administración dinámica de horarios (Matutino/Vespertino/Nocturno).
16. **Independencia de Datos:** Arquitectura preparada para integrarse con MongoDB como motor principal.
17. **Disponibilidad 24/7:** El sistema debe mantenerse activo fuera de horarios hábiles.
18. **Multi-Dispositivo:** Interfaz optimizada para Tablet y PC.
19. **Resumen Ejecutivo:** Dashboard de indicadores clave de cierre diario.
20. **Gestión de Contingencias:** Resolución y registro de incidencias durante la operación.
21. **Reporteo en Vivo:** Información instantánea de: tareas terminadas, no terminadas, capacitaciones y tiempos.
22. **Dashboards Especializados:** Vistas para Capacitación, RH, Operaciones y módulos personalizados de Certificación y Reportes.

---

## 2. Indicadores Clave de Desempeño (10 KPIs)

El sistema calculará automáticamente los siguientes métricas:

1.  **On-Time Rate (% Cumplimiento en Tiempo):** $$\frac{Tareas\,terminadas\,dentro\,del\,tiempo}{Total\,tareas\,asignadas}$$
2.  **Índice de Delegación Efectiva:** Tareas completadas sin re-trabajo.
3.  **Tasa de Re-trabajo:** Tareas devueltas por mala ejecución o falta de evidencia.
4.  **Tiempo Promedio de Ejecución:** Comparativa de tiempo real vs. estándar definido por tipo de tarea.
5.  **Cumplimiento por Turno:** Segmentación de eficiencia (Mañana/Tarde/Noche).
6.  **Ranking Inter-Sucursal:** Comparativa de cumplimiento entre unidades de trabajo.
7.  **Índice de Responsabilidad Individual:** Score de cumplimiento por colaborador.
8.  **Tareas Críticas No Ejecutadas:** Listado de tareas estratégicas omitidas.
9.  **Velocidad de Corrección:** Tiempo promedio para resolver tareas rechazadas.
10. **IGEO (Índice Global de Ejecución Operativa):** Score ponderado que consolida:
    * Cumplimiento
    * Tiempo
    * Calidad
    * Consistencia

---

## 3. Informes Requeridos
* **Dashboard Ejecutivo:** Dirigido a Dueño/Director. Visión macro y tendencias mensuales.
* **Reporte Gerencial:** Dirigido a Gerentes de Sucursal. Detalle de eficiencia por colaborador y alertas.
* **Ficha de Desempeño:** Para incentivos y evaluación de RH.
* **Ranking de Gamificación:** Evolución semanal y Top 3 de equipos/sucursales.
* **Alertas Automáticas:** Notificaciones de prevención de caídas en cumplimiento.

---

## 4. Modelo de Datos Unificado (MongoDB JSON)

```json
{
  "_id": "uuid",
  "metadata": {
    "project": "METRIX",
    "version": "1.0"
  },
  "task_definition": {
    "title": "String",
    "description": "String",
    "category": "Operaciones/RH/Capacitación",
    "is_critical": "Boolean"
  },
  "assignment": {
    "user_id": "ID_REF",
    "position": "String",
    "store_id": "STORE_REF",
    "shift": "String",
    "due_at": "ISODate"
  },
  "execution": {
    "status": "PENDING / COMPLETED / FAILED",
    "started_at": "ISODate",
    "finished_at": "ISODate",
    "on_time": "Boolean",
    "evidence": {
      "images": ["url_gcs"],
      "videos": ["url_gcs"]
    }
  },
  "audit": {
    "rework_count": "Number",
    "quality_rating": "Number",
    "comments": "String"
  }
}