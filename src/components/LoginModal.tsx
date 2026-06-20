"use client";

import { useState } from "react";
import { login, register } from "@/lib/auth";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: { email: string; displayName: string }) => Promise<void> | void;
}

export default function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (mode === "login") {
        const result = await login(email, password);
        if (result.success && result.user) {
          await onLoginSuccess({
            email: result.user.email,
            displayName: result.user.displayName,
          });
          onClose();
        } else {
          setError(result.error || "로그인 실패");
        }
      } else {
        if (!displayName.trim()) {
          setError("이름을 입력해주세요.");
          return;
        }

        const regResult = await register(email, password, displayName);
        if (regResult.success && regResult.user) {
          await onLoginSuccess({
            email: regResult.user.email,
            displayName: regResult.user.displayName,
          });
          onClose();
        } else {
          setError(regResult.error || "가입 실패");
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-6 text-center">
          <span className="text-4xl">🐣</span>
          <h2 className="text-white font-bold text-xl mt-2">
            {mode === "login" ? "로그인" : "회원가입"}
          </h2>
          <p className="text-white/80 text-sm mt-1">
            {mode === "login" ? "프로젝트를 안전하게 보관해요" : "새 계정을 만들어요"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {mode === "register" && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">이름</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="닉네임"
                disabled={submitting}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              disabled={submitting}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={submitting}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none"
              required
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center bg-red-50 rounded-lg p-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold hover:shadow-lg hover:scale-[1.02] transition-all"
          >
            {submitting ? "처리 중..." : mode === "login" ? "로그인" : "가입하기"}
          </button>

          <div className="text-center">
            <button
              type="button"
              disabled={submitting}
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
              className="text-sm text-amber-600 hover:text-amber-800 font-medium"
            >
              {mode === "login" ? "계정이 없으신가요? 회원가입" : "이미 계정이 있으신가요? 로그인"}
            </button>
          </div>
        </form>

        {/* Close */}
        <div className="px-6 pb-4">
          <button
            onClick={onClose}
            disabled={submitting}
            className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
