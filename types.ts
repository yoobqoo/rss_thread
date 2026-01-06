
export interface BlogData {
  title: string;
  content: string;
  link: string;
  pubDate?: string;
  guid?: string;
}

export interface RSSFeed {
  id: string;
  url: string;
  name: string;
  lastFetched?: number;
}

export interface GeneratedPost {
  id: string;
  blogTitle: string;
  sourceName: string;
  originalLink: string;
  generatedContent: string;
  originalPubDate: string; // 추가: 원본 공고의 실제 게시일
  timestamp: number; // 생성 시점
}

export enum GenerationStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}
