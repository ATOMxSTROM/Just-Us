import { usePosts } from '../context/PostsContext';
import PostCard from './PostCard';

export default function Feed() {
  const { posts, loading, driveReady, driveError, connectDrive, folderConfigured, refreshPosts } = usePosts();

  if (!folderConfigured) {
    return (
      <div className="feed-message">
        <p className="feed-icon">🔧</p>
        <p className="feed-title">One more step</p>
        <p className="feed-body">
          Add <code>VITE_DRIVE_FOLDER_ID</code> to your <code>.env</code> file,
          then redeploy. See the setup guide for instructions.
        </p>
      </div>
    );
  }

  if (!driveReady) {
    return (
      <div className="feed-message">
        <p className="feed-icon">☁️</p>
        <p className="feed-title">Connect your Drive</p>
        <p className="feed-body">Sign in with Google to see and save memories.</p>
        <button className="primary-btn" onClick={connectDrive}>
          Connect Google Drive
        </button>
        {driveError && <p className="feed-error">{driveError}</p>}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="feed-message">
        <p className="feed-loading-dots">
          <span /><span /><span />
        </p>
        <p className="feed-body">loading memories...</p>
      </div>
    );
  }

  if (driveError) {
    return (
      <div className="feed-message">
        <p className="feed-icon">😕</p>
        <p className="feed-body">{driveError}</p>
        <button className="primary-btn" onClick={refreshPosts}>Try again</button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="feed-message">
        <p className="feed-icon">♡</p>
        <p className="feed-title">No memories yet</p>
        <p className="feed-body">Tap + to add your first one.</p>
      </div>
    );
  }

  return (
    <div className="feed">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
