package com.metrix.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.metrix.api.config.RedisConfig;
import com.metrix.api.dto.NotificationEvent;
import com.metrix.api.model.Role;
import com.metrix.api.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Gestiona las conexiones SSE activas y el envío de eventos en tiempo real.
 * <p>
 * Fase 4: Soporta multi-instancia via Redis Pub/Sub.
 * <ul>
 *   <li>{@link #sendToUser} / {@link #sendToStoreManagers}: publican a Redis "sse.broadcast"</li>
 *   <li>{@link #deliverLocally}: entrega a emitters locales sin re-publicar (evita loop)</li>
 * </ul>
 */
@Slf4j
@Service
public class NotificationService {

    private final UserRepository userRepository;

    @Nullable
    private final StringRedisTemplate redisTemplate;

    @Nullable
    private final ObjectMapper objectMapper;

    private final Map<String, SseEmitter> emitters = new ConcurrentHashMap<>();

    public NotificationService(
            UserRepository userRepository,
            @Nullable StringRedisTemplate redisTemplate,
            @Nullable ObjectMapper redisObjectMapper) {
        this.userRepository = userRepository;
        this.redisTemplate = redisTemplate;
        this.objectMapper = redisObjectMapper;
    }

    // ── Suscripción ─────────────────────────────────────────────────────────

    public SseEmitter subscribe(String userId) {
        SseEmitter emitter = new SseEmitter(300_000L);

        emitter.onCompletion(() -> {
            emitters.remove(userId, emitter);
            log.debug("SSE completado para usuario: {}", userId);
        });
        emitter.onTimeout(() -> {
            emitters.remove(userId, emitter);
            log.debug("SSE timeout para usuario: {}", userId);
        });
        emitter.onError(e -> {
            emitters.remove(userId, emitter);
            log.debug("SSE error para usuario {}: {}", userId, e.getMessage());
        });

        SseEmitter old = emitters.put(userId, emitter);
        if (old != null) {
            try { old.complete(); } catch (Exception ignored) {}
        }
        log.info("SSE conectado — userId: {} | conexiones activas: {}", userId, emitters.size());

        try {
            emitter.send(SseEmitter.event().name("connected").data("OK"));
        } catch (IOException e) {
            emitters.remove(userId, emitter);
        }
        return emitter;
    }

    // ── Envío con broadcast Redis ───────────────────────────────────────────

    /**
     * Envía a un usuario. Si Redis está disponible, publica al channel "sse.broadcast"
     * para que TODAS las instancias intenten entregar localmente.
     * Si Redis no está, entrega solo localmente (single-instance mode).
     */
    public void sendToUser(String userId, NotificationEvent event) {
        if (redisTemplate != null) {
            broadcastViaRedis(event);
        } else {
            deliverToLocalEmitter(userId, event);
        }
    }

    public void sendToStoreManagers(String storeId, NotificationEvent event) {
        if (redisTemplate != null) {
            // Redis broadcast — el subscriber se encarga de resolver destinatarios
            event.setStoreId(storeId);
            broadcastViaRedis(event);
        } else {
            // Single-instance fallback
            resolveAndDeliverManagers(storeId, event);
        }
    }

    public void sendToAllAdmins(NotificationEvent event) {
        if (redisTemplate != null) {
            broadcastViaRedis(event);
        } else {
            userRepository.findByRolesContaining(Role.ADMIN)
                    .forEach(admin -> deliverToLocalEmitter(admin.getId(), event));
        }
    }

    // ── Multi-instancia: entrega local (llamado por RedisSSESubscriber) ─────

    /**
     * Entrega la notificación a emitters locales SIN re-publicar a Redis.
     * Llamado por {@code RedisSSESubscriber.onMessage()} en cada instancia.
     */
    public void deliverLocally(NotificationEvent event) {
        // Si tiene un target userId específico, entregar solo a ese
        String targetUserId = event.getTaskId() != null
                ? resolveAssignedUser(event.getTaskId())
                : null;

        if (targetUserId != null && emitters.containsKey(targetUserId)) {
            deliverToLocalEmitter(targetUserId, event);
        }

        // Siempre entregar a managers de la sucursal (si están conectados localmente)
        if (event.getStoreId() != null) {
            resolveAndDeliverManagers(event.getStoreId(), event);
        }
    }

    public int activeConnections() {
        return emitters.size();
    }

    // ── Internals ───────────────────────────────────────────────────────────

    private void deliverToLocalEmitter(String userId, NotificationEvent event) {
        SseEmitter emitter = emitters.get(userId);
        if (emitter == null) return;

        try {
            emitter.send(SseEmitter.event()
                    .id(event.getId())
                    .name("notification")
                    .data(event));
            log.debug("Notificación entregada a {}: {}", userId, event.getType());
        } catch (IOException e) {
            emitters.remove(userId, emitter);
            log.warn("Error entregando notificación a {}: {}", userId, e.getMessage());
        }
    }

    private void resolveAndDeliverManagers(String storeId, NotificationEvent event) {
        userRepository.findByStoreIdAndActivoTrue(storeId).stream()
                .filter(u -> u.getRoles().contains(Role.GERENTE) || u.getRoles().contains(Role.ADMIN))
                .map(u -> u.getId())
                .forEach(managerId -> deliverToLocalEmitter(managerId, event));
    }

    private void broadcastViaRedis(NotificationEvent event) {
        if (redisTemplate == null || objectMapper == null) return;
        try {
            String json = objectMapper.writeValueAsString(event);
            redisTemplate.convertAndSend(RedisConfig.SSE_CHANNEL, json);
        } catch (Exception e) {
            log.warn("[SSE-Redis] Broadcast failed, falling back to local: {}", e.getMessage());
            // Fallback: entregar localmente
            deliverLocally(event);
        }
    }

    @Nullable
    private String resolveAssignedUser(String taskId) {
        // Para simplicidad, retornamos null — el deliverLocally resolverá via storeId
        return null;
    }
}
