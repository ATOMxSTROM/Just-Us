import { useAuth } from '../context/AuthContext';
import { usePosts } from '../context/PostsContext';

export default function Header() {
  const { user, logout } = useAuth();
  const { driveReady, connectDrive, folderConfigured } = usePosts();

  return (
    <header className="app-header">
      <div className="header-logo">Us ♡</div>
      <div className="header-right">
        {folderConfigured && !driveReady && (
          <button className="drive-connect-btn" onClick={connectDrive}>
            Connect Drive
          </button>
        )}
        <button className="avatar-btn" onClick={logout} title={`Logged in as ${user?.displayName} — tap to log out`}>
          <span className="avatar-emoji">{user?.avatar}</span>
        </button>
      </div>
    </header>
  );
}
