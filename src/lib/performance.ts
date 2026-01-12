import { logger } from './logger';

/**
 * Interface para métricas de performance
 */
interface PerformanceMetric {
    name: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    metadata?: Record<string, unknown>;
}

/**
 * Interface para estatísticas agregadas
 */
interface AggregatedStats {
    count: number;
    totalDuration: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    p95Duration: number;
}

/**
 * Armazenamento de métricas em memória
 */
const metricsStore: Map<string, PerformanceMetric[]> = new Map();

/**
 * Limite de métricas por operação (evita memory leak)
 */
const MAX_METRICS_PER_OPERATION = 100;

/**
 * Verifica se estamos em ambiente de desenvolvimento
 */
const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

/**
 * Inicia medição de performance
 */
export function startMeasure(name: string, metadata?: Record<string, unknown>): PerformanceMetric {
    const metric: PerformanceMetric = {
        name,
        startTime: performance.now(),
        metadata,
    };
    
    return metric;
}

/**
 * Finaliza medição de performance
 */
export function endMeasure(metric: PerformanceMetric): number {
    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;
    
    // Armazenar métrica
    const metrics = metricsStore.get(metric.name) || [];
    metrics.push(metric);
    
    // Limitar quantidade de métricas
    if (metrics.length > MAX_METRICS_PER_OPERATION) {
        metrics.shift();
    }
    
    metricsStore.set(metric.name, metrics);
    
    // Log em desenvolvimento
    if (isDev) {
        logger.debug(`Performance: ${metric.name}`, {
            duration: `${metric.duration.toFixed(2)}ms`,
            ...metric.metadata,
        });
    }
    
    return metric.duration;
}

/**
 * Mede tempo de execução de uma função
 */
export async function measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
): Promise<T> {
    const metric = startMeasure(name, metadata);
    
    try {
        const result = await fn();
        return result;
    } finally {
        endMeasure(metric);
    }
}

/**
 * Mede tempo de execução de uma função síncrona
 */
export function measureSync<T>(
    name: string,
    fn: () => T,
    metadata?: Record<string, unknown>
): T {
    const metric = startMeasure(name, metadata);
    
    try {
        const result = fn();
        return result;
    } finally {
        endMeasure(metric);
    }
}

/**
 * Calcula estatísticas agregadas para uma operação
 */
export function getStats(name: string): AggregatedStats | null {
    const metrics = metricsStore.get(name);
    
    if (!metrics || metrics.length === 0) {
        return null;
    }
    
    const durations = metrics
        .filter(m => m.duration !== undefined)
        .map(m => m.duration!);
    
    if (durations.length === 0) {
        return null;
    }
    
    const sorted = [...durations].sort((a, b) => a - b);
    const sum = durations.reduce((acc, d) => acc + d, 0);
    const p95Index = Math.floor(sorted.length * 0.95);
    
    return {
        count: durations.length,
        totalDuration: sum,
        avgDuration: sum / durations.length,
        minDuration: sorted[0],
        maxDuration: sorted[sorted.length - 1],
        p95Duration: sorted[p95Index],
    };
}

/**
 * Obtém todas as estatísticas
 */
export function getAllStats(): Record<string, AggregatedStats> {
    const allStats: Record<string, AggregatedStats> = {};
    
    metricsStore.forEach((_, name) => {
        const stats = getStats(name);
        if (stats) {
            allStats[name] = stats;
        }
    });
    
    return allStats;
}

/**
 * Limpa métricas de uma operação específica
 */
export function clearMetrics(name: string): void {
    metricsStore.delete(name);
}

/**
 * Limpa todas as métricas
 */
export function clearAllMetrics(): void {
    metricsStore.clear();
}

/**
 * Exporta métricas para console (desenvolvimento)
 */
export function logMetricsSummary(): void {
    const allStats = getAllStats();
    
    console.group('📊 Performance Metrics Summary');
    
    Object.entries(allStats).forEach(([name, stats]) => {
        console.log(`
${name}:
  Count: ${stats.count}
  Avg: ${stats.avgDuration.toFixed(2)}ms
  Min: ${stats.minDuration.toFixed(2)}ms
  Max: ${stats.maxDuration.toFixed(2)}ms
  P95: ${stats.p95Duration.toFixed(2)}ms
        `);
    });
    
    console.groupEnd();
}

/**
 * Mede tamanho de payload em bytes
 */
export function measurePayloadSize(data: unknown): number {
    try {
        const json = JSON.stringify(data);
        return new Blob([json]).size;
    } catch {
        return 0;
    }
}

/**
 * Log de payload size com warning para payloads grandes
 */
export function logPayloadSize(name: string, data: unknown, warnThreshold: number = 100000): void {
    const size = measurePayloadSize(data);
    const sizeKB = (size / 1024).toFixed(2);
    
    if (size > warnThreshold) {
        logger.warn(`Large payload detected: ${name}`, {
            size: `${sizeKB}KB`,
            threshold: `${(warnThreshold / 1024).toFixed(2)}KB`,
        });
    } else if (isDev) {
        logger.debug(`Payload size: ${name}`, {
            size: `${sizeKB}KB`,
        });
    }
}

/**
 * Monitor de cache hit/miss
 */
interface CacheMetrics {
    hits: number;
    misses: number;
    hitRate: number;
}

const cacheMetrics: Map<string, { hits: number; misses: number }> = new Map();

export function recordCacheHit(cacheName: string): void {
    const metrics = cacheMetrics.get(cacheName) || { hits: 0, misses: 0 };
    metrics.hits++;
    cacheMetrics.set(cacheName, metrics);
}

export function recordCacheMiss(cacheName: string): void {
    const metrics = cacheMetrics.get(cacheName) || { hits: 0, misses: 0 };
    metrics.misses++;
    cacheMetrics.set(cacheName, metrics);
}

export function getCacheMetrics(cacheName: string): CacheMetrics | null {
    const metrics = cacheMetrics.get(cacheName);
    
    if (!metrics) {
        return null;
    }
    
    const total = metrics.hits + metrics.misses;
    
    return {
        hits: metrics.hits,
        misses: metrics.misses,
        hitRate: total > 0 ? (metrics.hits / total) * 100 : 0,
    };
}

export function getAllCacheMetrics(): Record<string, CacheMetrics> {
    const allMetrics: Record<string, CacheMetrics> = {};
    
    cacheMetrics.forEach((_, name) => {
        const metrics = getCacheMetrics(name);
        if (metrics) {
            allMetrics[name] = metrics;
        }
    });
    
    return allMetrics;
}

/**
 * HOC para medir performance de funções de serviço
 */
export function withPerformanceTracking<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    name: string
): T {
    return (async (...args: unknown[]) => {
        return measureAsync(name, () => fn(...args));
    }) as T;
}

/**
 * Decorator para medir performance de métodos de classe
 */
export function MeasurePerformance(name?: string) {
    return function (
        target: unknown,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;
        const metricName = name || `${(target as object).constructor.name}.${propertyKey}`;
        
        descriptor.value = async function (...args: unknown[]) {
            return measureAsync(metricName, () => originalMethod.apply(this, args));
        };
        
        return descriptor;
    };
}

export default {
    startMeasure,
    endMeasure,
    measureAsync,
    measureSync,
    getStats,
    getAllStats,
    clearMetrics,
    clearAllMetrics,
    logMetricsSummary,
    measurePayloadSize,
    logPayloadSize,
    recordCacheHit,
    recordCacheMiss,
    getCacheMetrics,
    getAllCacheMetrics,
    withPerformanceTracking,
    MeasurePerformance,
};
