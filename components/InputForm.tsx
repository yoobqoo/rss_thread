
import React, { useState } from 'react';
import { BlogData } from '../types.ts';

interface InputFormProps {
  onGenerate: (data: BlogData) => void;
  isLoading: boolean;
}

export const InputForm: React.FC<InputFormProps> = ({ onGenerate, isLoading }) => {
  const [data, setData] = useState<BlogData>({
    title: '',
    content: '',
    link: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.title || !data.content || !data.link) {
      alert('모든 필드를 입력해주세요!');
      return;
    }
    onGenerate(data);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full max-w-2xl mx-auto">
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-400 uppercase tracking-wider">블로그 제목</label>
        <input
          type="text"
          name="title"
          value={data.title}
          onChange={handleInputChange}
          placeholder="예: AI가 바꾸는 미래 일자리 5가지"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-white"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-400 uppercase tracking-wider">본문 요약 또는 전체 내용</label>
        <textarea
          name="content"
          value={data.content}
          onChange={handleInputChange}
          placeholder="블로그의 핵심 내용을 붙여넣어 주세요."
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 h-40 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-white resize-none"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-400 uppercase tracking-wider">블로그 링크 (URL)</label>
        <input
          type="url"
          name="link"
          value={data.link}
          onChange={handleInputChange}
          placeholder="https://yourblog.com/post-123"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-white"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className={`w-full py-4 rounded-xl font-bold text-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 ${
          isLoading 
          ? 'bg-gray-700 cursor-not-allowed text-gray-400' 
          : 'bg-white text-black hover:bg-gray-200 shadow-lg shadow-white/10'
        }`}
      >
        {isLoading ? (
          <>
            <i className="fas fa-circle-notch fa-spin"></i>
            바이럴 포스트 생성 중...
          </>
        ) : (
          <>
            <i className="fas fa-wand-magic-sparkles"></i>
            스레드 포스트 생성하기
          </>
        )}
      </button>
    </form>
  );
};
