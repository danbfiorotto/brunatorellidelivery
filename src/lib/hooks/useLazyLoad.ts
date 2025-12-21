import { useState, useEffect, useCallback, useRef, RefObject } from 'react';

interface UseLazyLoadOptions {
    initialCount?: number;
    loadMoreCount?: number;
    threshold?: number;
}

interface UseLazyLoadReturn<T> {
    visibleItems: T[];
    hasMore: boolean;
    loadMore: () => void;
    reset: () => void;
    loadMoreRef: RefObject<HTMLDivElement | null>;
}

/**
 * Hook para lazy loading de listas grandes
 */
export const useLazyLoad = <T = unknown>(
    items: T[] = [],
    options: UseLazyLoadOptions = {}
): UseLazyLoadReturn<T> => {
    const {
        initialCount = 20,
        loadMoreCount = 20,
        threshold = 200
    } = options;

    const [visibleCount, setVisibleCount] = useState<number>(initialCount);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useRef<HTMLDivElement | null>(null);

    const visibleItems = items.slice(0, visibleCount);
    const hasMore = visibleCount < items.length;

    const loadMore = useCallback((): void => {
        if (hasMore) {
            setVisibleCount(prev => Math.min(prev + loadMoreCount, items.length));
        }
    }, [hasMore, loadMoreCount, items.length]);

    const reset = useCallback((): void => {
        setVisibleCount(initialCount);
    }, [initialCount]);

    // Intersection Observer para carregar automaticamente ao chegar no final
    useEffect(() => {
        if (!hasMore || !loadMoreRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    loadMore();
                }
            },
            {
                rootMargin: `${threshold}px`
            }
        );

        observer.observe(loadMoreRef.current);
        observerRef.current = observer;

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [hasMore, loadMore, threshold]);

    // Reset quando items mudam
    useEffect(() => {
        if (items.length < visibleCount) {
            reset();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items.length]);

    return {
        visibleItems,
        hasMore,
        loadMore,
        reset,
        loadMoreRef
    };
};

