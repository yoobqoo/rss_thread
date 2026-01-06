
import { GoogleGenAI } from "@google/genai";
import { BlogData } from "../types";

export const generateThreadsPost = async (blogData: BlogData): Promise<string> => {
  // Vite의 define으로 주입된 값을 안전하게 가져옴
  const apiKey = typeof process !== 'undefined' ? process.env.API_KEY : '';
  
  if (!apiKey) {
    throw new Error("API_KEY가 설정되지 않았습니다. Vercel 환경 변수를 확인해주세요.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    역할: 너는 블로그 데이터를 기반으로 'Threads(스레드)' 플랫폼에 최적화된 바이럴 콘텐츠를 생성하는 전문 소셜 미디어 마케터야.
    
    입력 데이터:
    [제목]: ${blogData.title}
    [본문 내용]: ${blogData.content}
    [링크]: ${blogData.link}
    
    출력 가이드라인 (스레드 최적화):
    1. 문체: 친근하고 대화적인 톤을 사용해. (예: ~했어요, ~일까요?, ~해보세요!)
    2. 구조:
       - 첫 문장: 사용자의 스크롤을 멈추게 할 강력한 후킹 문구 (질문이나 놀라운 사실)
       - 본문: 블로그의 핵심 내용을 3~5개의 불렛포인트로 요약 (가독성 중요)
       - 마무리: 독자의 의견을 묻는 질문이나 행동 유도(CTA)
    3. 이모지: 각 문맥에 어울리는 이모지를 적절히 섞어서 시각적으로 지루하지 않게 해줘.
    4. 제한: 스레드 글자수 제한을 고려해 공백 포함 400자 이내로 작성해줘.
    5. 링크: 마지막에 "더 자세한 내용은 아래 링크에서 확인하세요!"라는 문구와 함께 제공된 URL을 첨부해줘.
    
    주의사항:
    - 블로그 내용을 그대로 복사하지 말고, 스레드 유저들이 좋아할 만한 '인사이트' 중심으로 재구성해.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "콘텐츠 생성에 실패했습니다.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
