import { useState, useRef, useEffect } from 'react';
import { usePosts } from '../context/PostsContext';

export default function AddPostSheet({ onClose }) {
  const { addPost, driveReady, connectDrive } = usePosts();
  const [mediaFiles, setMediaFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [caption, setCaption] = useState('');
  const [place, setPlace] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(null); // { current, total }
  const [error, setError] = useState('');
  const fileRef = useRef();
  const sheetRef = useRef();

  useEffect(() => {
    requestAnimationFrame(() => {
      sheetRef.current?.classList.add('sheet-visible');
    });
  }, []);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => previews.forEach((p) => URL.revokeObjectURL(p.url));
  }, [previews]);

  function handleFileChange(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const newPreviews = files.map((f) => ({
      url: URL.createObjectURL(f),
      type: f.type.startsWith('video/') ? 'video' : 'image',
      name: f.name,
    }));

    setMediaFiles((prev) => [...prev, ...files]);
    setPreviews((prev) => [...prev, ...newPreviews]);
    // Reset input so same file can be re-selected
    e.target.value = '';
  }

  function removeMedia(index) {
    URL.revokeObjectURL(previews[index].url);
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!mediaFiles.length && !caption.trim()) return;
    setSaving(true);
    setError('');
    try {
      await addPost({
        caption: caption.trim(),
        place: place.trim(),
        date,
        mediaFiles,
        onProgress: (current, total) => setProgress({ current, total }),
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save — is Drive connected?');
      setSaving(false);
      setProgress(null);
    }
  }

  const canSubmit = !saving && (mediaFiles.length > 0 || caption.trim());

  return (
    <div className="sheet-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" ref={sheetRef}>
        <div className="sheet-handle" />
        <div className="sheet-header">
          <h2 className="sheet-title">new memory ♡</h2>
          <button className="sheet-close" onClick={onClose} disabled={saving}>✕</button>
        </div>

        {!driveReady && (
          <div className="sheet-drive-warn">
            <p>Drive not connected</p>
            <button onClick={connectDrive}>Connect now</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="sheet-form">
          {/* Media grid */}
          <div className="media-grid-wrap">
            {previews.map((p, i) => (
              <div key={i} className="media-thumb">
                {p.type === 'video' ? (
                  <video src={p.url} className="media-thumb-el" muted playsInline />
                ) : (
                  <img src={p.url} alt="" className="media-thumb-el" />
                )}
                <button
                  type="button"
                  className="media-remove"
                  onClick={() => removeMedia(i)}
                  disabled={saving}
                >✕</button>
                {p.type === 'video' && <span className="media-video-badge">▶</span>}
              </div>
            ))}
            <button
              type="button"
              className="media-add-tile"
              onClick={() => fileRef.current.click()}
              disabled={saving}
            >
              <span className="media-add-plus">+</span>
              <span className="media-add-label">photo / video</span>
            </button>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          <div className="sheet-fields">
            <textarea
              placeholder="what do you want to remember? ♡"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              className="sheet-textarea"
              disabled={saving}
            />
            <input
              type="text"
              placeholder="📍 where was this?"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              className="sheet-input"
              disabled={saving}
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="sheet-input"
              disabled={saving}
            />
          </div>

          {error && <p className="sheet-error">{error}</p>}

          <button type="submit" className="save-btn" disabled={!canSubmit}>
            {saving && progress ? (
              <span>uploading {progress.current} of {progress.total}...</span>
            ) : saving ? (
              <span>saving...</span>
            ) : (
              'save memory'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
