
import React, { useState } from 'react';
import { RSSFeed } from '../types';

interface FeedManagerProps {
  feeds: RSSFeed[];
  onAddFeed: (url: string) => void;
  onRemoveFeed: (id: string) => void;
  onSync: () => void;
  isSyncing: boolean;
}

export const FeedManager: React.FC<FeedManagerProps> = ({ feeds, onAddFeed, onRemoveFeed, onSync, isSyncing }) => {
  const [newUrl, setNewUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl) return;
    onAddFeed(newUrl);
    setNewUrl('');
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="url"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="새로운 RSS URL..."
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-white text-xs transition-all"
        />
        <button
          type="submit"
          className="absolute right-2 top-2 bottom-2 bg-purple-600 text-white px-3 rounded-lg font-bold text-xs hover:bg-purple-500 transition-all"
        >
          <i className="fas fa-plus"></i>
        </button>
      </form>

      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-hide">
        {feeds.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-white/5 rounded-xl">
             <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">No Feeds Active</p>
          </div>
        ) : (
          feeds.map((feed) => (
            <div key={feed.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group">
              <div className="overflow-hidden">
                <p className="text-[11px] font-bold text-gray-300 truncate w-40">{feed.name}</p>
                <p className="text-[9px] text-gray-600 truncate w-40 font-mono">{feed.url}</p>
              </div>
              <button 
                onClick={() => onRemoveFeed(feed.id)}
                className="text-gray-700 hover:text-red-500 transition-colors"
              >
                <i className="fas fa-trash-alt text-[10px]"></i>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
