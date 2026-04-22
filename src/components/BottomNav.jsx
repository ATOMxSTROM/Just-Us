export default function BottomNav({ onAddPost }) {
  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-inner">
        <div className="nav-spacer" />
        <button className="nav-add-btn" onClick={onAddPost} aria-label="Add memory">
          <span className="nav-add-icon">+</span>
        </button>
        <div className="nav-spacer" />
      </div>
    </nav>
  );
}
