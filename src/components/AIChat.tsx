"use client";

import { useEffect, useRef, useState } from "react";

import { RepositoryOption } from "@/lib/github";
import type { Phase } from "@/types/project";
import { streamCopilotChat } from "@/lib/chat-client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIChatProps {
  currentPhase: string;
  level: string;
  completedSteps: number;
  totalSteps: number;
  projectName: string;
  goal: string;
  phases: Phase[];
  repoUrl?: string;
  repository?: RepositoryOption | null;
  githubToken?: string;
}

export default function AIChat({
  currentPhase,
  level,
  completedSteps,
  totalSteps,
  projectName,
  goal,
  phases,
  repoUrl,
  repository,
  githubToken,
}: AIChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((previous) => [...previous, { role: "user", content: userMessage }]);
    setIsLoading(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    const updateAssistantMessage = (content: string) => {
      setMessages((prev) => {
        const next = [...prev];
        for (let idx = next.length - 1; idx >= 0; idx -= 1) {
          if (next[idx].role === "assistant") {
            next[idx] = { ...next[idx], content };
            break;
          }
        }
        return next;
      });
    };

    try {
      const assistantContent = await streamCopilotChat(
        {
          message: userMessage,
          currentPhase,
          level,
          completedSteps,
          totalSteps,
          projectName,
          goal,
          phases,
          repoUrl,
          repositoryFullName: repository?.fullName,
          githubToken,
        },
        updateAssistantMessage
      );
      updateAssistantMessage(assistantContent || "답변을 생성하지 못했어요. 다시 시도해주세요.");
    } catch {
      updateAssistantMessage("⚠️ 오류가 발생했어요. 다시 시도해주세요!");
    } finally {
      setIsLoading(false);
    }
  };

  const retryLast = () => {
    if (messages.length < 2) return;

    const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
    if (!lastUserMessage) return;

    setMessages((previous) => previous.slice(0, -1));
    setInput(lastUserMessage.content);
  };

  const quickPrompts = repository
    ? [
        "이 레포 구조를 요약해줘",
        "핵심 진입 파일이 어디야?",
        "다음으로 개선할 점 3가지만 추천해줘",
      ]
    : [
        "지금 단계에서 뭘 해야 해?",
        "바이브 코딩 프롬프트 추천해줘",
        "막혔는데 어떻게 해야 돼?",
      ];

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-full shadow-xl hover:shadow-2xl hover:scale-110 transition-all flex items-center justify-center text-2xl z-50"
      >
        {isOpen ? "✕" : "🤖"}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
            <h3 className="font-bold">🤖 AI 코딩 어시스턴트</h3>
            <p className="text-xs text-purple-100">현재: {currentPhase} 단계 · AI 제안은 참고용입니다</p>
            {repository && (
              <p className="text-xs text-purple-100 mt-1">
                레포 질문 가능: {repository.fullName}
              </p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 text-sm mt-8">
                <p className="text-3xl mb-2">🐥</p>
                <p>{repository ? "안녕! 선택한 레포 코드에 대해 물어봐!" : "안녕! 바이브 코딩에 대해 물어봐!"}</p>
                <div className="mt-4 space-y-2">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => {
                        setInput(prompt);
                      }}
                      className="block w-full text-left px-3 py-2 bg-purple-50 rounded-lg text-purple-700 text-xs hover:bg-purple-100 transition-colors"
                    >
                      💬 {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[80%]">
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                      message.role === "user"
                        ? "bg-purple-500 text-white rounded-br-md"
                        : "bg-gray-100 text-gray-800 rounded-bl-md"
                    }`}
                  >
                    {message.content}
                  </div>
                  {message.role === "assistant" && index === messages.length - 1 && !isLoading && (
                    <div className="flex gap-1 mt-1">
                      <button
                        onClick={retryLast}
                        className="text-[10px] text-gray-400 hover:text-purple-500 transition-colors"
                      >
                        🔄 다시 답변
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-4 py-2 rounded-2xl rounded-bl-md text-sm text-gray-500">
                  답변 작성 중...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-gray-100">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && sendMessage()}
                placeholder="질문을 입력하세요..."
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-purple-400 focus:ring-1 focus:ring-purple-100 outline-none"
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className="px-4 py-2 bg-purple-500 text-white rounded-xl text-sm font-medium hover:bg-purple-600 disabled:opacity-50 transition-colors"
              >
                전송
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
