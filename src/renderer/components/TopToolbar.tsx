interface TopToolbarProps {
  onUpload(): void;
  onReanalyze(): void;
  onFullscreen(): void;
}

export function TopToolbar({ onUpload, onReanalyze, onFullscreen }: TopToolbarProps) {
  return (
    <header className="topbar workspace-toolbar">
      <span className="brand">Particle Photo</span>
      <nav aria-label="Workspace actions">
        <button type="button" onClick={onUpload}>Upload</button>
        <button type="button" onClick={onReanalyze}>Re-analyze</button>
        <button type="button" onClick={onFullscreen}>Fullscreen</button>
      </nav>
    </header>
  );
}
