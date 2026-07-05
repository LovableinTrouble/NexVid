import { ShortsClient } from '@/components/pages/ShortsClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shorts — Trailer Feed',
  description: 'Scroll through an endless feed of movie and TV show trailers on Sleepy.',
};

export default function ShortsPage() {
  return <ShortsClient />;
}
