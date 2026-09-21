export function extractYouTubeId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();

  // If already an 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Regex for various YouTube URL forms
  const regExp = /(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/|attribution_link\?.*v%3D)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = trimmed.match(regExp);
  return match ? match[1] : null;
}

export interface YouTubeMetadata {
  videoId: string;
  title: string;
  author: string;
  thumbnail: string;
  url: string;
  duration: number; // default 0 if unknown prior to player mount
}

export async function fetchYouTubeMetadata(urlOrId: string): Promise<YouTubeMetadata | null> {
  const videoId = extractYouTubeId(urlOrId);
  if (!videoId) return null;

  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const defaultThumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`;
    const res = await fetch(oembedUrl);
    if (!res.ok) {
      // Fallback if oembed fails (e.g. rate limit or embed restricted)
      return {
        videoId,
        title: `YouTube Video (${videoId})`,
        author: 'Unknown Artist',
        thumbnail: defaultThumbnail,
        url: canonicalUrl,
        duration: 0,
      };
    }

    const data = await res.json();
    return {
      videoId,
      title: data.title || `YouTube Video (${videoId})`,
      author: data.author_name || 'YouTube Creator',
      thumbnail: data.thumbnail_url || defaultThumbnail,
      url: canonicalUrl,
      duration: 0,
    };
  } catch (error) {
    console.error('Error resolving YouTube metadata:', error);
    return {
      videoId,
      title: `YouTube Video (${videoId})`,
      author: 'YouTube Creator',
      thumbnail: defaultThumbnail,
      url: canonicalUrl,
      duration: 0,
    };
  }
}

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;

  if (hours > 0) {
    return `${hours}:${remainingMins < 10 ? '0' : ''}${remainingMins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}
