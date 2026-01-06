
import { BlogData } from "../types.ts";

// 유틸리티: 태그 이름만으로 요소 찾기 (네임스페이스 무시)
const getElementText = (parent: Element, tagName: string): string => {
  let el = parent.getElementsByTagName(tagName)[0];
  
  if (!el) {
    const allNodes = parent.querySelectorAll('*');
    for (let i = 0; i < allNodes.length; i++) {
      if (allNodes[i].localName === tagName) {
        el = allNodes[i] as Element;
        break;
      }
    }
  }
  
  return el?.textContent?.trim() || "";
};

const parseXTMLToBlogData = (xtmlText: string): BlogData[] => {
  if (!xtmlText || xtmlText.length < 10) return [];
  
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xtmlText, "text/xml");
  
  const parserError = xmlDoc.querySelector("parsererror");
  if (parserError) {
    // XML 파싱 실패 시 HTML 파서로 재시도 (일부 잘못된 RSS 대응)
    const htmlDoc = parser.parseFromString(xtmlText, "text/html");
    const items = htmlDoc.querySelectorAll("item, entry");
    if (items.length > 0) return parseNodes(Array.from(items));
    throw new Error("올바르지 않은 XML/RSS 형식입니다.");
  }

  const items = xmlDoc.querySelectorAll("item, entry");
  return parseNodes(Array.from(items));
};

const parseNodes = (nodes: Element[]): BlogData[] => {
  const result: BlogData[] = [];

  nodes.forEach((item) => {
    const title = getElementText(item, "title");
    let link = getElementText(item, "link");
    
    // Atom 형식의 link 처리
    if (!link) {
      const linkEl = item.getElementsByTagName("link")[0];
      link = linkEl?.getAttribute("href") || "";
    }

    const pubDate = getElementText(item, "pubDate") || 
                    getElementText(item, "date") || 
                    getElementText(item, "updated") || 
                    getElementText(item, "published") ||
                    new Date().toISOString();

    const content = getElementText(item, "description") || 
                    getElementText(item, "content") || 
                    getElementText(item, "summary") || 
                    "";

    const guid = getElementText(item, "guid") || getElementText(item, "id") || link;

    if (title && link) {
      result.push({ title, content, link, pubDate, guid });
    }
  });

  return result;
};

// 다중 프록시 지원
const PROXIES = [
  (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}&_=${Date.now()}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`
];

export const fetchRSS = async (url: string): Promise<BlogData[]> => {
  let lastError: any = null;

  // 1. 순차적으로 프록시 시도
  for (const getProxyUrl of PROXIES) {
    try {
      const proxyUrl = getProxyUrl(url);
      const response = await fetch(proxyUrl);
      
      if (!response.ok) continue;

      let contents: string = "";
      
      // AllOrigins는 JSON 형태로 반환함
      if (proxyUrl.includes('allorigins')) {
        const data = await response.json();
        contents = data.contents;
      } else {
        // 일반 프록시는 텍스트 그대로 반환
        contents = await response.text();
      }

      if (contents && contents.length > 50) {
        const items = parseXTMLToBlogData(contents);
        if (items.length > 0) return items;
      }
    } catch (e) {
      lastError = e;
      console.warn(`Proxy failed: ${getProxyUrl(url)}`, e);
    }
  }

  // 2. 모든 프록시 실패 시 직접 시도 (최후의 보루)
  try {
    const directRes = await fetch(url);
    if (directRes.ok) {
      const directText = await directRes.text();
      return parseXTMLToBlogData(directText);
    }
  } catch (e) {
    console.error("Direct fetch failed too", e);
  }

  throw lastError || new Error(`모든 경로를 통한 RSS 취득에 실패했습니다: ${url}`);
};

export const parseXTMLString = (xtmlString: string): BlogData[] => {
  return parseXTMLToBlogData(xtmlString);
};
