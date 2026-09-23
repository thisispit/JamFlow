'use client';

import React, { useState, useRef } from 'react';
import { Plus, Link2 } from 'lucide-react';

interface YouTubeInputProps {
  canAdd: boolean;
  onAddTrack: (url: string) => Promise<boolean>;
  className?: string;
  autoFocusRef?: React.RefObject<HTMLInputElement>;
}

const QUICK_CATEGORIES = [
  { label: 'Lo-fi', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk' },
  { label: 'Synthwave', url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY' },
  { label: 'Chillhop', url: 'https://www.youtube.com/watch?v=5yx6BWlEVcY' },
];

export const YouTubeInput: React.FC<YouTubeInputProps> = ({
  canAdd,
  onAddTrack,
  className = '',
  autoFocusRef,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = autoFocusRef || internalRef;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setIsSubmitting(true);
    setInputError(null);
    const success = await onAddTrack(urlInput.trim());
    setIsSubmitting(false);
    if (success) {
      setUrlInput('');
    } else {
      setInputError('Could not load that video. Check the link.');
    }
  };

  const handleQuickAdd = async (url: string) => {
    setIsSubmitting(true);
    setInputError(null);
    const success = await onAddTrack(url);
    setIsSubmitting(false);
    if (!success) {
      setInputError('Could not load that station.');
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Input box */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center gap-2.5 bg-[#12131A] border border-[#272732] rounded-xl px-3.5 py-2.5 focus-within:border-[#8B5CF6] transition-colors">
          <Link2 className="w-4 h-4 text-zinc-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder={canAdd ? 'Paste YouTube link...' : 'Queue locked by host'}
            disabled={!canAdd || isSubmitting}
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none disabled:opacity-40 min-w-0"
          />
          <button
            type="submit"
            disabled={!canAdd || isSubmitting || !urlInput.trim()}
            className="w-7 h-7 rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#D946EF] text-white flex items-center justify-center transition-all disabled:opacity-30 active:scale-95 shrink-0 shadow-[0_0_12px_rgba(139,92,246,0.3)] hover:opacity-95"
            title="Add track"
          >
            {isSubmitting ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </button>
        </div>
        {inputError && (
          <p className="text-xs text-rose-400 mt-1.5 px-1">{inputError}</p>
        )}
      </form>

      {/* Quick categories - clean & secondary */}
      {canAdd && (
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          {QUICK_CATEGORIES.map((cat) => (
            <button
              key={cat.label}
              type="button"
              onClick={() => handleQuickAdd(cat.url)}
              disabled={isSubmitting}
              className="shrink-0 px-2.5 py-1 rounded-lg bg-[#14151E] border border-[#272732] text-zinc-400 hover:text-zinc-200 hover:border-[#8B5CF6]/50 text-xs font-medium transition-all disabled:opacity-30 active:scale-95"
            >
              + {cat.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
