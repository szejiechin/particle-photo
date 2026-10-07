interface GestureGuideProps { onClose(): void }

export function GestureGuide({ onClose }: GestureGuideProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="gesture-guide" role="dialog" aria-modal="true" aria-labelledby="gesture-guide-title">
        <p className="eyebrow">QUICK START</p>
        <h2 id="gesture-guide-title">Gesture Controls</h2>
        <div className="gesture-grid">
          <span>✊ <strong>Fist</strong><small>Gather</small></span>
          <span>✋ <strong>Open Palm</strong><small>Scatter</small></span>
          <span>✌ <strong>V Sign</strong><small>Rotate</small></span>
          <span>☝ <strong>Point</strong><small>Wave</small></span>
          <span>👍 <strong>Thumb Up</strong><small>Pause / Resume</small></span>
        </div>
        <p>Hold one hand in view for a moment to confirm a gesture.</p>
        <button type="button" onClick={onClose}>Start Creating</button>
      </section>
    </div>
  );
}
