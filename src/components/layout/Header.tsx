import React from 'react';
import { Music2 } from 'lucide-react';
import { NavigationTab } from '../../types/music';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onOpenProfile: () => void;
  currentNavTab?: NavigationTab;
  isSubView?: boolean;
  subViewTitle?: string;
  onBackToMain?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenProfile,
  currentNavTab = 'home',
  isSubView = false,
  subViewTitle,
}) => {
  const { user } = useAuth();

  return (
    <header
      id="app-header"
      className="sticky top-0 z-30 border-b border-zinc-200/60 bg-white/80 backdrop-blur-xl transition-colors dark:border-zinc-800/60 dark:bg-zinc-950/80"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Left: Brand Identity with Logo and MyMusic */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-[#FA233B] to-[#FF3B56] text-white shadow-xs shadow-red-500/30">
            <Music2 className="h-4.5 w-4.5 stroke-[2.5]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold tracking-tight text-zinc-950 dark:text-white">
              MyMusic
            </span>
            <span className="hidden rounded-md bg-red-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#FA233B] sm:inline-block">
              Lossless
            </span>
          </div>
        </div>

        {/* Right: Profile Avatar */}
        <div className="flex items-center gap-2.5">
          <button
            id="header-profile-btn"
            onClick={onOpenProfile}
            className="group relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-zinc-200 transition-all hover:ring-[#FA233B] dark:ring-zinc-800 dark:hover:ring-[#FA233B]"
            title={`Account & Preferences (${user.name})`}
            aria-label="Open User Account & Preferences"
          >
            {user.avatarUrl && user.avatarUrl.trim() !== '' ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : null}
            <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-xs font-bold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
