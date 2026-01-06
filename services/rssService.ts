
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
  if (!xtmlText) return [];
  
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xtmlText, "text/xml");
  
  const parserError = xmlDoc.querySelector("parsererror");
  if (parserError) {
    const htmlDoc = parser.parseFromString(xtmlText, "text/html");
    const items = htmlDoc.querySelectorAll("item, entry");
    if (items.length > 0) return parseNodes(Array.from(items));
    throw new Error("올바르지 않은 데이터 형식입니다.");
  }

  const items = xmlDoc.querySelectorAll("item, entry");
  return parseNodes(Array.from(items));
};

const parseNodes = (nodes: Element[]): BlogData[] => {
  const result: BlogData[] = [];

  nodes.forEach((item) => {
    const title = getElementText(item, "title");
    let link = getElementText(item, "link");
    
    if (!link) {
      const linkEl = item.getElementsByTagName("link")[0];
      link = linkEl?.getAttribute("href") || "";
    }

    const pubDate = getElementText(item, "pubDate") || 
                    getElementText(item, "date") || 
                    getElementText(item, "updated") || 
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

export const fetchRSS = async (url: string): Promise<BlogData[]> => {
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}&_=${Date.now()}`;
  
  try {
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error("프록시 서버 응답 오류");
    
    const data = await response.json();
    if (!data || !data.contents) {
      throw new Error("피드 내용이 비어있습니다.");
    }
    
    return parseXTMLToBlogData(data.contents);
  } catch (error) {
    console.error("RSS Fetch Error:", error);
    try {
      const directRes = await fetch(url);
      const directText = await directRes.text();
      return parseXTMLToBlogData(directText);
    } catch (e) {
      throw new Error(`${url} 피드를 가져오는 데 실패했습니다.`);
    }
  }
};

export const parseXTMLString = (xtmlString: string): BlogData[] => {
  return parseXTMLToBlogData(xtmlString);
};
