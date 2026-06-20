"use client";

interface HeaderProps {
  onLogoClick?: () => void;
  onLoginClick?: () => void;
  isLoggedIn?: boolean;
  displayName?: string | null;
  onLogout?: () => void;
  onMyPage?: () => void;
}

export default function Header({ onLogoClick, onLoginClick, isLoggedIn, displayName, onLogout, onMyPage }: HeaderProps) {
  return (
    <header className="w-full px-6 py-4 flex items-center justify-between bg-white/80 backdrop-blur-sm border-b border-amber-100 sticky top-0 z-50">
      <button onClick={onLogoClick} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <span className="text-2xl">🐣</span>
        <h1 className="text-xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
          VibePilot
        </h1>
      </button>
      {isLoggedIn ? (
        <div className="flex items-center gap-3">
          {onMyPage && (
            <button
              onClick={onMyPage}
              className="px-3 py-1.5 text-sm text-amber-700 bg-amber-50 rounded-full font-medium hover:bg-amber-100 transition-colors"
            >
              📋 마이페이지
            </button>
          )}
          <span className="text-sm text-gray-600 font-medium">👤 {displayName}</span>
          <button
            onClick={onLogout}
            className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium hover:bg-gray-200 transition-colors"
          >
            로그아웃
          </button>
        </div>
      ) : (
        <button
          onClick={onLoginClick}
          className="px-4 py-2 bg-gray-900 text-white rounded-full text-sm font-medium hover:bg-gray-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          로그인
        </button>
      )}
    </header>
  );
}
