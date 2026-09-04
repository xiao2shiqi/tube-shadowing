import { useRef, useState, useEffect, useCallback, useMemo } from 'react';

interface VirtualItem<T> {
  index: number;
  key: string | number;
  item: T;
  style: React.CSSProperties;
  measureRef: React.RefCallback<HTMLElement>;
}

interface UseVirtualListOptions<T> {
  items: T[];
  getItemKey: (item: T, index: number) => string | number;
  estimatedHeight: number;
  overscan?: number;
  listKey?: string;
}

interface UseVirtualListReturn<T> {
  virtualItems: VirtualItem<T>[];
  totalHeight: number;
  scrollToIndex: (index: number, behavior?: ScrollBehavior) => void;
  containerRef: React.RefCallback<HTMLElement>;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function useVirtualList<T>({
  items,
  getItemKey,
  estimatedHeight,
  overscan = 8,
  listKey,
}: UseVirtualListOptions<T>): UseVirtualListReturn<T> {
  const measuredHeightsRef = useRef<Map<string | number, number>>(new Map());
  const observedElementsRef = useRef<Map<Element, string | number>>(new Map());
  const keyToElementRef = useRef<Map<string | number, HTMLElement>>(new Map());
  const measureCallbacksRef = useRef<Map<string | number, React.RefCallback<HTMLElement>>>(new Map());
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [forceUpdate, setForceUpdate] = useState(0);

  const containerRef = useCallback((node: HTMLElement | null) => {
    setContainer(node);
  }, []);

  useEffect(() => {
    measuredHeightsRef.current.clear();
    observedElementsRef.current.clear();
    keyToElementRef.current.clear();
    measureCallbacksRef.current.clear();
    resizeObserverRef.current?.disconnect();
    setForceUpdate((n) => n + 1);
  }, [listKey]);

  const getMeasureRef = useCallback((key: string | number): React.RefCallback<HTMLElement> => {
    let cb = measureCallbacksRef.current.get(key);
    if (cb) return cb;

    cb = (el: HTMLElement | null) => {
      const prevEl = keyToElementRef.current.get(key);
      if (prevEl && prevEl !== el) {
        resizeObserverRef.current?.unobserve(prevEl);
        observedElementsRef.current.delete(prevEl);
      }
      if (!el) {
        keyToElementRef.current.delete(key);
        return;
      }
      keyToElementRef.current.set(key, el);
      if (observedElementsRef.current.get(el) === key) return;
      observedElementsRef.current.set(el, key);
      resizeObserverRef.current?.observe(el);
    };

    measureCallbacksRef.current.set(key, cb);
    return cb;
  }, []);

  // Cumulative offsets and total height
  const { offsets, totalHeight } = useMemo(() => {
    const off: number[] = [];
    let total = 0;

    for (let i = 0; i < items.length; i++) {
      const key = getItemKey(items[i], i);
      const h = measuredHeightsRef.current.get(key) ?? estimatedHeight;
      off[i] = total;
      total += h;
    }

    return { offsets: off, totalHeight: total };
  }, [items, getItemKey, estimatedHeight, forceUpdate]);

  const findStartIndex = useCallback(
    (targetOffset: number): number => {
      if (items.length === 0) return 0;
      let lo = 0;
      let hi = items.length - 1;
      let ans = 0;
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (offsets[mid] <= targetOffset) {
          ans = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      return ans;
    },
    [items.length, offsets]
  );

  const virtualItems = useMemo(() => {
    if (items.length === 0) return [];

    const startIndex = clamp(findStartIndex(scrollTop) - overscan, 0, items.length - 1);
    const endIndex = clamp(
      findStartIndex(scrollTop + containerHeight) + overscan,
      0,
      items.length - 1
    );

    const result: VirtualItem<T>[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      const key = getItemKey(items[i], i);
      result.push({
        index: i,
        key,
        item: items[i],
        style: {
          position: 'absolute',
          top: offsets[i],
          left: 0,
          right: 0,
          willChange: 'transform',
        },
        measureRef: getMeasureRef(key),
      });
    }

    return result;
  }, [items, getItemKey, offsets, scrollTop, containerHeight, overscan, getMeasureRef]);

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = 'smooth') => {
      if (!container || items.length === 0) return;
      const clampedIndex = clamp(index, 0, items.length - 1);
      const offset = offsets[clampedIndex] ?? clampedIndex * estimatedHeight;
      const itemHeight =
        measuredHeightsRef.current.get(getItemKey(items[clampedIndex], clampedIndex)) ??
        estimatedHeight;
      container.scrollTo({
        top: Math.max(0, offset - containerHeight / 2 + itemHeight / 2),
        behavior,
      });
    },
    [container, items, getItemKey, offsets, containerHeight, estimatedHeight]
  );

  // Observe container size and scroll position
  useEffect(() => {
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      setContainerHeight(rect.height);
      setScrollTop(container.scrollTop);
    };

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrollTop(container.scrollTop);
        ticking = false;
      });
    };

    container.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      resizeObserver.disconnect();
      container.removeEventListener('scroll', onScroll);
    };
  }, [container]);

  // Observe rendered item heights
  useEffect(() => {
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      observedElementsRef.current.clear();
    }

    resizeObserverRef.current = new ResizeObserver((entries) => {
      let changed = false;
      for (const entry of entries) {
        const key = observedElementsRef.current.get(entry.target);
        if (key == null) continue;
        const newHeight = entry.contentRect.height;
        const currentHeight = measuredHeightsRef.current.get(key);
        if (currentHeight !== newHeight) {
          measuredHeightsRef.current.set(key, newHeight);
          changed = true;
        }
      }
      if (changed) {
        setForceUpdate((n) => n + 1);
      }
    });

    return () => {
      resizeObserverRef.current?.disconnect();
      observedElementsRef.current.clear();
      keyToElementRef.current.clear();
      measureCallbacksRef.current.clear();
    };
  }, []);

  return { virtualItems, totalHeight, scrollToIndex, containerRef };
}
