package com.metrix.api.config;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

/**
 * Interceptor AOP para captura automática de métricas en METRIX.
 * <p>
 * Filosofía METRIX: cada interacción alimenta el ecosistema de métricas
 * sin penalizar los tiempos de respuesta del cliente.
 * <p>
 * Fase actual: structured logging (JSON-ready).
 * Fase Redis: publicar eventos a Redis Pub/Sub channel "metrix.events"
 * para que los Python workers los consuman y procesen con pandas.
 */
@Slf4j
@Aspect
@Component
public class MetricsInterceptor {

    /**
     * Intercepta todas las mutaciones en los servicios de negocio.
     * Captura: servicio, método, duración, éxito/error.
     */
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

            log.info("[METRIC] service={} method={} duration={}ms status=OK",
                    service, method, duration);

            // TODO Fase Redis: redisTemplate.convertAndSend("metrix.events", event)

            return result;
        } catch (Throwable ex) {
            long duration = System.currentTimeMillis() - start;

            log.warn("[METRIC] service={} method={} duration={}ms status=ERROR error={}",
                    service, method, duration, ex.getMessage());

            throw ex;
        }
    }

    /**
     * Intercepta todas las lecturas de KPI para medir latencia de cálculo.
     */
    @Around("execution(* com.metrix.api.service.KpiServiceImpl.get*(..))")
    public Object captureKpiMetric(ProceedingJoinPoint jp) throws Throwable {
        String method = jp.getSignature().getName();
        long start = System.currentTimeMillis();

        try {
            Object result = jp.proceed();
            long duration = System.currentTimeMillis() - start;

            if (duration > 500) {
                log.warn("[METRIC][SLOW] KpiService.{} took {}ms — consider cache or optimization",
                        method, duration);
            } else {
                log.debug("[METRIC] KpiService.{} duration={}ms", method, duration);
            }

            return result;
        } catch (Throwable ex) {
            long duration = System.currentTimeMillis() - start;
            log.error("[METRIC] KpiService.{} FAILED after {}ms: {}", method, duration, ex.getMessage());
            throw ex;
        }
    }
}
