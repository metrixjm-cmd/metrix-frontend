package com.metrix.api.scheduler;

import com.metrix.api.dto.NotificationEvent;
import com.metrix.api.model.TaskStatus;
import com.metrix.api.repository.StoreRepository;
import com.metrix.api.repository.TaskRepository;
import com.metrix.api.service.KpiService;
import com.metrix.api.service.NotificationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.lang.Nullable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Alertas preventivas programadas (Sprint 16, refactorizado Fase 4).
 * <p>
 * Deduplicación:
 * <ul>
 *   <li>Con Redis: SETNX con TTL 1h (distribuido, auto-limpia, multi-instancia safe)</li>
 *   <li>Sin Redis: ConcurrentHashMap.newKeySet() local (fallback single-instance)</li>
 * </ul>
 */
@Slf4j
@Component
public class AlertScheduler {

    private final TaskRepository       taskRepository;
    private final StoreRepository      storeRepository;
    private final KpiService           kpiService;
    private final NotificationService  notificationService;

    @Nullable
    private final StringRedisTemplate  redisTemplate;

    // Fallback local (usado cuando Redis no está disponible)
    private final Set<String> localDeadlineIds = ConcurrentHashMap.newKeySet();
    private final Set<String> localOverdueIds  = ConcurrentHashMap.newKeySet();

    private static final List<TaskStatus> OPEN_STATUSES =
            List.of(TaskStatus.PENDING, TaskStatus.IN_PROGRESS);

    public AlertScheduler(
            TaskRepository taskRepository,
            StoreRepository storeRepository,
            KpiService kpiService,
            NotificationService notificationService,
            @Nullable StringRedisTemplate redisTemplate) {
        this.taskRepository = taskRepository;
        this.storeRepository = storeRepository;
        this.kpiService = kpiService;
        this.notificationService = notificationService;
        this.redisTemplate = redisTemplate;
    }

    // ── Alertas de vencimiento próximo ────────────────────────────────────

    @Scheduled(cron = "0 */5 * * * *")
    public void checkUpcomingDeadlines() {
        Instant now  = Instant.now();
        Instant in30 = now.plusSeconds(30 * 60);

        List<com.metrix.api.model.Task> upcoming =
                taskRepository.findByExecution_StatusInAndDueAtBetweenAndActivoTrue(
                        OPEN_STATUSES, now, in30);

        for (com.metrix.api.model.Task task : upcoming) {
            if (!tryAcquireDedup("alert:deadline:" + task.getId())) continue;

            NotificationEvent event = NotificationEvent.builder()
                    .id(UUID.randomUUID().toString())
                    .type("TASK_DEADLINE_WARNING")
                    .severity("warning")
                    .title("Tarea próxima a vencer")
                    .body(String.format("«%s» vence en menos de 30 minutos.", task.getTitle()))
                    .taskId(task.getId())
                    .incidentId(null)
                    .storeId(task.getStoreId())
                    .timestamp(now)
                    .build();

            if (task.getAssignedUserId() != null) {
                notificationService.sendToUser(task.getAssignedUserId(), event);
            }
            notificationService.sendToStoreManagers(task.getStoreId(), event);
            log.debug("TASK_DEADLINE_WARNING enviado — taskId: {}", task.getId());
        }

        if (!upcoming.isEmpty()) {
            log.info("[AlertScheduler] checkUpcomingDeadlines — {} tareas próximas a vencer",
                    upcoming.size());
        }
    }

    // ── Alertas de tareas vencidas ────────────────────────────────────────

