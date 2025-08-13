import React, { useState } from 'react';
import styles from './AppStyles';
import VerbTrainer from './VerbPrepositionTrainer';
import CaseAdjectiveTrainer from './CaseAdjectiveTrainer';

const translations = {
  en: {
    appTitle: 'Language App',
    menuTitle: 'Select a Game',
    verbTrainer: 'Verb + Preposition',
    caseAdjectiveTrainer: 'Cases & Adjective Endings',
    settings: 'Settings',
    close: 'Close',
    language: 'Language',
  },
  fr: {
    appTitle: 'Application de langue',
    menuTitle: 'Choisissez un jeu',
    verbTrainer: 'Verbe + Préposition',
    caseAdjectiveTrainer: 'Cas et terminaisons adjectivales',
    settings: 'Paramètres',
    close: 'Fermer',
    language: 'Langue',
  },
  es: {
    appTitle: 'Aplicación de idiomas',
    menuTitle: 'Selecciona un juego',
    verbTrainer: 'Verbo + Preposición',
    caseAdjectiveTrainer: 'Casos y terminaciones de adjetivos',
    settings: 'Configuración',
    close: 'Cerrar',
    language: 'Idioma',
  }
};

const supportedLanguages = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' }
];

function t(language, key) {
  return translations[language]?.[key] || translations['en'][key] || key;
}

export default function App() {
  const [selectedGame, setSelectedGame] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [language, setLanguage] = useState(() => {
    const savedLang = localStorage.getItem('language');
    const found = supportedLanguages.find(l => l.code === savedLang);
    return found ? found.code : supportedLanguages[0].code;
  });

  function handleLanguageChange(e) {
    setLanguage(e.target.value);
    localStorage.setItem('language', e.target.value);
  }

  // Central menu for game selection
  if (!selectedGame) {
    return (
      <div style={{
        ...styles.appContainer,
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: styles.appContainer.background,
      }}>
        <div style={{
          width: '100%',
          maxWidth: 380,
          padding: '2rem 1rem',
          borderRadius: 12,
          boxShadow: styles.cardShadow || '0 2px 16px rgba(0,0,0,0.08)',
          background: styles.cardBackground || '#fff',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <h2 style={{ ...styles.header, marginBottom: '1.2rem' }}>{t(language, 'appTitle')}</h2>
          <h3 style={{ fontWeight: 500, fontSize: '1.15rem', marginBottom: '1.5rem', color: '#1976d2' }}>{t(language, 'menuTitle')}</h3>
          <button style={{ ...styles.guessButton, width: '100%', fontSize: '1rem', marginBottom: '1rem', padding: '0.9rem 0', borderRadius: 8 }} onClick={() => setSelectedGame('verb')}>
            {t(language, 'verbTrainer')}
          </button>
          <button style={{ ...styles.guessButton, width: '100%', fontSize: '1rem', marginBottom: '1.5rem', padding: '0.9rem 0', borderRadius: 8 }} onClick={() => setSelectedGame('caseAdjective')}>
            {t(language, 'caseAdjectiveTrainer')}
          </button>
          <div style={{ width: '100%', marginTop: 'auto', textAlign: 'left' }}>
            <label style={{ ...styles.settingsLabel, fontWeight: 500 }}>{t(language, 'language')}:</label>
            <select value={language} onChange={handleLanguageChange} style={{ ...styles.settingsSelect, width: '100%', marginTop: 8 }}>
              {supportedLanguages.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  }

  // Game routing
  let gameComponent = null;

  if (selectedGame === 'verb') {
    gameComponent = <VerbTrainer language={language} onBack={() => setSelectedGame(null)} />;
  } else if (selectedGame === 'caseAdjective') {
    gameComponent = <CaseAdjectiveTrainer language={language} onBack={() => setSelectedGame(null)} />;
  }

  return (
    <div>
      {gameComponent}
    </div>
  );
}
