
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { FeedManager } from './components/FeedManager.tsx';
import { XTMLImporter } from './components/XTMLImporter.tsx';
import { PostPreview } from './components/PostPreview.tsx';
import { BlogData, RSSFeed, GeneratedPost } from './types.ts';
import { fetchRSS, parseXTMLString } from './services/rssService.ts';
import { generateThreadsPost } from './services/geminiService.ts';

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
      console.error("Failed to parse feeds from localStorage", e);
      return DEFAULT_FEEDS;
    }
  });
  
  const [posts, setPosts] = useState<GeneratedPost[]>(() => {
    try {
      const saved = localStorage.getItem('threads-generated-posts');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to parse posts from localStorage", e);
      return [];
    }
  });

  const processedLinksRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    processedLinksRef.current = new Set(posts.map(p => p.originalLink));
  }, [posts]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');

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

  const processBlogItems = async (items: BlogData[], sourceName: string) => {
    const newItems = items.filter(item => !processedLinksRef.current.has(item.link));
    
    if (newItems.length === 0) {
      return 0;
    }

    let count = 0;
    for (const item of newItems) {
      try {
        if (processedLinksRef.current.has(item.link)) continue;

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
    setStatus('모든 피드 연결 시도 중...');
    
    let totalAdded = 0;
    try {
      const updatedFeeds = [...feeds];
      for (let i = 0; i < updatedFeeds.length; i++) {
        const feed = updatedFeeds[i];
        try {
          setStatus(`${feed.name} 연결 중...`);
          const items = await fetchRSS(feed.url);
          updatedFeeds[i].lastFetched = Date.now();
          const addedCount = await processBlogItems(items, feed.name);
          totalAdded += addedCount;
        } catch (e: any) { 
          console.error(`Feed fetch error for ${feed.name}:`, e);
          setStatus(`${feed.name} 연결 실패`);
          await new Promise(r => setTimeout(r, 1000));
        }
      }
      setFeeds(updatedFeeds);
      setStatus(totalAdded > 0 ? `${totalAdded}개의 새 콘텐츠 생성 완료` : '이미 최신 상태입니다.');
    } catch (err) {
      setStatus('동기화 중 오류 발생');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setStatus(''), 3000);
    }
  }, [feeds, isProcessing]);

  useEffect(() => {
    if (posts.length === 0 && feeds.length > 0) {
      syncAllFeeds();
    }
  }, []);

  const handleXTMLImport = async (xtmlString: string) => {
    setIsProcessing(true);
    setStatus('입력 데이터 분석 중...');
    try {
      const items = parseXTMLString(xtmlString);
      const added = await processBlogItems(items, '직접 입력');
      setStatus(added > 0 ? `${added}개 생성 완료` : '새로운 내용이 없습니다.');
    } catch (e: any) {
      setStatus(`에러: ${e.message}`);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setStatus(''), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-purple-500/30">
      <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <i className="fas fa-layer-group text-white"></i>
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight leading-none mb-1">RSS STRATEGIST</h1>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Agency Intelligence v2.5</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             {status && (
              <span className="hidden sm:inline-flex items-center gap-2 text-purple-400 text-[10px] font-bold px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping"></span>
                {status}
              </span>
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
              <XTMLImporter onImport={handleXTMLImport} isLoading={isProcessing} />
            </section>
          </div>
          
          <div className="p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/10">
            <h4 className="text-[11px] font-black text-indigo-400 mb-2 uppercase">시스템 안내</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed">
               프록시를 통해 중소벤처기업부, 조달청, KOTRA 데이터를 수집합니다. 동기화가 지연될 경우 '새로고침'을 다시 시도해주세요.
            </p>
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
                    className={`px-5 py-2 rounded-xl text-[11px] font-black whitespace-nowrap transition-all border ${
                      selectedDate === date 
                      ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-500/20' 
                      : 'bg-white/5 text-gray-500 border-white/5 hover:border-white/20'
                    }`}
                  >
                    {date === new Date().toISOString().split('T')[0] ? '오늘' : date}
                    <span className="ml-2 opacity-40 font-mono">{groupedPosts[date].length}</span>
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
              <h3 className="text-lg font-bold text-gray-400">
                {isProcessing ? '데이터를 가져오는 중...' : '분석된 공고가 없습니다'}
              </h3>
              <p className="text-gray-600 text-sm mt-2">
                {isProcessing ? '프록시 서버를 통해 정보를 수집하고 있습니다.' : "상단의 '데이터 새로고침' 버튼을 눌러주세요."}
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default App;
