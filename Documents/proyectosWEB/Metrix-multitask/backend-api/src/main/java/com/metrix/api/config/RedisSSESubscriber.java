package com.metrix.api.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.metrix.api.dto.NotificationEvent;
import com.metrix.api.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Subscriber que escucha el Redis Pub/Sub channel "sse.broadcast"
 * y re-distribuye las notificaciones a los SSE emitters locales.
 * <p>
 * Flujo multi-instancia:
 * <pre>
 *   Instancia A: updateStatus() → save task → publish to Redis "sse.broadcast"
 *   Instancia B: RedisSSESubscriber.onMessage() → notificationService.deliverLocal(event)
 *   Instancia C: RedisSSESubscriber.onMessage() → notificationService.deliverLocal(event)
 * </pre>
 * Cada instancia entrega la notificación SOLO a los usuarios conectados localmente.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "metrix.redis.enabled", havingValue = "true")
public class RedisSSESubscriber {

    private final NotificationService notificationService;
    private final ObjectMapper redisObjectMapper;

    /**
     * Invocado por Spring Redis MessageListenerAdapter cuando llega un mensaje
     * al channel "sse.broadcast".
     */
    public void onMessage(String message) {
        try {
            NotificationEvent event = redisObjectMapper.readValue(message, NotificationEvent.class);
            log.debug("[SSE-Redis] Received broadcast event: type={}, storeId={}",
                    event.getType(), event.getStoreId());

            // Entregar a emitters locales (no re-publicar a Redis — evita loop)
            notificationService.deliverLocally(event);
        } catch (Exception e) {
            log.warn("[SSE-Redis] Failed to process broadcast message: {}", e.getMessage());
        }
    }
}
