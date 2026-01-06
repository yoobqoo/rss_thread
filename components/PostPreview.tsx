
import React, { useState } from 'react';

interface PostPreviewProps {
  content: string;
  source: string;
  blogTitle: string;
  originalPubDate: string;
  timestamp: number;
}

export const PostPreview: React.FC<PostPreviewProps> = ({ 
  content, 
  source, 
  blogTitle, 
  originalPubDate,
  timestamp 
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatOriginalDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      
      const weeks = ['일', '월', '화', '수', '목', '금', '토'];
      return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${weeks[date.getDay()]}) ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-[#111111] rounded-2xl border border-white/10 overflow-hidden hover:border-purple-500/40 transition-all shadow-xl shadow-black/40">
        {/* Header Section */}
        <div className="px-6 py-4 bg-white/5 border-b border-white/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 bg-indigo-600 text-[9px] font-black rounded text-white uppercase tracking-wider">
                  {source}
                </span>
                <span className="text-[10px] text-gray-500 font-bold flex items-center gap-1.5">
                  <i className="far fa-clock"></i>
                  원문 게시: {formatOriginalDate(originalPubDate)}
                </span>
              </div>
              <h3 className="text-[13px] font-bold text-gray-200 truncate leading-snug">
                {blogTitle}
              </h3>
            </div>
            
            <button 
              onClick={handleCopy}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black transition-all shrink-0 ${
                copied 
                ? 'bg-green-600 text-white' 
                : 'bg-white text-black hover:bg-gray-200'
              }`}
            >
              {copied ? <i className="fas fa-check"></i> : <i className="fas fa-copy"></i>}
              {copied ? '복사됨' : '본문 복사'}
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6">
          <div className="text-[15px] leading-relaxed text-gray-300 whitespace-pre-wrap font-medium">
            {content}
          </div>
        </div>

        {/* Footer Info */}
        <div className="px-6 py-2.5 bg-black/40 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-[9px] font-bold text-gray-600 uppercase tracking-tighter">
               Generated {new Date(timestamp).toLocaleTimeString()}
            </span>
          </div>
          <div className="flex items-center gap-1">
             <div className="w-1.5 h-1.5 rounded-full bg-green-500/30"></div>
             <span className="text-[9px] font-bold text-gray-700 font-mono">SECURE_CONTENT_TRANSFORMED</span>
          </div>
        </div>
      </div>
    </div>
  );
};
