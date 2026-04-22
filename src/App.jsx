import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { PostsProvider } from './context/PostsContext';
import LoginPage from './components/LoginPage';
import Header from './components/Header';
import Feed from './components/Feed';
import AddPostSheet from './components/AddPostSheet';
import BottomNav from './components/BottomNav';

function AppContent() {
  const [showAddPost, setShowAddPost] = useState(false);

  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <Feed />
      </main>
      <BottomNav onAddPost={() => setShowAddPost(true)} />
      {showAddPost && (
        <AddPostSheet onClose={() => setShowAddPost(false)} />
      )}
    </div>
  );
}

export default function App() {
  const { user } = useAuth();
  if (!user) return <LoginPage />;
  return (
    <PostsProvider>
      <AppContent />
    </PostsProvider>
  );
}
