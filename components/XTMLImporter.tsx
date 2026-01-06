
import React, { useState } from 'react';

interface XTMLImporterProps {
  onImport: (xtml: string) => void;
  isLoading: boolean;
}

export const XTMLImporter: React.FC<XTMLImporterProps> = ({ onImport, isLoading }) => {
  const [xtml, setXtml] = useState('');

  const handleImport = () => {
    if (!xtml.trim()) return;
    onImport(xtml);
    setXtml('');
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <textarea
          value={xtml}
          onChange={(e) => setXtml(e.target.value)}
          placeholder="여기에 RSS XTML 코드를 붙여넣으세요..."
          className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-gray-300 resize-none transition-all"
        />
        {xtml && (
          <button 
            onClick={() => setXtml('')}
            className="absolute top-2 right-2 text-gray-500 hover:text-white"
          >
            <i className="fas fa-times-circle"></i>
          </button>
        )}
      </div>
      <button
        onClick={handleImport}
        disabled={isLoading || !xtml.trim()}
        className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/10"
      >
        {isLoading ? (
          <i className="fas fa-spinner fa-spin"></i>
        ) : (
          <i className="fas fa-code"></i>
        )}
        XTML 데이터 분석 및 생성
      </button>
    </div>
  );
};