    @Scheduled(cron = "0 */10 * * * *")
    public void checkOverdueTasks() {
        Instant now = Instant.now();

        List<com.metrix.api.model.Task> overdue =
                taskRepository.findByExecution_StatusInAndDueAtBeforeAndActivoTrue(
                        OPEN_STATUSES, now);

        for (com.metrix.api.model.Task task : overdue) {
            if (!tryAcquireDedup("alert:overdue:" + task.getId())) continue;

            String severity = task.isCritical() ? "critical" : "warning";
            String title    = task.isCritical() ? "Tarea crítica vencida" : "Tarea vencida";

            NotificationEvent event = NotificationEvent.builder()
                    .id(UUID.randomUUID().toString())
                    .type("TASK_OVERDUE")
                    .severity(severity)
                    .title(title)
                    .body(String.format("«%s» superó su tiempo límite sin cerrarse.", task.getTitle()))
                    .taskId(task.getId())
                    .incidentId(null)
                    .storeId(task.getStoreId())
                    .timestamp(now)
                    .build();

            if (task.getAssignedUserId() != null) {
                notificationService.sendToUser(task.getAssignedUserId(), event);
            }
            notificationService.sendToStoreManagers(task.getStoreId(), event);
            log.debug("TASK_OVERDUE enviado — taskId: {} | critical: {}", task.getId(), task.isCritical());
        }

        if (!overdue.isEmpty()) {
            log.info("[AlertScheduler] checkOverdueTasks — {} tareas vencidas", overdue.size());
        }
    }

    // ── Resumen diario de IGEO ──────────────────────────────────────────

    @Scheduled(cron = "0 0 8 * * *")
    public void sendDailyIgeoAlert() {
        Instant now = Instant.now();

        storeRepository.findByActivoTrue().forEach(store -> {
            try {
                double igeo = kpiService.getStoreSummary(store.getId()).getIgeo();
                if (igeo >= 0 && igeo < 70) {
                    NotificationEvent event = NotificationEvent.builder()
                            .id(UUID.randomUUID().toString())
                            .type("DAILY_IGEO_ALERT")
                            .severity("critical")
                            .title("Alerta de desempeño operativo")
                            .body(String.format("Sucursal «%s» inicia el día con IGEO %.1f%% (mínimo: 70%%).",
                                    store.getNombre(), igeo))
                            .taskId(null)
                            .incidentId(null)
                            .storeId(store.getId())
                            .timestamp(now)
                            .build();

                    notificationService.sendToAllAdmins(event);
                    log.info("[AlertScheduler] DAILY_IGEO_ALERT — sucursal: {} | IGEO: {}%",
                            store.getNombre(), igeo);
                }
            } catch (Exception e) {
                log.error("[AlertScheduler] Error IGEO para sucursal {}: {}", store.getId(), e.getMessage());
            }
        });
    }

    // ── Limpieza (solo para fallback local) ─────────────────────────────

    @Scheduled(cron = "0 0 * * * *")
    public void clearLocalSets() {
        if (redisTemplate != null) return; // Redis auto-expira con TTL
        int d = localDeadlineIds.size();
        int o = localOverdueIds.size();
        localDeadlineIds.clear();
        localOverdueIds.clear();
        log.info("[AlertScheduler] Local sets limpiados — deadline: {} | overdue: {}", d, o);
    }

    // ── Deduplicación: Redis SETNX o fallback local ─────────────────────

    /**
     * Intenta adquirir un lock de deduplicación.
     * Con Redis: SETNX + TTL 1h (distribuido, auto-expira).
     * Sin Redis: Set local (single-instance only).
     *
     * @return true si es la primera vez (debe enviar alerta), false si ya existe
     */
    private boolean tryAcquireDedup(String key) {
        if (redisTemplate != null) {
            try {
                Boolean isNew = redisTemplate.opsForValue()
                        .setIfAbsent(key, "1", Duration.ofHours(1));
                return Boolean.TRUE.equals(isNew);
            } catch (Exception e) {
                log.warn("[AlertScheduler] Redis SETNX failed for {}, using local fallback", key);
            }
        }
        // Fallback local
        if (key.startsWith("alert:deadline:")) {
            return localDeadlineIds.add(key);
        } else {
            return localOverdueIds.add(key);
        }
    }
}
