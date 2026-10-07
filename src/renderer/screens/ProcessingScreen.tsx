interface ProcessingScreenProps {
  stage: string;
  previewUrl?: string;
  onCancel(): void;
}

export function ProcessingScreen({ stage, previewUrl, onCancel }: ProcessingScreenProps) {
  return (
    <main className="processing-screen">
      {previewUrl && <img src={previewUrl} alt="Selected photo preview" />}
      <div className="processing-overlay">
        <div className="spinner" aria-hidden="true" />
        <h1>Generating particle scene</h1>
        <p>{stage}</p>
        <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>
      </div>
    </main>
  );
}
