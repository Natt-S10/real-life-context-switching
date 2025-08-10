import React, { useEffect, useMemo, useRef, useState } from 'react';

export interface VirtualListProps<T> {
  items: T[];
  itemHeight: number; // fixed height in px
  overscan?: number;
  className?: string; // container class (e.g., 'task-viewport')
  renderItem: (item: T, index: number) => React.ReactNode;
}

export function VirtualList<T>({ items, itemHeight, overscan = 6, className, renderItem }: VirtualListProps<T>) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);

  const total = items.length;
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    const vp = viewportRef.current; if (!vp) return;
    const onScroll = () => setScrollTop(vp.scrollTop);
    vp.addEventListener('scroll', onScroll, { passive: true });
    const onResize = () => setScrollTop(vp.scrollTop);
    window.addEventListener('resize', onResize);
    return () => { vp.removeEventListener('scroll', onScroll as any); window.removeEventListener('resize', onResize); };
  }, []);

  const viewportH = viewportRef.current?.clientHeight ?? 0;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight));
  const visibleCount = Math.ceil((viewportH || 1) / itemHeight) + overscan;
  const endIndex = Math.min(total, startIndex + visibleCount);
  const offsetY = startIndex * itemHeight;

  const visibleItems = useMemo(() => items.slice(startIndex, endIndex), [items, startIndex, endIndex]);

  useEffect(() => {
    if (spacerRef.current) spacerRef.current.style.height = `${total * itemHeight}px`;
    if (listRef.current) listRef.current.style.transform = `translateY(${offsetY}px)`;
  }, [total, itemHeight, offsetY]);

  const scrollbarStyle: React.CSSProperties = {
    scrollbarWidth: 'thin',
    scrollbarColor: '#475569 transparent',
    // WebKit
    msOverflowStyle: 'none',
  } as any;

  return (
    <div
      ref={viewportRef}
      className={className}
      style={{
        position: 'relative',
        overflow: 'auto',
        ...scrollbarStyle,
      }}
    >
      <style>{`
        .${className || 'virtual-viewport'}::-webkit-scrollbar { width: 10px; height: 10px; }
        .${className || 'virtual-viewport'}::-webkit-scrollbar-thumb { background-color: #475569; border-radius: 8px; border: 2px solid transparent; background-clip: padding-box; }
        .${className || 'virtual-viewport'}::-webkit-scrollbar-track { background: transparent; }
      `}</style>
      <div ref={spacerRef} style={{ height: 0 }} />
      <ul
        ref={listRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          margin: 0,
          padding: 0,
          listStyle: 'none',
        }}
      >
        {visibleItems.map((item, i) => renderItem(item, startIndex + i))}
      </ul>
    </div>
  );
}
