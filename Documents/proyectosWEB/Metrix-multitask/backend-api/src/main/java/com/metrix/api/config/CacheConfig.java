package com.metrix.api.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

/**
 * Configuración de cache in-memory con Caffeine.
 * <p>
 * Preparado para migración a Redis (Memorystore) en producción:
 * reemplazar este bean con RedisCacheManager cuando Redis esté disponible.
 * <p>
 * Caches definidos:
 * <ul>
 *   <li>{@code kpiSummary} — KPI de sucursal, TTL 5 min, max 50 entries</li>
 *   <li>{@code leaderboard} — Ranking gamificación, TTL 10 min, max 20 entries</li>
 *   <li>{@code storeRanking} — Ranking global de sucursales, TTL 5 min, max 1 entry</li>
 * </ul>
 */
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager();
        manager.setCaffeine(Caffeine.newBuilder()
                .expireAfterWrite(5, TimeUnit.MINUTES)
                .maximumSize(100)
                .recordStats());
        return manager;
    }
}
