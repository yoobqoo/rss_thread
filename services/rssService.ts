
import { BlogData } from "../types";

// 유틸리티: 태그 이름만으로 요소 찾기 (네임스페이스 무시)
const getElementText = (parent: Element, tagName: string): string => {
  // 표준 태그 찾기
  let el = parent.getElementsByTagName(tagName)[0];
  
  // 네임스페이스가 포함된 경우 (예: dc:date) 대응
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

// 공통 파싱 로직
const parseXTMLToBlogData = (xtmlText: string): BlogData[] => {
  if (!xtmlText) return [];
  
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xtmlText, "text/xml");
  
  // 파싱 에러 체크
  const parserError = xmlDoc.querySelector("parsererror");
  if (parserError) {
    // XML이 아닐 경우 HTML로 다시 시도 (일부 RSS가 비표준인 경우 대응)
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
    
    // Atom 형식의 link 처리 (<link href="...">)
    if (!link) {
      const linkEl = item.getElementsByTagName("link")[0];
      link = linkEl?.getAttribute("href") || "";
    }

    // 날짜 처리 (pubDate, date, updated 등 대응)
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

// URL에서 가져오기
export const fetchRSS = async (url: string): Promise<BlogData[]> => {
  // allorigins 프록시 사용 (캐시 방지를 위해 timestamp 추가)
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
    // 특정 기관 URL은 직접 호출 시도 (CORS가 허용되어 있을 수도 있음)
    try {
      const directRes = await fetch(url);
      const directText = await directRes.text();
      return parseXTMLToBlogData(directText);
    } catch (e) {
      throw new Error(`${url} 피드를 가져오는 데 실패했습니다.`);
    }
  }
};

// XTML 문자열 직접 파싱하기
export const parseXTMLString = (xtmlString: string): BlogData[] => {
  return parseXTMLToBlogData(xtmlString);
};
