import React, { useState } from 'react';
// Placeholder for the new game: "German Cases & Adjective Endings"
// This component will have its own CSV, backup, and settings

export default function CaseAdjectiveTrainer({ language, onBack }) {
  // State for this game's progress, settings, etc.
  const [settings, setSettings] = useState({});
  // TODO: Load CSV, manage progress, implement game logic

  // Small menu button for returning to main menu
  const menuButton = (
    <button
      aria-label="Menu"
      onClick={onBack}
      style={{
        position: 'absolute', top: 16, left: 16, zIndex: 10,
        background: 'none', border: 'none', padding: 0, cursor: 'pointer', width: 36, height: 36
      }}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="7" width="16" height="2" rx="1" fill="#1976d2" />
        <rect x="4" y="11" width="16" height="2" rx="1" fill="#1976d2" />
        <rect x="4" y="15" width="16" height="2" rx="1" fill="#1976d2" />
      </svg>
    </button>
  );

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', padding: '2rem', border: '1px solid #ccc', borderRadius: 8, position: 'relative' }}>
      {menuButton}
      <h2>German Cases & Adjective Endings Trainer</h2>
      <p>Game logic coming soon...</p>
    </div>
  );
}
