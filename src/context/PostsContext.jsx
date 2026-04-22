import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  initDrive, isAuthenticated, authenticate,
  loadPosts, savePost, updatePost, uploadMedia, hasFolderConfigured,
} from '../utils/drive';
import { useAuth } from './AuthContext';

const PostsContext = createContext(null);

export function PostsProvider({ children }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [driveReady, setDriveReady] = useState(false);
  const [driveError, setDriveError] = useState(null);
  const initialized = useRef(false);

  const refreshPosts = useCallback(async () => {
    if (!isAuthenticated()) return;
    setLoading(true);
    setDriveError(null);
    try {
      const data = await loadPosts();
      setPosts(data);
    } catch (e) {
      setDriveError('Could not load posts — ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const connectDrive = useCallback(async () => {
    setDriveError(null);
    try {
      await authenticate();
      setDriveReady(true);
      await refreshPosts();
    } catch (e) {
      setDriveError('Could not connect to Google Drive — ' + e.message);
    }
  }, [refreshPosts]);

  useEffect(() => {
    if (!user || initialized.current) return;
    initialized.current = true;

    async function init() {
      try {
        await initDrive();
        if (isAuthenticated()) {
          setDriveReady(true);
          await refreshPosts();
        }
      } catch (e) {
        setDriveError('Drive init failed — ' + e.message);
      }
    }

    init();
  }, [user, refreshPosts]);

  // mediaFiles: File[], date: string (YYYY-MM-DD), onProgress: (current, total) => void
  const addPost = useCallback(async ({ caption, place, date, mediaFiles, onProgress }) => {
    const mediaItems = [];

    for (let i = 0; i < mediaFiles.length; i++) {
      onProgress?.(i + 1, mediaFiles.length);
      const item = await uploadMedia(mediaFiles[i], date);
      mediaItems.push(item);
    }

    const post = await savePost({
      caption,
      place,
      date,
      mediaItems,
      author: user.username,
    });

    setPosts((prev) => [post, ...prev]);
    return post;
  }, [user]);

  const toggleReaction = useCallback(async (fileId, postId) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const reactions = post.reactions || [];
    const hasReacted = reactions.includes(user.username);
    const newReactions = hasReacted
      ? reactions.filter((r) => r !== user.username)
      : [...reactions, user.username];

    setPosts((prev) =>
      prev.map((p) => p.id === postId ? { ...p, reactions: newReactions } : p)
    );

    try {
      await updatePost(fileId, { reactions: newReactions });
    } catch {
      setPosts((prev) =>
        prev.map((p) => p.id === postId ? { ...p, reactions } : p)
      );
    }
  }, [posts, user]);

  return (
    <PostsContext.Provider value={{
      posts, loading, driveReady, driveError,
      connectDrive, refreshPosts, addPost, toggleReaction,
      folderConfigured: hasFolderConfigured(),
    }}>
      {children}
    </PostsContext.Provider>
  );
}

export function usePosts() {
  return useContext(PostsContext);
}
