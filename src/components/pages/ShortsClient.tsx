/* ============================================
   Shorts – Vertical Trailer Feed
   ============================================ */

'use client';

import { toTmdbMediaType } from '@/lib/mediaType';
import { discover, getGenres, getTrending, getVideos } from '@/lib/tmdb';
import { cn } from '@/lib/utils';
import { useBlockedContentStore } from '@/stores/blockedContent';
import { useSettingsStore } from '@/stores/settings';
import { useWatchlistStore } from '@/stores/watchlist';
import type { Genre, MediaItem } from '@/types';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  Info,
  Loader2,
  Pause,
  Play,
  SlidersHorizontal,
  Star,
  Volume2,
  VolumeX,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type FeedFilter = 'all' | 'movie' | 'tv';

interface ShortItem {
  media: MediaItem;
  trailerKey: string;
}

/* ---- YouTube iframe command helper (enablejsapi) ---- */
function ytCommand(iframe: HTMLIFrameElement | null, func: string, args: unknown[] = []) {
  iframe?.contentWindow?.postMessage(
    JSON.stringify({ event: 'command', func, args }),
    'https://www.youtube-nocookie.com',
  );
}

function pickTrailerKey(videos: { key: string; site: string; type: string }[]): string | null {
  const yt = videos.filter((v) => v.site === 'YouTube' && v.key);
  const trailer = yt.find((v) => v.type === 'Trailer') || yt.find((v) => v.type === 'Teaser');
  return trailer?.key || null;
}

/* ============================================
   Single Short Card
   ============================================ */
