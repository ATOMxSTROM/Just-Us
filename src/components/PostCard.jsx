import { useRef, useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePosts } from '../context/PostsContext';
import { getImageDisplayUrl, getVideoEmbedUrl } from '../utils/drive';

function DriveImage({ id, alt }) {
  const [src, setSrc] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getImageDisplayUrl(id)
      .then((url) => { if (!cancelled) setSrc(url); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [id]);

  if (error) return <div className="img-error">Could not load image</div>;
  if (!src)  return <div className="img-skeleton" />;
  return <img src={src} alt={alt || 'memory'} className="carousel-photo" />;
}

const DISPLAY_NAMES = { him: 'Him', susmitha: 'Susmitha' };

export default function PostCard({ post }) {
  const { user } = useAuth();
  const { toggleReaction } = usePosts();
  const [activeIndex, setActiveIndex] = useState(0);
  const carouselRef = useRef();

  const hasReacted = post.reactions?.includes(user.username);
  const reactionCount = post.reactions?.length ?? 0;
  const displayName = DISPLAY_NAMES[post.author] ?? post.author;

  // Support both old posts (photoId) and new posts (mediaItems)
  const mediaItems = post.mediaItems?.length
    ? post.mediaItems
    : post.photoId
      ? [{ id: post.photoId, type: 'image' }]
      : [];

  const memoryDate = post.date
    ? new Date(post.date + 'T12:00:00').toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
      })
    : new Date(post.createdAt).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
      });

  function handleCarouselScroll() {
    const el = carouselRef.current;
    if (!el) return;
    setActiveIndex(Math.round(el.scrollLeft / el.offsetWidth));
  }

  function scrollTo(index) {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.offsetWidth, behavior: 'smooth' });
  }

  return (
    <article className="post-card">
      <div className="post-header">
        <div className="post-author-info">
          <span className="post-author-avatar">{post.author === 'him' ? '🌙' : '🌸'}</span>
          <span className="post-author-name">{displayName}</span>
        </div>
        {post.place && <span className="post-place">📍 {post.place}</span>}
      </div>

      {mediaItems.length > 0 && (
        <div className="post-media-wrap">
          <div
            className="post-carousel"
            ref={carouselRef}
            onScroll={handleCarouselScroll}
          >
            {mediaItems.map((item, i) => (
              <div key={i} className="carousel-slide">
                {item.type === 'video' ? (
                  <iframe
                    src={getVideoEmbedUrl(item.id)}
                    className="carousel-video"
                    allow="autoplay"
                    allowFullScreen
                    title={`video ${i + 1}`}
                  />
                ) : (
                  <DriveImage id={item.id} alt={post.caption} />
                )}
              </div>
            ))}
          </div>

          {mediaItems.length > 1 && (
            <>
              {activeIndex > 0 && (
                <button className="carousel-arrow carousel-arrow-left" onClick={() => scrollTo(activeIndex - 1)}>‹</button>
              )}
              {activeIndex < mediaItems.length - 1 && (
                <button className="carousel-arrow carousel-arrow-right" onClick={() => scrollTo(activeIndex + 1)}>›</button>
              )}
              <div className="carousel-dots">
                {mediaItems.map((_, i) => (
                  <span
                    key={i}
                    className={`carousel-dot ${i === activeIndex ? 'active' : ''}`}
                    onClick={() => scrollTo(i)}
                  />
                ))}
              </div>
              <div className="carousel-count">{activeIndex + 1} / {mediaItems.length}</div>
            </>
          )}
        </div>
      )}

      <div className="post-footer">
        <button
          className={`heart-btn ${hasReacted ? 'is-reacted' : ''}`}
          onClick={() => toggleReaction(post._fileId, post.id)}
          aria-label={hasReacted ? 'Remove heart' : 'Heart this'}
        >
          <span className="heart-icon">{hasReacted ? '♥' : '♡'}</span>
          {reactionCount > 0 && <span className="heart-count">{reactionCount}</span>}
        </button>

        {post.caption && (
          <p className="post-caption">
            <span className="post-caption-author">{displayName}</span>{' '}{post.caption}
          </p>
        )}

        <p className="post-date">{memoryDate}</p>
      </div>
    </article>
  );
}
