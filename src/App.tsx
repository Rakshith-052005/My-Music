import React, { useState, useEffect } from 'react';
import { ActiveTab, NavigationTab } from './types/music';
import { AuthProvider } from './context/AuthContext';
import { LibraryProvider } from './context/LibraryContext';
import { PlayerProvider } from './context/PlayerContext';
import { Header } from './components/layout/Header';
import { BottomNavigation } from './components/layout/BottomNavigation';
import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { RadioPage } from './pages/RadioPage';
import { LibraryPage } from './pages/LibraryPage';
import { ArtistPage } from './pages/ArtistPage';
import { AlbumPage } from './pages/AlbumPage';
import { PlaylistPage } from './pages/PlaylistPage';
import { MiniPlayer } from './components/player/MiniPlayer';
import { FullPlayer } from './components/player/FullPlayer';
import { QueueModal } from './components/player/QueueModal';
import { ProfileModal } from './components/modals/ProfileModal';
import { VideoPlayerModal } from './components/modals/VideoPlayerModal';
import { handleSpotifyCallback } from './services/spotifyService';

import { Album } from './types/music';

interface ViewState {
  type: 'main' | 'album' | 'artist' | 'playlist';
  id?: string;
  name?: string;
  albumHint?: Album;
}

function MainApp() {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('home');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [viewState, setViewState] = useState<ViewState>({ type: 'main' });
  const [openSpotifyModalOnCallback, setOpenSpotifyModalOnCallback] = useState(false);

  // Handle Spotify OAuth Callback Redirect
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const search = window.location.search;
    const pathname = window.location.pathname;

    if (search.includes('code=') || pathname.includes('/callback')) {
      const params = new URLSearchParams(search);
      const code = params.get('code');
      const state = params.get('state');

      if (code) {
        // Clean up URL bar immediately
        const cleanPath = pathname.replace(/\/callback\/?/, '/') || '/';
        window.history.replaceState({}, document.title, cleanPath);

        handleSpotifyCallback(code, state || '')
          .then(() => {
            setCurrentTab('library');
            setOpenSpotifyModalOnCallback(true);
          })
          .catch((err) => {
            console.error('Spotify Callback Exchange Error:', err);
            setCurrentTab('library');
            setOpenSpotifyModalOnCallback(true);
          });
      }
    }
  }, []);

  // Navigation handlers
  const handleSelectTab = (tab: NavigationTab) => {
    setCurrentTab(tab);
    setViewState({ type: 'main' });
  };

  const handleOpenAlbum = (albumId: string, albumHint?: Album) => {
    setViewState({ type: 'album', id: albumId, albumHint });
  };

  const handleOpenArtist = (artistId: string, artistName: string) => {
    setViewState({ type: 'artist', id: artistId, name: artistName });
  };

  const handleOpenPlaylist = (playlistId: string) => {
    setViewState({ type: 'playlist', id: playlistId });
  };

  const handleBackToMain = () => {
    setViewState({ type: 'main' });
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 selection:bg-red-500/20 dark:bg-zinc-950 dark:text-zinc-50">
      {/* Top Header */}
      <Header
        onOpenProfile={() => setIsProfileOpen(true)}
        currentNavTab={currentTab}
        isSubView={viewState.type !== 'main'}
        subViewTitle={
          viewState.type === 'album'
            ? 'Album'
            : viewState.type === 'artist'
            ? viewState.name || 'Artist'
            : viewState.type === 'playlist'
            ? 'Playlist'
            : undefined
        }
        onBackToMain={handleBackToMain}
      />

      {/* Main Content View Switcher */}
      <main className="mx-auto max-w-5xl">
        {viewState.type === 'album' && viewState.id ? (
          <AlbumPage
            albumId={viewState.id}
            albumHint={viewState.albumHint}
            onBack={handleBackToMain}
            onOpenArtist={handleOpenArtist}
          />
        ) : viewState.type === 'artist' && (viewState.id || viewState.name) ? (
          <ArtistPage
            artistId={viewState.id || viewState.name || ''}
            artistName={viewState.name}
            onBack={handleBackToMain}
            onOpenAlbum={handleOpenAlbum}
          />
        ) : viewState.type === 'playlist' && viewState.id ? (
          <PlaylistPage
            playlistId={viewState.id}
            onBack={handleBackToMain}
            onOpenArtist={handleOpenArtist}
          />
        ) : (
          <>
            {currentTab === 'home' && (
              <HomePage
                activeTab="all"
                onOpenAlbum={handleOpenAlbum}
                onOpenArtist={handleOpenArtist}
                onOpenPlaylist={handleOpenPlaylist}
              />
            )}
            {currentTab === 'search' && (
              <SearchPage
                onOpenAlbum={handleOpenAlbum}
                onOpenArtist={handleOpenArtist}
                onOpenPlaylist={handleOpenPlaylist}
              />
            )}
            {currentTab === 'radio' && <RadioPage />}
            {currentTab === 'library' && (
              <LibraryPage
                onOpenArtist={handleOpenArtist}
                onOpenPlaylist={handleOpenPlaylist}
                openSpotifyModalDirectly={openSpotifyModalOnCallback}
              />
            )}
          </>
        )}
      </main>

      {/* Mini Player */}
      <MiniPlayer />

      {/* Full Player Overlay */}
      <FullPlayer onOpenArtist={handleOpenArtist} />

      {/* Queue Modal */}
      <QueueModal />

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      {/* Music Video Player Modal */}
      <VideoPlayerModal />

      {/* Bottom Navigation */}
      <BottomNavigation
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LibraryProvider>
        <PlayerProvider>
          <MainApp />
        </PlayerProvider>
      </LibraryProvider>
    </AuthProvider>
  );
}