function ShortCard({
  item,
  isActive,
  isMuted,
  onToggleMute,
}: {
  item: ShortItem;
  isActive: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
}) {
  const { media, trailerKey } = item;
  const [isPlaying, setIsPlaying] = useState(true);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { items: watchlistItems, addItem, removeItem } = useWatchlistStore();
  const watchlistEntry = watchlistItems.find(
    (i) => i.tmdbId === media.tmdbId && i.mediaType === media.mediaType && !i.hidden,
  );
  const inWatchlist = Boolean(watchlistEntry);

  // Reset when card becomes inactive (iframe unmounts)
  useEffect(() => {
    if (!isActive) {
      setIsPlaying(true);
      setIframeLoaded(false);
    }
  }, [isActive]);

  // Sync mute state to the player
  useEffect(() => {
    if (!isActive || !iframeLoaded) return;
    ytCommand(iframeRef.current, isMuted ? 'mute' : 'unMute');
  }, [isMuted, isActive, iframeLoaded]);

  const togglePlay = () => {
    if (!isActive) return;
    ytCommand(iframeRef.current, isPlaying ? 'pauseVideo' : 'playVideo');
    setIsPlaying((p) => !p);
  };

  const toggleWatchlist = () => {
    if (watchlistEntry) {
      removeItem(watchlistEntry.id);
    } else {
      addItem({
        mediaType: media.mediaType,
        tmdbId: media.tmdbId,
        title: media.title,
        posterPath: media.posterPath,
        status: 'Planned',
      });
    }
  };

  const detailsHref =
    media.mediaType === 'movie' ? `/movie/${media.tmdbId}` : `/show/${media.tmdbId}`;
  const watchHref = `/watch/${media.mediaType}/${media.tmdbId}`;

  const embedSrc = `https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&playsinline=1&enablejsapi=1&iv_load_policy=3&fs=0&disablekb=1&loop=1&playlist=${trailerKey}`;

  const backdrop = media.backdropPath
    ? `https://image.tmdb.org/t/p/w1280${media.backdropPath}`
    : media.posterPath
      ? `https://image.tmdb.org/t/p/w780${media.posterPath}`
      : null;

  return (
    <section className="relative h-full w-full shrink-0 snap-start snap-always overflow-hidden bg-black">
      {/* Backdrop layer (always present, shown until iframe is ready) */}
      {backdrop && (
        <div
          className={cn(
            'absolute inset-0 bg-cover bg-center transition-opacity duration-700',
            isActive && iframeLoaded ? 'opacity-0' : 'opacity-60',
          )}
          style={{ backgroundImage: `url(${backdrop})` }}
          aria-hidden="true"
        />
      )}

      {/* Trailer video – oversized & cropped so no YouTube chrome is visible */}
      {isActive && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <iframe
            ref={iframeRef}
            src={embedSrc}
            title={`${media.title} trailer`}
            allow="autoplay; encrypted-media"
            onLoad={() => setIframeLoaded(true)}
            className={cn(
              'pointer-events-none absolute left-1/2 top-1/2 aspect-video h-[300%] max-h-none w-auto -translate-x-1/2 -translate-y-1/2 scale-[1.02] transition-opacity duration-700 sm:h-auto sm:min-h-[130%] sm:w-[140%] sm:min-w-full',
              iframeLoaded ? 'opacity-100' : 'opacity-0',
            )}
          />
        </div>
      )}

      {/* Gradient scrims */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/10 to-black/60" />

      {/* Tap-to-play/pause layer */}
      <button
        type="button"
        onClick={togglePlay}
        className="absolute inset-0 z-[1] h-full w-full cursor-default outline-none"
        aria-label={isPlaying ? 'Pause trailer' : 'Play trailer'}
        tabIndex={-1}
      />

      {/* Center play indicator when paused */}
      <AnimatePresence>
        {isActive && !isPlaying && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="pointer-events-none absolute left-1/2 top-1/2 z-[2] -translate-x-1/2 -translate-y-1/2"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-black/60 backdrop-blur-xl">
              <Play className="ml-1 h-9 w-9 fill-white text-white" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right action rail */}
      <div className="absolute bottom-28 right-3 z-[2] flex flex-col items-center gap-3 sm:right-5">
        <button
          type="button"
          onClick={togglePlay}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white/80 backdrop-blur-xl transition-all hover:scale-110 hover:text-white"
          aria-label={isPlaying ? 'Pause trailer' : 'Play trailer'}
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
        </button>
        <button
          type="button"
          onClick={onToggleMute}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white/80 backdrop-blur-xl transition-all hover:scale-110 hover:text-white"
          aria-label={isMuted ? 'Unmute trailer' : 'Mute trailer'}
        >
          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
        <button
          type="button"
          onClick={toggleWatchlist}
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-xl transition-all hover:scale-110',
            inWatchlist
              ? 'bg-accent-muted text-accent shadow-[0_0_14px_var(--accent-glow)]'
              : 'bg-black/50 text-white/80 hover:text-white',
          )}
          aria-label={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
        >
          {inWatchlist ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
        </button>
        <Link
          href={detailsHref}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white/80 backdrop-blur-xl transition-all hover:scale-110 hover:text-white"
          aria-label={`View details for ${media.title}`}
        >
          <Info className="h-5 w-5" />
        </Link>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-16 z-[2] p-4 pb-6 sm:p-6 sm:pb-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-accent-glow bg-accent-muted px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-accent">
            {media.mediaType === 'movie' ? 'Movie' : 'TV Show'}
          </span>
          {media.releaseYear > 0 && (
            <span className="text-xs font-bold text-white/40">{media.releaseYear}</span>
          )}
          {media.rating > 0 && (
            <span className="flex items-center gap-1 text-xs font-black text-yellow-500">
              <Star className="h-3 w-3 fill-current" />
              {media.rating.toFixed(1)}
            </span>
          )}
        </div>
        <h2 className="mt-2 text-balance text-xl font-extrabold leading-tight text-white sm:text-2xl">
          {media.title}
        </h2>
        {media.overview && (
          <p className="mt-1.5 line-clamp-2 max-w-xl text-sm leading-relaxed text-white/50">
            {media.overview}
          </p>
        )}
        <div className="mt-4 flex items-center gap-2">
          <Link
            href={watchHref}
            className="hover:bg-accent/20 flex items-center gap-1.5 rounded-full border border-accent-glow bg-accent-muted px-5 py-2.5 text-[11px] font-black uppercase tracking-wider text-accent transition-all"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            Watch Now
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ============================================
   Shorts Feed
   ============================================ */
export function ShortsClient() {
  const [shorts, setShorts] = useState<ShortItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<FeedFilter>('all');
  const [genreFilter, setGenreFilter] = useState<Genre | null>(null);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [isGenreOpen, setIsGenreOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const pageRef = useRef(1);
  const fetchingRef = useRef(false);
  const sessionRef = useRef(0);

  const { isBlocked } = useBlockedContentStore();
  const { glassEffect } = useSettingsStore((s) => s.settings);

  useEffect(() => setMounted(true), []);

  /* ---- Genres (movie + tv merged, deduped by name) ---- */
  useEffect(() => {
    let cancelled = false;
    Promise.all([getGenres('movie'), getGenres('tv')])
      .then(([movieGenres, tvGenres]) => {
        if (cancelled) return;
        const byName = new Map<string, Genre>();
        [...movieGenres, ...tvGenres].forEach((g) => {
          if (!byName.has(g.name)) byName.set(g.name, g);
        });
        setGenres([...byName.values()].sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---- Fetch candidate media for the current filters ---- */
  const fetchCandidates = useCallback(
    async (page: number): Promise<MediaItem[]> => {
      const types: ('movie' | 'tv')[] =
        typeFilter === 'all' ? ['movie', 'tv'] : [typeFilter === 'tv' ? 'tv' : 'movie'];

      if (genreFilter) {
        const lists = await Promise.all(
          types.map((t) =>
            discover(t, {
              with_genres: String(genreFilter.id),
              page: String(page),
              sort_by: 'popularity.desc',
            }).catch(() => [] as MediaItem[]),
          ),
        );
        // Interleave movie/tv results
        const merged: MediaItem[] = [];
        const max = Math.max(...lists.map((l) => l.length));
        for (let i = 0; i < max; i++) {
          for (const list of lists) if (list[i]) merged.push(list[i]);
        }
        return merged;
      }

      return getTrending(typeFilter, 'week', page).catch(() => [] as MediaItem[]);
    },
    [typeFilter, genreFilter],
  );

  /* ---- Fill the feed with items that have trailers, no repeats ---- */
  const fillFeed = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    const session = sessionRef.current;
    setIsLoading(true);

    try {
      let added = 0;
      let attempts = 0;

      while (added < 4 && attempts < 6) {
        attempts++;
        const candidates = await fetchCandidates(pageRef.current);
        pageRef.current += 1;
        if (session !== sessionRef.current) return;
        if (candidates.length === 0) break;

        const fresh = candidates
          .filter((m) => m.backdropPath || m.posterPath)
          .filter((m) => !isBlocked(m.tmdbId, m.mediaType))
          .filter((m) => {
            const key = `${m.mediaType}-${m.tmdbId}`;
            if (seenRef.current.has(key)) return false;
            seenRef.current.add(key);
            return true;
          })
          .slice(0, 10);

        const withTrailers = await Promise.all(
          fresh.map(async (m) => {
            try {
              const videos = await getVideos(toTmdbMediaType(m.mediaType), m.tmdbId);
              const trailerKey = pickTrailerKey(videos);
              return trailerKey ? { media: m, trailerKey } : null;
            } catch {
              return null;
            }
          }),
        );
        if (session !== sessionRef.current) return;

        const valid = withTrailers.filter((s): s is ShortItem => s !== null);
        if (valid.length > 0) {
          added += valid.length;
          setShorts((prev) => [...prev, ...valid]);
        }
      }
    } finally {
      if (session === sessionRef.current) setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [fetchCandidates, isBlocked]);

  /* ---- Reset feed on filter change ---- */
  useEffect(() => {
    sessionRef.current += 1;
    fetchingRef.current = false;
    seenRef.current = new Set();
    pageRef.current = 1;
    setShorts([]);
    setActiveIndex(0);
    containerRef.current?.scrollTo({ top: 0 });
    void fillFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, genreFilter]);

  /* ---- Track active card via scroll position ---- */
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el || el.clientHeight === 0) return;
    const index = Math.round(el.scrollTop / el.clientHeight);
    setActiveIndex((prev) => (prev === index ? prev : index));
  }, []);

  /* ---- Infinite: fetch more when near the end ---- */
  useEffect(() => {
    if (shorts.length > 0 && activeIndex >= shorts.length - 3) {
      void fillFeed();
    }
  }, [activeIndex, shorts.length, fillFeed]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black">
      {/* Feed */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full w-full snap-y snap-mandatory overflow-y-scroll overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {shorts.map((item, i) => (
          <ShortCard
            key={`${item.media.mediaType}-${item.media.tmdbId}`}
            item={item}
            isActive={i === activeIndex}
            isMuted={isMuted}
            onToggleMute={() => setIsMuted((m) => !m)}
          />
        ))}

        {/* Loading / empty state */}
        {(isLoading || shorts.length === 0) && (
          <div className="flex h-full w-full snap-start items-center justify-center">
            {isLoading ? (
              <div className="flex flex-col items-center gap-3 text-white/40">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
                <span className="text-[11px] font-black uppercase tracking-wider">
                  Loading trailers
                </span>
              </div>
            ) : (
              <div className="px-8 text-center text-sm text-white/40">
                No trailers found for this filter. Try another genre.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filters bar (below the floating navbar) */}
      <div className="pointer-events-none absolute left-0 right-0 top-20 z-[3] flex justify-center px-3 sm:top-24">
        <div
          className={cn(
            'pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-full px-1.5 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            glassEffect
              ? 'bg-black/60 shadow-[0_8px_40px_rgba(0,0,0,0.6),0_0_0_0.5px_rgba(255,255,255,0.06)] backdrop-blur-[40px]'
              : 'bg-black/90 shadow-[0_8px_40px_rgba(0,0,0,0.8),0_0_0_0.5px_rgba(255,255,255,0.04)]',
          )}
        >
          {(
            [
              { key: 'all', label: 'All' },
              { key: 'movie', label: 'Movies' },
              { key: 'tv', label: 'TV Shows' },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTypeFilter(t.key)}
              className={cn(
                'whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider transition-all',
                typeFilter === t.key
                  ? 'border-accent-glow bg-accent-muted text-accent'
                  : 'border-transparent text-white/40 hover:text-white',
              )}
            >
              {t.label}
            </button>
          ))}

          <div className="mx-0.5 h-6 w-px shrink-0 bg-white/[0.08]" />

          {/* Genre dropdown trigger */}
          <button
            type="button"
            onClick={() => setIsGenreOpen((o) => !o)}
            className={cn(
              'flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider transition-all',
              genreFilter
                ? 'border-accent-glow bg-accent-muted text-accent'
                : 'border-transparent text-white/40 hover:text-white',
            )}
            aria-expanded={isGenreOpen}
          >
            <SlidersHorizontal className="h-3 w-3" />
            {genreFilter ? genreFilter.name : 'Genre'}
            <ChevronDown
              className={cn('h-3 w-3 transition-transform', isGenreOpen && 'rotate-180')}
            />
          </button>
        </div>
      </div>

      {/* Genre picker panel */}
      <AnimatePresence>
        {isGenreOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="absolute left-1/2 top-32 z-[4] w-[min(92vw,480px)] -translate-x-1/2 sm:top-36"
          >
            <div
              className={cn(
                'flex flex-wrap justify-center gap-1.5 rounded-3xl p-4 shadow-[0_24px_80px_rgba(0,0,0,0.65)]',
                glassEffect ? 'bg-black/70 backdrop-blur-2xl' : 'bg-[#050608]/95',
              )}
            >
              <button
                type="button"
                onClick={() => {
                  setGenreFilter(null);
                  setIsGenreOpen(false);
                }}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-wider transition-all',
                  !genreFilter
                    ? 'border-accent-glow bg-accent-muted text-accent'
                    : 'border-transparent bg-white/[0.05] text-white/40 hover:text-white',
                )}
              >
                All Genres
              </button>
              {genres.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    setGenreFilter(g);
                    setIsGenreOpen(false);
                  }}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-wider transition-all',
                    genreFilter?.id === g.id
                      ? 'border-accent-glow bg-accent-muted text-accent'
                      : 'border-transparent bg-white/[0.05] text-white/40 hover:text-white',
                  )}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
