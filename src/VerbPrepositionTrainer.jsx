import React, { useEffect, useState, useRef } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { getRandomIndex, loadProgress, saveProgress, loadAttempts, saveAttempts } from './utils';
import { fetchAndParseCSV } from './csvLoader';
import styles from './AppStyles';

const CSV_FILE = '/Top_50_Verbes_avec_exemples_traduits.csv';

const translations = {
  en: {
    settings: 'Settings',
    mode: 'Mode',
    level: 'Level',
    language: 'Language',
    modeBoth: 'Preposition + Case',
    modePrep: 'Preposition only',
    modeCase: 'Case only',
    level1: 'Multiple Choice',
    level2: 'Text Input',
    appTitle: 'German Verb Trainer',
    preposition: 'Preposition',
    case: 'Case',
    guess: 'Guess',
    tapToContinue: 'Tap to continue',
    example: 'Example',
    translation: 'Translation',
    score: 'Score',
    learned: 'Learned',
    allLearned: 'All verbs learned!',
    restart: 'Restart',
    loading: 'Loading...',
    error: 'Error',
    close: 'Close',
    back: 'Back to Menu',
  },
  fr: {
    settings: 'Paramètres',
    mode: 'Mode',
    level: 'Niveau',
    language: 'Langue',
    modeBoth: 'Préposition + Cas',
    modePrep: 'Préposition seulement',
    modeCase: 'Cas seulement',
    level1: 'Choix multiple',
    level2: 'Saisie texte',
    appTitle: 'Entraîneur de verbes allemands',
    preposition: 'Préposition',
    case: 'Cas',
    guess: 'Deviner',
    tapToContinue: 'Appuyez pour continuer',
    example: 'Exemple',
    translation: 'Traduction',
    score: 'Score',
    learned: 'Appris',
    allLearned: 'Tous les verbes sont appris !',
    restart: 'Recommencer',
    loading: 'Chargement...',
    error: 'Erreur',
    close: 'Fermer',
    back: 'Retour au menu',
  },
  es: {
    settings: 'Configuración',
    mode: 'Modo',
    level: 'Nivel',
    language: 'Idioma',
    modeBoth: 'Preposición + Caso',
    modePrep: 'Solo preposición',
    modeCase: 'Solo caso',
    level1: 'Opción múltiple',
    level2: 'Entrada de texto',
    appTitle: 'Entrenador de verbos alemanes',
    preposition: 'Preposición',
    case: 'Caso',
    guess: 'Adivinar',
    tapToContinue: 'Toca para continuar',
    example: 'Ejemplo',
    translation: 'Traducción',
    score: 'Puntuación',
    learned: 'Aprendido',
    allLearned: '¡Todos los verbos aprendidos!',
    restart: 'Reiniciar',
    loading: 'Cargando...',
    error: 'Error',
    close: 'Cerrar',
    back: 'Volver al menú',
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

export default function VerbTrainer({ language, onBack }) {
  const [verbs, setVerbs] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(null);
  const [guess, setGuess] = useState({ prep: '', case: '' });
  const [showAnswer, setShowAnswer] = useState(false);
  const [progress, setProgress] = useState(loadProgress());
  const [attempts, setAttempts] = useState(loadAttempts());
  const [csvError, setCsvError] = useState(null);
  const [mode, setMode] = useState(() => {
    const savedMode = localStorage.getItem('mode');
    return (savedMode && ['prep', 'case', 'both'].includes(savedMode)) ? savedMode : 'both';
  });
  const [prepositionChoices, setPrepositionChoices] = useState([]);
  const [level, setLevel] = useState(() => {
    const saved = localStorage.getItem('level');
    return saved === '2' ? 2 : 1;
  });
  const [showSettings, setShowSettings] = useState(false);
  const inputRef = useRef(null);

  function getVerbKey(verbObj) {
    return `${verbObj['Verb']}|${verbObj['Preposition']}|${verbObj['Exemple']}`;
  }

  function getPrepositionChoices(current) {
    const correct = current['Preposition']?.trim();
    let wrongs = [];
    try {
      wrongs = JSON.parse(current['WrongPrepositions']);
    } catch {
      wrongs = (current['WrongPrepositions'] || '').split(',').map(p => p.trim()).filter(Boolean);
    }
    const shuffledWrongs = wrongs.sort(() => Math.random() - 0.5).slice(0, 3);
    const choices = [correct, ...shuffledWrongs].filter(Boolean);
    return choices.sort(() => Math.random() - 0.5);
  }

  useEffect(() => {
    fetchAndParseCSV(CSV_FILE, loadProgress(), setVerbs, setCurrentIdx, setCsvError);
  }, []);

  useEffect(() => {
    if (!verbs.length) return;
    const savedProgress = loadProgress();
    const savedAttempts = loadAttempts();
    const newLearned = [];
    const newAttempts = {};
    verbs.forEach((v, idx) => {
      const key = getVerbKey(v);
      if (savedAttempts[key] !== undefined) {
        newAttempts[idx] = savedAttempts[key];
      }
      if (savedProgress.learned && Array.isArray(savedProgress.learned)) {
        const learnedKey = savedProgress.learned.find(lk => lk === key);
        if (learnedKey) {
          newLearned.push(idx);
        }
      }
    });
    setProgress({ score: newLearned.length, learned: newLearned });
    setAttempts(newAttempts);
  }, [verbs]);

  useEffect(() => {
    if (!verbs.length) return;
    const progressToSave = {
      score: progress.score,
      learned: progress.learned
        .map(idx => verbs[idx] ? getVerbKey(verbs[idx]) : null)
        .filter(Boolean)
    };
    saveProgress(progressToSave);
    const attemptsToSave = {};
    Object.entries(attempts).forEach(([idx, val]) => {
      if (verbs[idx]) {
        attemptsToSave[getVerbKey(verbs[idx])] = val;
      }
    });
    saveAttempts(attemptsToSave);
  }, [progress, attempts, verbs]);

  useEffect(() => {
    if (["prep", "case", "both"].includes(mode)) {
      localStorage.setItem("mode", mode);
    }
  }, [mode]);

  useEffect(() => {
    if (verbs.length && currentIdx !== null && mode !== "case" && level === 1) {
      setPrepositionChoices(getPrepositionChoices(verbs[currentIdx]));
    }
  }, [verbs, currentIdx, mode, level]);

  useEffect(() => {
    localStorage.setItem("level", level);
  }, [level]);

  useEffect(() => {
    const saved = localStorage.getItem("level");
    if (saved === "2") setLevel(2);
    else setLevel(1);
  }, []);

  useEffect(() => {
    if (level === 2 && mode !== "case" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [level, mode, currentIdx, showAnswer]);

  useHotkeys("enter", (event) => {
    if (level === 2 && inputRef.current && document.activeElement === inputRef.current && !showAnswer) {
      handleGuess();
    } else if (showAnswer) {
      nextVerb();
    }
  });

  function handleGuess() {
    const current = verbs[currentIdx];
    const correctPrep = current["Preposition"]?.trim().toLowerCase();
    const correctCase = current["Case"]?.trim().toLowerCase();
    let isCorrect = true;
    if (mode !== "case") {
      isCorrect = isCorrect && (guess.prep.trim().toLowerCase() === correctPrep);
    }
    if (mode !== "prep") {
      isCorrect = isCorrect && (guess.case.trim().toLowerCase() === correctCase);
    }
    setShowAnswer(true);
    setAttempts((prev) => {
      const prevCount = prev[currentIdx] || 0;
      const newCount = isCorrect ? prevCount + 1 : prevCount;
      return { ...prev, [currentIdx]: newCount };
    });
    setProgress((p) => {
      const alreadyLearned = p.learned.includes(currentIdx);
      let newScore = p.score;
      let newLearned = p.learned;
      const nextAttempts = (attempts[currentIdx] || 0) + (isCorrect ? 1 : 0);
      if (isCorrect && nextAttempts >= 3 && !alreadyLearned) {
        newScore = p.score + 1;
        newLearned = [...p.learned, currentIdx];
      }
      return { ...p, score: newScore, learned: newLearned };
    });
  }

  function nextVerb() {
    setShowAnswer(false);
    setGuess({ prep: '', case: '' });
    setCurrentIdx(getRandomIndex(verbs.length, progress.learned));
  }

  function giveUp() {
    setShowAnswer(true);
  }

  useEffect(() => {
    if (!showAnswer) {
      if (level === 1) {
        if (mode === "both" && guess.prep && guess.case) {
          handleGuess();
        } else if (mode === "prep" && guess.prep) {
          handleGuess();
        } else if (mode === "case" && guess.case) {
          handleGuess();
        }
      }
    }
  }, [guess, mode, level, showAnswer]);

  function handleInputKeyDown(e) {
    if (e.key === "Enter" && !showAnswer) {
      handleGuess();
    }
  }

  function getVerbTranslation(current) {
    const value = current["Translation_" + language];
    if (value) {
      return value;
    } else if (language !== "en" && current["Translation_en"]) {
      console.warn(`Missing verb translation for language '${language}' in row, falling back to English:`, current);
      return current["Translation_en"];
    } else {
      console.warn(`Missing verb translation for language '${language}' and no English fallback in row:`, current);
      return "No translation available";
    }
  }

  function getCurrentTranslation(current) {
    const value = current["ExampleTranslation_" + language];
    if (value) {
      return value;
    } else if (language !== "en" && current["ExampleTranslation_en"]) {
      console.warn(`Missing example translation for language '${language}' in row, falling back to English:`, current);
      return current["ExampleTranslation_en"];
    } else {
      console.warn(`Missing example translation for language '${language}' and no English fallback in row:`, current);
      return "No translation available";
    }
  }

  if (csvError) {
    return (
      <div style={{ color: "red", padding: "2rem", textAlign: "center", fontWeight: "bold", fontSize: "1.2em" }}>
        {t(language, "error")} {csvError}
        <button style={styles.guessButton} onClick={onBack}>{t(language, "back")}</button>
      </div>
    );
  }
  if (!verbs.length || currentIdx === null) return <div>{t(language, "loading")}</div>;
  if (progress.learned.length === verbs.length) {
    return (
      <div style={{ maxWidth: 500, margin: "2rem auto", padding: "2rem", border: "1px solid #ccc", borderRadius: 8, textAlign: "center" }}>
        <h2>{t(language, "appTitle")}</h2>
        <div style={{ fontSize: "1.2em", margin: "2rem 0" }}>
          🎉 {t(language, "allLearned")} 🎉<br />
          <b>{t(language, "score")}</b>: {progress.score} / {verbs.length}
        </div>
        <button onClick={() => {
          setProgress({ score: 0, learned: [] });
          setAttempts({});
          setCurrentIdx(getRandomIndex(verbs.length, []));
        }}>
          {t(language, "restart")}
        </button>
        <button style={{ marginLeft: 16 }} onClick={onBack}>{t(language, "back")}</button>
      </div>
    );
  }

  const current = verbs[currentIdx];

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
    <div style={{ ...styles.appContainer, position: 'relative' }}>
      {menuButton}
      <h2 style={styles.header}>{t(language, "appTitle")}</h2>
      <div style={styles.verbDisplay}>
        <div style={{ textAlign: "center", width: "100%" }}>
          <span style={{ ...styles.verbText, transform: showAnswer ? "scale(1.08)" : "scale(1)" }}>
            {current["Verb"]}
          </span>
          <div style={styles.verbTranslation}>
            ({getVerbTranslation(current)})
          </div>
        </div>
      </div>
      <div
        style={{ flex: 1, position: "relative" }}
        onClick={(e) => {
          if (showAnswer) {
            nextVerb();
          }
        }}
      >
        {showAnswer && (
          <div style={styles.nextOverlay}>
            {t(language, "tapToContinue")}
          </div>
        )}
      </div>
      <div style={{ margin: "1rem 0" }}>
        {mode !== "case" && (
          <label style={{ display: "block", marginBottom: 12 }}>
            <span style={{ fontWeight: "bold", fontSize: "1.1em" }}>{t(language, "preposition")}:</span>
            {level === 1 ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: 8 }}>
                {prepositionChoices.map((prep) => {
                  let btnColor = "#eee";
                  let btnTextColor = "#333";
                  let fontWeight = "normal";
                  let border = "1px solid #bdbdbd";
                  if (showAnswer) {
                    const correctPrep = current["Preposition"]?.trim().toLowerCase();
                    if (prep.trim().toLowerCase() === correctPrep) {
                      btnColor = guess.prep.trim().toLowerCase() === correctPrep ? "#c8e6c9" : "#bbdefb";
                      btnTextColor = "#256029";
                      fontWeight = "bold";
                      border = "2px solid #388e3c";
                    } else if (prep === guess.prep) {
                      btnColor = "#ffcdd2";
                      btnTextColor = "#b71c1c";
                      fontWeight = "bold";
                      border = "2px solid #b71c1c";
                    }
                  } else if (guess.prep === prep) {
                    btnColor = "#1976d2";
                    btnTextColor = "#fff";
                    fontWeight = "bold";
                    border = "2px solid #1976d2";
                  }
                  const dynamicStyles = {
                    background: btnColor,
                    color: btnTextColor,
                    border,
                    fontWeight,
                  };
                  return (
                    <button
                      key={prep}
                      type="button"
                      onClick={() => setGuess({ ...guess, prep })}
                      disabled={showAnswer}
                      style={{ ...styles.choiceButton, ...dynamicStyles }}
                    >
                      {prep}
                    </button>
                  );
                })}
              </div>
            ) : (
              <input
                ref={inputRef}
                value={guess.prep}
                onChange={(e) => setGuess({ ...guess, prep: e.target.value })}
                onKeyDown={handleInputKeyDown}
                disabled={showAnswer}
                style={styles.prepInput}
              />
            )}
          </label>
        )}
        {mode !== "prep" && (
          <label style={{ display: "block", marginBottom: 12 }}>
            <span style={{ fontWeight: "bold", fontSize: "1.1em" }}>{t(language, "case")}:</span>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              {["Akk", "Dat"].map((caseOpt) => {
                let btnColor = "#eee";
                let btnTextColor = "#333";
                let fontWeight = "normal";
                let border = "1px solid #bdbdbd";
                if (showAnswer) {
                  const correctCase = current["Case"]?.trim().toLowerCase();
                  if (caseOpt.toLowerCase() === correctCase) {
                    btnColor = guess.case.trim().toLowerCase() === correctCase ? "#c8e6c9" : "#bbdefb";
                    btnTextColor = "#256029";
                    fontWeight = "bold";
                    border = "2px solid #388e3c";
                  } else if (caseOpt === guess.case) {
                    btnColor = "#ffcdd2";
                    btnTextColor = "#b71c1c";
                    fontWeight = "bold";
                    border = "2px solid #b71c1c";
                  }
                } else if (guess.case === caseOpt) {
                  btnColor = "#1976d2";
                  btnTextColor = "#fff";
                  fontWeight = "bold";
                  border = "2px solid #1976d2";
                }
                const dynamicStyles = {
                  background: btnColor,
                  color: btnTextColor,
                  border,
                  fontWeight,
                };
                return (
                  <button
                    key={caseOpt}
                    type="button"
                    onClick={() => setGuess({ ...guess, case: caseOpt })}
                    disabled={showAnswer}
                    style={{ ...styles.choiceButton, ...dynamicStyles }}
                  >
                    {caseOpt}
                  </button>
                );
              })}
            </div>
          </label>
        )}
      </div>
      {!showAnswer && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          <button onClick={handleGuess} style={styles.guessButton}>{t(language, "guess")}</button>
        </div>
      )}
      {showAnswer && level === 1 && mode !== "case" && (
        <div style={{ marginTop: "1rem" }}></div>
      )}
      {showAnswer && level === 2 && mode !== "case" && (
        <div style={styles.feedbackContainer}>
          <div>
            <b>{t(language, "preposition")}:</b>
            <span style={{ ...styles.feedbackText, ...(guess.prep.trim().toLowerCase() === (current["Preposition"]?.trim().toLowerCase() || '') ? styles.feedbackCorrect : styles.feedbackIncorrect) }}>
              {guess.prep}
            </span>
            {guess.prep.trim().toLowerCase() !== (current["Preposition"]?.trim().toLowerCase() || '') && current["Preposition"] && (
              <span style={styles.feedbackExpected}>
                ({current["Preposition"]})
              </span>
            )}
          </div>
        </div>
      )}
      {showAnswer && (
        <div onClick={nextVerb} style={styles.exampleTranslation}>
          <div><b>{t(language, "example")}:</b> {current["Exemple"]}</div>
          <div><b>{t(language, "translation")}:</b> {getCurrentTranslation(current)}</div>
        </div>
      )}
      <div style={styles.progressBarContainer}>
        <div style={{ ...styles.progressBarFill, width: `${(progress.learned.length / verbs.length) * 100}%` }}></div>
      </div>
      <div style={styles.scoreText}>
        <b>{t(language, "score")}:</b> {progress.score} | <b>{t(language, "learned")}:</b> {progress.learned.length}/{verbs.length}
      </div>
      {/* Settings modal for mode/level/language */}
      {showSettings && (
        <div style={styles.settingsModalOverlay} onClick={() => setShowSettings(false)}>
          <div style={styles.settingsModalCard} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowSettings(false)}
              style={styles.closeButton}
              aria-label={t(language, "close")}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="9.5" stroke="#1976d2" strokeWidth="1.5" fill="none" />
                <path d="M8 8l8 8M16 8l-8 8" stroke="#1976d2" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <h3 style={styles.settingsHeading}>{t(language, "settings")}</h3>
            <div style={{ margin: "1.2rem 0", width: "100%" }}>
              <div style={{ marginBottom: "1rem", width: "100%" }}>
                <label style={styles.settingsLabel}>{t(language, "mode")}:</label>
                <select value={mode} onChange={e => setMode(e.target.value)} style={styles.settingsSelect}>
                  <option value="both">{t(language, "modeBoth")}</option>
                  <option value="prep">{t(language, "modePrep")}</option>
                  <option value="case">{t(language, "modeCase")}</option>
                </select>
              </div>
              <div style={{ width: "100%" }}>
                <label style={styles.settingsLabel}>{t(language, "level")}:</label>
                <select value={level} onChange={e => setLevel(Number(e.target.value))} style={styles.settingsSelect}>
                  <option value={1}>{t(language, "level1")}</option>
                  <option value={2}>{t(language, "level2")}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
      <div style={{ position: "absolute", top: 16, right: 16, zIndex: 10 }}>
        <button
          aria-label={t(language, "settings")}
          onClick={() => setShowSettings((s) => !s)}
          style={styles.settingsButton}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="3.2" stroke="#1976d2" strokeWidth="2"/>
            <path d="M19.4 13c.04-.32.06-.65.06-.99s-.02-.67-.06-.99l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.03 7.03 0 0 0-1.71-.99l-.38-2.65A.5.5 0 0 0 13 2h-4a.5.5 0 0 0-.5.42l-.38 2.65c-.63.25-1.22.58-1.77.99l-2.49-1a.5.5 0 0 0-.61.22l-2 3.46a.5.5 0 0 0 .12.64l2.11 1.65c-.04.32-.06.65-.06.99s.02.67.06.99l-2.11 1.65a.5.5 0 0 0-.12.64l2 3.46c.14.24.44.32.68.22l2.49-1c.55.41 1.14.74 1.77.99l.38 2.65c.05.28.27.48.5.48h4c.23 0 .45-.2.5-.48l.38-2.65c.63-.25 1.22-.58 1.77-.99l2.49 1c.24.1.54.02.68-.22l2-3.46a.5.5 0 0 0-.12-.64l-2.11-1.65z" stroke="#1976d2" strokeWidth="1.5" fill="none"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
