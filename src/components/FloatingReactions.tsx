'use client';

import React, { useEffect, useState } from 'react';
import { Reaction } from '@/types';

interface FloatingReactionsProps {
  reactions: Reaction[];
}

interface RenderedReaction extends Reaction {
  leftPercent: number;
}

export const FloatingReactions: React.FC<FloatingReactionsProps> = ({ reactions }) => {
  const [renderedList, setRenderedList] = useState<RenderedReaction[]>([]);

  useEffect(() => {
    if (reactions.length === 0) return;

    const latest = reactions[reactions.length - 1];
    const newReaction: RenderedReaction = {
      ...latest,
      leftPercent: 20 + Math.random() * 60, // 20% to 80% screen width
    };

    setRenderedList((prev) => [...prev.slice(-20), newReaction]);

    const timer = setTimeout(() => {
      setRenderedList((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 2800);

    return () => clearTimeout(timer);
  }, [reactions]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {renderedList.map((item) => (
        <div
          key={item.id}
          style={{
            left: `${item.leftPercent}%`,
            bottom: '80px',
          }}
          className="absolute flex flex-col items-center animate-float-up pointer-events-none"
        >
          <span className="text-4xl filter drop-shadow-lg">{item.emoji}</span>
          <span className="text-[10px] text-zinc-300 font-medium px-2 py-0.5 rounded-full bg-zinc-900/80 backdrop-blur border border-zinc-700/50 mt-1 shadow-md">
            {item.username}
          </span>
        </div>
      ))}
    </div>
  );
};
