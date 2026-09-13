import React from 'react';
import { Home, Search, Radio, Library } from 'lucide-react';
import { NavigationTab } from '../../types/music';

interface BottomNavigationProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const tabs: { id: NavigationTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'home', label: 'MyMusic', icon: Home },
    { id: 'radio', label: 'Radio', icon: Radio },
    { id: 'library', label: 'Library', icon: Library },
    { id: 'search', label: 'Search', icon: Search },
  ];

  return (
    <nav
      id="bottom-navigation-bar"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200/80 bg-white/90 pb-safe backdrop-blur-lg dark:border-zinc-800/80 dark:bg-zinc-950/90"
    >
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-1.5 sm:max-w-lg">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = currentTab === id;
          return (
            <button
              key={id}
              id={`nav-tab-${id}`}
              onClick={() => onSelectTab(id)}
              className={`flex min-h-[48px] min-w-[56px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1 transition-colors ${
                isActive
                  ? 'text-[#FA233B]'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                className={`h-5 w-5 transition-transform duration-150 ${
                  isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'
                }`}
              />
              <span
                className={`text-[11px] font-medium tracking-tight ${
                  isActive ? 'font-semibold' : ''
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
