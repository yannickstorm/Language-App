import React, { useState } from 'react';
import styles from './AppStyles';
import VerbTrainer from './VerbPrepositionTrainer';
import CaseAdjectiveTrainer from './CaseAdjectiveTrainer';

const translations = {
  en: {
    appTitle: 'Language App',
    menuTitle: 'Select a Game',
    verbTrainer: 'German Verb Trainer',
    caseAdjectiveTrainer: 'German Cases & Adjective Endings',
    settings: 'Settings',
    close: 'Close',
    language: 'Language',
  },
  fr: {
    appTitle: 'Application de langue',
    menuTitle: 'Choisissez un jeu',
    verbTrainer: 'Entraîneur de verbes allemands',
    caseAdjectiveTrainer: 'Cas et terminaisons adjectivales',
    settings: 'Paramètres',
    close: 'Fermer',
    language: 'Langue',
  },
  es: {
    appTitle: 'Aplicación de idiomas',
    menuTitle: 'Selecciona un juego',
    verbTrainer: 'Entrenador de verbos alemanes',
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
      <div style={styles.appContainer}>
        <h2 style={styles.header}>{t(language, 'appTitle')}</h2>
        <div style={{ maxWidth: 500, margin: '2rem auto', padding: '2rem', border: '1px solid #ccc', borderRadius: 8, textAlign: 'center' }}>
          <h3>{t(language, 'menuTitle')}</h3>
          <button style={styles.guessButton} onClick={() => setSelectedGame('verb')}>{t(language, 'verbTrainer')}</button>
          <button style={styles.guessButton} onClick={() => setSelectedGame('caseAdjective')}>
            {t(language, 'caseAdjectiveTrainer')}
          </button>
          <div style={{ marginTop: '2rem' }}>
            <label style={styles.settingsLabel}>{t(language, 'language')}:</label>
            <select value={language} onChange={handleLanguageChange} style={styles.settingsSelect}>
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
