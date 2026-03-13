package com.metrix.api.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.metrix.api.dto.MetricEvent;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.UUID;

/**
 * Interceptor AOP para captura automática de métricas en METRIX.
 * <p>
 * Publica eventos a Redis Pub/Sub channel {@code metrix.events} para que
 * los Python workers los consuman y procesen con pandas.
 * <p>
 * Si Redis no está disponible, solo loguea (graceful degradation).
 */
@Slf4j
@Aspect
@Component
public class MetricsInterceptor {

    @Nullable
    private final StringRedisTemplate redisTemplate;

    @Nullable
    private final ObjectMapper objectMapper;

    public MetricsInterceptor(
            @Nullable StringRedisTemplate redisTemplate,
            @Nullable ObjectMapper redisObjectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = redisObjectMapper;
    }

    @Around("execution(* com.metrix.api.service.*ServiceImpl.create*(..)) || " +
            "execution(* com.metrix.api.service.*ServiceImpl.update*(..)) || " +
            "execution(* com.metrix.api.service.*ServiceImpl.rate*(..)) || " +
            "execution(* com.metrix.api.service.*ServiceImpl.add*(..)) || " +
            "execution(* com.metrix.api.service.*ServiceImpl.delete*(..))")
    public Object captureMetric(ProceedingJoinPoint jp) throws Throwable {
        String service = jp.getTarget().getClass().getSimpleName();
        String method = jp.getSignature().getName();
        long start = System.currentTimeMillis();

        try {
            Object result = jp.proceed();
            long duration = System.currentTimeMillis() - start;

            publishMetric(service, method, duration, "OK", null);
            return result;
        } catch (Throwable ex) {
            long duration = System.currentTimeMillis() - start;
            publishMetric(service, method, duration, "ERROR", ex.getMessage());
            throw ex;
        }
    }

    @Around("execution(* com.metrix.api.service.KpiServiceImpl.get*(..))")
    public Object captureKpiMetric(ProceedingJoinPoint jp) throws Throwable {
        String method = jp.getSignature().getName();
        long start = System.currentTimeMillis();

        try {
            Object result = jp.proceed();
            long duration = System.currentTimeMillis() - start;

            if (duration > 500) {
                log.warn("[METRIC][SLOW] KpiService.{} took {}ms", method, duration);
            }
            publishMetric("KpiServiceImpl", method, duration, "OK", null);
            return result;
        } catch (Throwable ex) {
            long duration = System.currentTimeMillis() - start;
            publishMetric("KpiServiceImpl", method, duration, "ERROR", ex.getMessage());
            throw ex;
        }
    }

    private void publishMetric(String service, String method, long durationMs,
                                String status, String errorMessage) {
        MetricEvent event = MetricEvent.builder()
                .id(UUID.randomUUID().toString())
                .service(service)
                .method(method)
                .durationMs(durationMs)
                .status(status)
                .errorMessage(errorMessage)
                .timestamp(Instant.now())
                .build();

        log.info("[METRIC] service={} method={} duration={}ms status={}",
                service, method, durationMs, status);

        // Publicar a Redis si está disponible (fire-and-forget)
        if (redisTemplate != null && objectMapper != null) {
            try {
                String json = objectMapper.writeValueAsString(event);
                redisTemplate.convertAndSend(RedisConfig.METRICS_CHANNEL, json);
            } catch (Exception e) {
                log.debug("[METRIC] Redis publish failed (degraded mode): {}", e.getMessage());
            }
        }
    }
}
