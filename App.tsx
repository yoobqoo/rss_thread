
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { FeedManager } from './components/FeedManager';
import { XTMLImporter } from './components/XTMLImporter';
import { PostPreview } from './components/PostPreview';
import { BlogData, RSSFeed, GeneratedPost } from './types';
import { fetchRSS, parseXTMLString } from './services/rssService';
import { generateThreadsPost } from './services/geminiService';

const DEFAULT_FEEDS: RSSFeed[] = [
  {
    id: 'mss-smba-310',
    url: 'https://mss.go.kr/rss/smba/board/310.do',
    name: '중소벤처기업부',
    lastFetched: 0
  },
  {
    id: 'pps-kor-00060',
    url: 'https://www.pps.go.kr/kor/rssFeed.do?boardId=00060',
    name: '조달청',
    lastFetched: 0
  },
  {
    id: 'kotra-dream-243',
    url: 'https://dream.kotra.or.kr/kotra/rssList.do?pSetIdx=243',
    name: 'KOTRA',
    lastFetched: 0
  }
];

const App: React.FC = () => {
  const [feeds, setFeeds] = useState<RSSFeed[]>(() => {
    try {
      const saved = localStorage.getItem('threads-rss-feeds');
      const parsed = saved ? JSON.parse(saved) : [];
      return parsed.length === 0 ? DEFAULT_FEEDS : parsed;
    } catch (e) {
      return DEFAULT_FEEDS;
    }
  });
  
  const [posts, setPosts] = useState<GeneratedPost[]>(() => {
    try {
      const saved = localStorage.getItem('threads-generated-posts');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const processedLinksRef = useRef<Set<string>>(new Set());

  const apiKey = process.env.API_KEY;
  const hasApiKey = !!apiKey && apiKey !== '';

  useEffect(() => {
    processedLinksRef.current = new Set(posts.map(p => p.originalLink));
  }, [posts]);

  const groupedPosts = useMemo(() => {
    const groups: Record<string, GeneratedPost[]> = {};
    posts.forEach(post => {
      const date = new Date(post.timestamp).toISOString().split('T')[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push(post);
    });
    return Object.fromEntries(
      Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
    );
  }, [posts]);

  const availableDates = useMemo(() => Object.keys(groupedPosts), [groupedPosts]);

  useEffect(() => {
    if (availableDates.length > 0 && !selectedDate) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates, selectedDate]);

  useEffect(() => {
    localStorage.setItem('threads-rss-feeds', JSON.stringify(feeds));
  }, [feeds]);

  useEffect(() => {
    localStorage.setItem('threads-generated-posts', JSON.stringify(posts));
  }, [posts]);

  const clearHistory = () => {
    if (window.confirm('모든 생성된 포스트 기록을 삭제하시겠습니까? (RSS 데이터 재동기화가 가능해집니다)')) {
      setPosts([]);
      processedLinksRef.current = new Set();
      localStorage.removeItem('threads-generated-posts');
      setStatus('기록 삭제 완료');
      setTimeout(() => setStatus(''), 2000);
    }
  };

  const processBlogItems = async (items: BlogData[], sourceName: string) => {
    if (!hasApiKey) {
      setStatus('에러: API Key 누락');
      return 0;
    }

    const newItems = items.filter(item => !processedLinksRef.current.has(item.link));
    
    if (newItems.length === 0) {
      console.log(`${sourceName}: 새로운 항목 없음`);
      return 0;
    }

    let count = 0;
    for (const item of newItems) {
      try {
        setStatus(`${sourceName}: 분석 중... (${count + 1}/${newItems.length})`);
        const content = await generateThreadsPost(item);
        
        const newPost: GeneratedPost = {
          id: Math.random().toString(36).substr(2, 9),
          blogTitle: item.title,
          sourceName: sourceName,
          originalLink: item.link,
          generatedContent: content,
          originalPubDate: item.pubDate || new Date().toISOString(),
          timestamp: Date.now()
        };
        
        setPosts(prev => [newPost, ...prev]);
        processedLinksRef.current.add(item.link);
        count++;
      } catch (e) {
        console.error("AI Generation Error", e);
      }
    }
    return count;
  };

  const syncAllFeeds = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setStatus('RSS 확인 중...');
    
    let totalAdded = 0;
    let totalFound = 0;
    let errors = 0;

    try {
      const updatedFeeds = [...feeds];
      for (let i = 0; i < updatedFeeds.length; i++) {
        const feed = updatedFeeds[i];
        try {
          setStatus(`${feed.name} 연결 중...`);
          const items = await fetchRSS(feed.url);
          totalFound += items.length;
          updatedFeeds[i].lastFetched = Date.now();
          const addedCount = await processBlogItems(items, feed.name);
          totalAdded += addedCount;
        } catch (e) { 
          console.error(`Feed Error [${feed.name}]:`, e);
          errors++;
          setStatus(`${feed.name} 연결 실패 (프록시 확인 필요)`);
          await new Promise(r => setTimeout(r, 1500));
        }
      }
      setFeeds(updatedFeeds);
      
      if (totalAdded > 0) {
        setStatus(`${totalAdded}개의 새 포스트 생성!`);
      } else if (errors > 0) {
        setStatus(`일부 피드 연결 실패 (콘솔 확인)`);
      } else {
        setStatus(totalFound > 0 ? `새로운 소식이 없습니다.` : '피드 데이터를 찾을 수 없음');
      }
    } catch (err) {
      setStatus('동기화 처리 오류');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setStatus(''), 5000);
    }
  }, [feeds, isProcessing, hasApiKey]);

  if (!hasApiKey) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-6 animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto text-red-500 text-3xl shadow-2xl shadow-red-500/20">
            <i className="fas fa-key-skeleton"></i>
          </div>
          <h1 className="text-2xl font-black text-white">환경 변수 설정 오류</h1>
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl text-left space-y-4">
            <p className="text-gray-300 text-sm leading-relaxed">
              Vercel 대시보드에서 다음 이름으로 환경 변수를 등록해야 합니다:
            </p>
            <div className="flex items-center justify-between bg-black p-3 rounded-xl border border-red-500/30">
              <span className="text-red-400 font-mono font-bold">Variable Name:</span>
              <code className="text-white font-mono font-black px-2 py-1 bg-white/10 rounded">API_KEY</code>
            </div>
            <p className="text-gray-500 text-[11px]">
              * <span className="text-white font-bold">GEMINI_API_KEY</span>가 아닙니다. 반드시 <span className="text-white font-bold">API_KEY</span>로 입력해주세요.
            </p>
          </div>
          <div className="pt-4 flex flex-col gap-3">
            <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="bg-white text-black px-8 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all flex items-center justify-center gap-2">
              <i className="fas fa-external-link-alt"></i>
              Vercel 대시보드 열기
            </a>
            <p className="text-gray-500 text-[11px]">변수 수정 후 반드시 <strong>Redeploy</strong>를 수행하세요.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-purple-500/30">
      <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <i className="fas fa-layer-group text-white"></i>
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight leading-none mb-1 uppercase">RSS Strategist</h1>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Viral Content Lab</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             {status && (
              <div className="hidden sm:flex items-center gap-2 text-purple-400 text-[10px] font-bold px-4 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full animate-in fade-in slide-in-from-top-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
                {status}
              </div>
            )}
            <button 
              onClick={syncAllFeeds}
              disabled={isProcessing}
              className="bg-white text-black px-5 py-2 rounded-xl text-xs font-black hover:bg-gray-200 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <i className={`fas fa-sync-alt ${isProcessing ? 'fa-spin' : ''}`}></i>
              {isProcessing ? '동기화 중...' : '데이터 새로고침'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid md:grid-cols-12 gap-8">
        <aside className="md:col-span-4 space-y-6">
          <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-6">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[11px] font-black text-gray-500 uppercase tracking-widest">
                  구독 기관 피드
                </h2>
                <span className="text-[10px] text-gray-700 bg-white/5 px-2 py-0.5 rounded font-mono">{feeds.length}</span>
              </div>
              <FeedManager 
                feeds={feeds} 
                onAddFeed={(url) => setFeeds([...feeds, { id: Math.random().toString(36).substr(2, 9), url, name: '새 피드', lastFetched: Date.now() }])} 
                onRemoveFeed={(id) => setFeeds(feeds.filter(f => f.id !== id))} 
                onSync={syncAllFeeds}
                isSyncing={isProcessing}
              />
            </section>

            <div className="h-px bg-white/5"></div>

            <section>
              <h2 className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-4">
                XTML 직접 입력
              </h2>
              <XTMLImporter onImport={(xtml) => {
                const items = parseXTMLString(xtml);
                processBlogItems(items, '직접 입력');
              }} isLoading={isProcessing} />
            </section>

            <div className="h-px bg-white/5"></div>

            <button 
              onClick={clearHistory}
              className="w-full py-3 rounded-xl text-[10px] font-black text-gray-500 hover:text-red-400 hover:bg-red-500/5 transition-all border border-transparent hover:border-red-500/20 flex items-center justify-center gap-2"
            >
              <i className="fas fa-trash-alt"></i>
              생성 기록 초기화
            </button>
          </div>
        </aside>

        <section className="md:col-span-8">
          {availableDates.length > 0 ? (
            <div className="space-y-6">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {availableDates.map(date => (
                  <button
                    key={date}
                    onClick={() => setSelectedDate(date)}
                    className={`px-5 py-2 rounded-xl text-[11px] font-black transition-all border shrink-0 ${
                      selectedDate === date 
                      ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-500/20' 
                      : 'bg-white/5 text-gray-500 border-white/5 hover:border-white/20'
                    }`}
                  >
                    {date} <span className="ml-2 opacity-40 font-mono">{groupedPosts[date].length}</span>
                  </button>
                ))}
              </div>

              <div className="grid gap-6">
                {groupedPosts[selectedDate]?.map(post => (
                  <PostPreview 
                    key={post.id} 
                    content={post.generatedContent} 
                    source={post.sourceName}
                    blogTitle={post.blogTitle}
                    originalPubDate={post.originalPubDate}
                    timestamp={post.timestamp}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 text-center bg-[#0d0d0d] rounded-3xl border border-dashed border-white/10">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-2xl text-gray-700 mb-6">
                <i className={`fas ${isProcessing ? 'fa-spinner fa-spin' : 'fa-satellite-dish'} animate-pulse`}></i>
              </div>
              <h3 className="text-lg font-bold text-gray-400">데이터를 기다리는 중...</h3>
              <p className="text-gray-600 text-sm mt-2">상단의 '데이터 새로고침' 버튼을 눌러 피드를 동기화하세요.</p>
              <p className="text-gray-800 text-[10px] mt-4 max-w-xs uppercase font-black tracking-widest">
                Tip: 데이터가 안 나온다면 '생성 기록 초기화'를 눌러보세요.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default App;
