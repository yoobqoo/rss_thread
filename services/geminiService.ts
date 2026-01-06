
import { GoogleGenAI, Type } from "@google/genai";
import { BlogData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateThreadsPost = async (blogData: BlogData): Promise<string> => {
  const prompt = `
    역할: 너는 블로그 데이터를 기반으로 'Threads(스레드)' 플랫폼에 최적화된 바이럴 콘텐츠를 생성하는 전문 소셜 미디어 마케터야.
    
    입력 데이터:
    [제목]: ${blogData.title}
    [본문 내용]: ${blogData.content}
    [링크]: ${blogData.link}
    
    출력 가이드라인:
    1. 문체: 친근하고 대화적인 톤 (~했어요, ~일까요?, ~해보세요!).
    2. 구조:
       - 첫 문장: 사용자의 스크롤을 멈추게 할 강력한 후킹 문구.
       - 본문: 블로그 핵심 내용을 3~5개의 불렛포인트로 요약.
       - 마무리: 독자의 의견을 묻는 질문이나 행동 유도(CTA).
    3. 이모지: 문맥에 어울리는 이모지를 적절히 섞어서 작성.
    4. 제한: 공백 포함 400자 이내.
    5. 링크: 마지막에 "더 자세한 내용은 아래 링크에서 확인하세요!"라는 문구와 함께 제공된 URL(${blogData.link})을 반드시 포함.
    
    주의사항:
    - 블로그 내용을 그대로 복사하지 말고, 스레드 유저들이 좋아할 만한 '인사이트' 중심으로 재구성할 것.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
      }
    });

    return response.text || "콘텐츠를 생성하는 데 실패했습니다.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("AI 요청 중 오류가 발생했습니다.");
  }
};
