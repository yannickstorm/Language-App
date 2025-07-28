import React, { useEffect, useState, useRef } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { getRandomIndex, loadProgress, saveProgress, loadAttempts, saveAttempts } from './utils';
import { fetchAndParseCSV } from './csvLoader';

// const CSV_FILE = '/Top_50_Verbes_avec_exemples_traduits.csv';
// const CSV_FILE = '/Top_50_Verbes_avec_Faux_Pr_positionen.csv';
const CSV_FILE = '/Test3.csv';

export default function App() {
  const [verbs, setVerbs] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(null);
  const [guess, setGuess] = useState({ prep: '', case: '' });
  const [showAnswer, setShowAnswer] = useState(false);
  const [progress, setProgress] = useState(loadProgress());
  const [attempts, setAttempts] = useState(loadAttempts()); // { [idx]: correctCount }
  const [csvError, setCsvError] = useState(null);
  const [mode, setMode] = useState(() => {
    const savedMode = localStorage.getItem('mode');
    return (savedMode && ['prep', 'case', 'both'].includes(savedMode)) ? savedMode : 'both';
  }); // 'prep', 'case', 'both'
  const [prepositionChoices, setPrepositionChoices] = useState([]);
  const [level, setLevel] = useState(() => {
    const saved = localStorage.getItem('level');
    return saved === '2' ? 2 : 1;
  });
  const [showSettings, setShowSettings] = useState(false);
  const inputRef = useRef(null);

  // Helper to get a unique key for each verb (verb+preposition+example)
  function getVerbKey(verbObj) {
    return `${verbObj['Verb']}|${verbObj['Preposition']}|${verbObj['Exemple']}`;
  }

  // Helper to get shuffled preposition choices
  function getPrepositionChoices(current) {
    const correct = current['Preposition']?.trim();
    let wrongs = [];
    try {
      wrongs = JSON.parse(current['WrongPrepositions']);
    } catch {
      wrongs = (current['WrongPrepositions'] || '').split(',').map(p => p.trim()).filter(Boolean);
    }
    // Pick 3 random wrongs
    const shuffledWrongs = wrongs.sort(() => Math.random() - 0.5).slice(0, 3);
    const choices = [correct, ...shuffledWrongs].filter(Boolean);
    // Shuffle all choices
    return choices.sort(() => Math.random() - 0.5);
  }

  useEffect(() => {
    fetchAndParseCSV(CSV_FILE, loadProgress(), setVerbs, setCurrentIdx, setCsvError);
  }, [CSV_FILE]);

  useEffect(() => {
    // Only update progress/attempts if verbs have changed (not on every render)
    if (!verbs.length) return;
    const savedProgress = loadProgress();
    const savedAttempts = loadAttempts();
    // Build new progress/attempts for current CSV
    const newLearned = [];
    const newAttempts = {};
    verbs.forEach((v, idx) => {
      const key = getVerbKey(v);
      // Find saved key for this verb
      if (savedAttempts[key] !== undefined) {
        newAttempts[idx] = savedAttempts[key];
      }
      if (savedProgress.learned && Array.isArray(savedProgress.learned)) {
        // Check if this verb was learned by key
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
    // Save progress and attempts by verb key, not index
    if (!verbs.length) return;
    const progressToSave = {
      score: progress.score,
      learned: progress.learned
        .map(idx => verbs[idx] ? getVerbKey(verbs[idx]) : null)
        .filter(Boolean)
    };
    saveProgress(progressToSave);
    // Save attempts by verb key
    const attemptsToSave = {};
    Object.entries(attempts).forEach(([idx, val]) => {
      if (verbs[idx]) {
        attemptsToSave[getVerbKey(verbs[idx])] = val;
      }
    });
    saveAttempts(attemptsToSave);
  }, [progress, attempts, verbs]);

  useEffect(() => {
    if (['prep', 'case', 'both'].includes(mode)) {
      localStorage.setItem('mode', mode);
    }
  }, [mode]);

  useEffect(() => {
    if (verbs.length && currentIdx !== null && mode !== 'case' && level === 1) {
      setPrepositionChoices(getPrepositionChoices(verbs[currentIdx]));
    }
  }, [verbs, currentIdx, mode, level]);

  useEffect(() => {
    localStorage.setItem('level', level);
  }, [level]);

  useEffect(() => {
    // Restore level from localStorage if available
    const saved = localStorage.getItem('level');
    if (saved === '2') setLevel(2);
    else setLevel(1);
  }, []);

  useEffect(() => {
    // Focus the text input when level 2 and preposition input is shown
    if (level === 2 && mode !== 'case' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [level, mode, currentIdx, showAnswer]);

  useHotkeys('enter', (event) => {
    // Only trigger guess if text input is focused (level 2)
    if (level === 2 && inputRef.current && document.activeElement === inputRef.current && !showAnswer) {
      handleGuess();
    } else if (showAnswer) {
      nextVerb();
    }
  });

  function handleGuess() {
    const current = verbs[currentIdx];
    const correctPrep = current['Preposition']?.trim().toLowerCase();
    const correctCase = current['Case']?.trim().toLowerCase();
    let isCorrect = true;
    if (mode !== 'case') {
      isCorrect = isCorrect && (guess.prep.trim().toLowerCase() === correctPrep);
    }
    if (mode !== 'prep') {
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
      // Only add to learned if correct 3 times and not already learned
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
    // Do not mark as learned on give up
  }

  useEffect(() => {
    // Automatically trigger guess when all required selections are made, except for text input (level 2)
    if (!showAnswer) {
      if (level === 1) {
        if (mode === 'both' && guess.prep && guess.case) {
          handleGuess();
        } else if (mode === 'prep' && guess.prep) {
          handleGuess();
        } else if (mode === 'case' && guess.case) {
          handleGuess();
        }
      }
    }
  }, [guess, mode, level, showAnswer]);

  function handleInputKeyDown(e) {
    if (e.key === 'Enter' && !showAnswer) {
      handleGuess();
    }
  }

  if (csvError) {
    return (
      <div style={{ color: 'red', padding: '2rem', textAlign: 'center', fontWeight: 'bold', fontSize: '1.2em' }}>
        Error: {csvError}
      </div>
    );
  }
  if (!verbs.length || currentIdx === null) return <div>Loading...</div>;
  if (progress.learned.length === verbs.length) {
    return (
      <div style={{ maxWidth: 500, margin: '2rem auto', padding: '2rem', border: '1px solid #ccc', borderRadius: 8, textAlign: 'center' }}>
        <h2>German Verb Trainer</h2>
        <div style={{ fontSize: '1.2em', margin: '2rem 0' }}>
          🎉 All verbs learned! 🎉<br />
          <b>Score:</b> {progress.score} / {verbs.length}
        </div>
        <button onClick={() => {
          setProgress({ score: 0, learned: [] });
          setAttempts({});
          setCurrentIdx(getRandomIndex(verbs.length, []));
        }}>
          Restart
        </button>
      </div>
    );
  }

  const current = verbs[currentIdx];

  return (
    <div style={{
      width: '100vw',
      margin: 0,
      padding: '1rem',
      borderRadius: 24,
      boxSizing: 'border-box',
      background: 'linear-gradient(135deg, #e3f0ff 0%, #f9fbe7 100%)',
      fontSize: '1.1em',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      justifyContent: 'flex-end',
      position: 'relative',
      boxShadow: '0 8px 32px rgba(44, 62, 80, 0.12)',
    }}>
      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
        <button
          aria-label="Settings"
          onClick={() => setShowSettings((s) => !s)}
          style={{
            background: '#eee',
            border: 'none',
            borderRadius: '50%',
            width: 48,
            height: 48,
            fontSize: '1.5em',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
        >
          {/* Modern SVG gear icon */}
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="3.2" stroke="#1976d2" strokeWidth="2"/>
            <path d="M19.4 13c.04-.32.06-.65.06-.99s-.02-.67-.06-.99l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.03 7.03 0 0 0-1.71-.99l-.38-2.65A.5.5 0 0 0 13 2h-4a.5.5 0 0 0-.5.42l-.38 2.65c-.63.25-1.22.58-1.77.99l-2.49-1a.5.5 0 0 0-.61.22l-2 3.46a.5.5 0 0 0 .12.64l2.11 1.65c-.04.32-.06.65-.06.99s.02.67.06.99l-2.11 1.65a.5.5 0 0 0-.12.64l2 3.46c.14.24.44.32.68.22l2.49-1c.55.41 1.14.74 1.77.99l.38 2.65c.05.28.27.48.5.48h4c.23 0 .45-.2.5-.48l.38-2.65c.63-.25 1.22-.58 1.77-.99l2.49 1c.24.1.54.02.68-.22l2-3.46a.5.5 0 0 0-.12-.64l-2.11-1.65z" stroke="#1976d2" strokeWidth="1.5" fill="none"/>
          </svg>
        </button>
      </div>
      {/* Settings modal/card */}
      {showSettings && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(44,62,80,0.10)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
          onClick={() => setShowSettings(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              boxShadow: '0 4px 24px rgba(44,62,80,0.12)',
              padding: '2rem 1.5rem 1.5rem 1.5rem',
              minWidth: 300,
              maxWidth: '90vw',
              position: 'relative',
              border: '1px solid #e3eafc',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowSettings(false)}
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                background: '#e3eafc',
                border: 'none',
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#1976d2',
                boxShadow: '0 1px 4px #e3eafc',
                transition: 'background 0.2s',
                padding: 0,
              }}
              aria-label="Close settings"
            >
              {/* Modern SVG X icon, styled like gear icon */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="9.5" stroke="#1976d2" strokeWidth="1.5" fill="none" />
                <path d="M8 8l8 8M16 8l-8 8" stroke="#1976d2" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <h3 style={{ marginTop: 0, color: '#1976d2', textAlign: 'center', fontWeight: 'bold', fontSize: '1.2em', letterSpacing: '1px' }}>Settings</h3>
            <div style={{ margin: '1.2rem 0', width: '100%' }}>
              <div style={{ marginBottom: '1rem', width: '100%' }}>
                <label style={{ fontWeight: 'bold', marginRight: 8, color: '#1976d2', fontSize: '1em' }}>Mode:</label>
                <select value={mode} onChange={e => setMode(e.target.value)} style={{ fontSize: '1em', padding: '8px 12px', borderRadius: 6, border: '1px solid #bdbdbd', background: '#f7fbff', color: '#1976d2', width: '100%', marginTop: 6 }}>
                  <option value="both">Preposition + Case</option>
                  <option value="prep">Preposition only</option>
                  <option value="case">Case only</option>
                </select>
              </div>
              <div style={{ width: '100%' }}>
                <label style={{ fontWeight: 'bold', marginRight: 8, color: '#1976d2', fontSize: '1em' }}>Level:</label>
                <select value={level} onChange={e => setLevel(Number(e.target.value))} style={{ fontSize: '1em', padding: '8px 12px', borderRadius: 6, border: '1px solid #bdbdbd', background: '#f7fbff', color: '#1976d2', width: '100%', marginTop: 6 }}>
                  <option value={1}>Multiple Choice</option>
                  <option value={2}>Text Input</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
      <h2 style={{ fontSize: '1.7em', textAlign: 'center', marginBottom: '1rem', marginTop: 0, color: '#1976d2', letterSpacing: '1px', textShadow: '0 2px 8px #e3eafc' }}>German Verb Trainer</h2>
      {/* Centered verb display with emphasis and animation */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 0, width: '100%' }}>
        <div style={{ textAlign: 'center', width: '100%' }}>
          <span style={{ display: 'block', width: '100%', fontSize: '2.6em', fontWeight: 'bold', color: '#1976d2', letterSpacing: '1px', textShadow: '0 4px 16px #b3c6ff', textAlign: 'center', transition: 'transform 0.3s', transform: showAnswer ? 'scale(1.08)' : 'scale(1)' }}>
            {current['Verb']}
          </span>
          <div style={{ color: '#888', fontStyle: 'italic', fontSize: '1.2em', marginTop: 8 }}>
            ({current['Translation']})
          </div>
        </div>
      </div>
      <div
        style={{ flex: 1, position: 'relative' }}
        onClick={(e) => {
          // Prevent nextVerb if clicking on the settings button or its parent
          if (showAnswer) {
            let el = e.target;
            while (el) {
              if (el.getAttribute && el.getAttribute('aria-label') === 'Settings') return;
              el = el.parentElement;
            }
            nextVerb();
          }
        }}
      >
        {/* Show overlay prompt when answer is displayed */}
        {showAnswer && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              background: 'rgba(25, 118, 210, 0.08)',
              color: '#1976d2',
              textAlign: 'center',
              fontSize: '1.2em',
              fontWeight: 'bold',
              padding: '18px 0',
              borderRadius: '0 0 24px 24px',
              cursor: 'pointer',
              zIndex: 2,
              boxShadow: '0 -2px 8px #e3eafc',
              userSelect: 'none',
            }}
          >
            Tap to continue
          </div>
        )}
      </div>
      <div style={{ margin: '1rem 0' }}>
        {mode !== 'case' && (
          <label style={{ display: 'block', marginBottom: 12 }}>
            <span style={{ fontWeight: 'bold', fontSize: '1.1em' }}>Preposition:</span>
            {level === 1 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: 8 }}>
                {prepositionChoices.map((prep) => {
                  let btnColor = '#eee';
                  let btnTextColor = '#333';
                  let fontWeight = 'normal';
                  let border = '1px solid #bdbdbd';
                  if (showAnswer) {
                    const correctPrep = current['Preposition']?.trim().toLowerCase();
                    if (prep.trim().toLowerCase() === correctPrep) {
                      btnColor = guess.prep.trim().toLowerCase() === correctPrep ? '#c8e6c9' : '#bbdefb';
                      btnTextColor = '#256029';
                      fontWeight = 'bold';
                      border = '2px solid #388e3c';
                    } else if (prep === guess.prep) {
                      btnColor = '#ffcdd2';
                      btnTextColor = '#b71c1c';
                      fontWeight = 'bold';
                      border = '2px solid #b71c1c';
                    }
                  } else if (guess.prep === prep) {
                    btnColor = '#1976d2';
                    btnTextColor = '#fff';
                    fontWeight = 'bold';
                    border = '2px solid #1976d2';
                  }
                  return (
                    <button
                      key={prep}
                      type="button"
                      onClick={() => setGuess({ ...guess, prep })}
                      disabled={showAnswer}
                      style={{
                        background: btnColor,
                        color: btnTextColor,
                        border,
                        borderRadius: '4px',
                        padding: '16px 0',
                        cursor: 'pointer',
                        outline: 'none',
                        fontWeight,
                        width: '100%',
                        fontSize: '1.2em',
                        transition: 'background 0.2s, border 0.2s',
                      }}
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
                style={{ marginTop: 8, width: '100%', fontSize: '1.2em', padding: '12px', borderRadius: 4, border: '1px solid #bdbdbd' }}
              />
            )}
          </label>
        )}
        {mode !== 'prep' && (
          <label style={{ display: 'block', marginBottom: 12 }}>
            <span style={{ fontWeight: 'bold', fontSize: '1.1em' }}>Case:</span>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {['Akk', 'Dat'].map((caseOpt) => {
                let btnColor = '#eee';
                let btnTextColor = '#333';
                let fontWeight = 'normal';
                let border = '1px solid #bdbdbd';
                if (showAnswer) {
                  const correctCase = current['Case']?.trim().toLowerCase();
                  if (caseOpt.toLowerCase() === correctCase) {
                    btnColor = guess.case.trim().toLowerCase() === correctCase ? '#c8e6c9' : '#bbdefb';
                    btnTextColor = '#256029';
                    fontWeight = 'bold';
                    border = '2px solid #388e3c';
                  } else if (caseOpt === guess.case) {
                    btnColor = '#ffcdd2';
                    btnTextColor = '#b71c1c';
                    fontWeight = 'bold';
                    border = '2px solid #b71c1c';
                  }
                } else if (guess.case === caseOpt) {
                  btnColor = '#1976d2';
                  btnTextColor = '#fff';
                  fontWeight = 'bold';
                  border = '2px solid #1976d2';
                }
                return (
                  <button
                    key={caseOpt}
                    type="button"
                    onClick={() => setGuess({ ...guess, case: caseOpt })}
                    disabled={showAnswer}
                    style={{
                      background: btnColor,
                      color: btnTextColor,
                      border,
                      borderRadius: '4px',
                      padding: '16px 0',
                      cursor: 'pointer',
                      outline: 'none',
                      fontWeight,
                      width: '100%',
                      fontSize: '1.2em',
                      transition: 'background 0.2s, border 0.2s',
                    }}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          <button onClick={handleGuess} style={{ width: '100%', padding: '16px 0', fontSize: '1.2em', borderRadius: 4, border: '1px solid #1976d2', background: '#1976d2', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>Guess</button>
        </div>
      )}
      {showAnswer && level === 1 && mode !== 'case' && (
        <div style={{ marginTop: '1rem' }}></div>
      )}
      {showAnswer && level === 2 && mode !== 'case' && (
        <div style={{ marginTop: '1rem', background: '#f9f9f9', padding: '1rem', borderRadius: 4 }}>
          <div>
            <b>Preposition:</b>
            <span style={{
              color: guess.prep.trim().toLowerCase() === (current['Preposition']?.trim().toLowerCase() || '') ? 'green' : 'red',
              fontWeight: 'bold',
              marginLeft: 8
            }}>
              {guess.prep}
            </span>
            {guess.prep.trim().toLowerCase() !== (current['Preposition']?.trim().toLowerCase() || '') && current['Preposition'] && (
              <span style={{ color: 'blue', marginLeft: 8 }}>
                ({current['Preposition']})
              </span>
            )}
          </div>
        </div>
      )}
      {/* Only show Example and Translation when answer is displayed */}
      {showAnswer && (
        <div onClick={nextVerb} style={{ cursor: 'pointer' }}>
          <div><b>Example:</b> {current['Exemple']}</div>
          <div><b>Translation:</b> {current['ExampleTranslation']}</div>
        </div>
      )}
      {/* Progress bar for score */}
      <div style={{ width: '100%', margin: '1.5rem 0 0 0', height: 12, background: '#e3eafc', borderRadius: 6, overflow: 'hidden', boxShadow: '0 2px 8px #e3eafc' }}>
        <div style={{ width: `${(progress.learned.length / verbs.length) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #1976d2 0%, #388e3c 100%)', borderRadius: 6, transition: 'width 0.4s' }}></div>
      </div>
      <div style={{ marginTop: '0.5rem', fontSize: '1.1em', textAlign: 'center', color: '#1976d2', fontWeight: 'bold' }}>
        <b>Score:</b> {progress.score} | <b>Learned:</b> {progress.learned.length}/{verbs.length}
      </div>
    </div>
  );
}
