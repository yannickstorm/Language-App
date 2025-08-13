import React, { useState, useEffect, useRef } from 'react';
import styles from './AppStyles';

const CSV_FILE = '/adjektivdeklination.csv';

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i]; });
    return obj;
  });
}

function getTranslation(row, language) {
  if (language === 'en') return row.ExampleTranslation_en;
  if (language === 'fr') return row.ExampleTranslation_fr;
  if (language === 'es') return row.ExampleTranslation_es;
  return row.Beispielsatz;
}

export default function CaseAdjectiveTrainer({ language, onBack }) {
  const [rows, setRows] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(null);
  const [guess, setGuess] = useState({ determinant: '', adj: '', decl: '', nounEnding: '' });
  const [showAnswer, setShowAnswer] = useState(false);
  const [csvError, setCsvError] = useState(null);
  const [showGenusIdx, setShowGenusIdx] = useState(null); // Track which noun's genus tooltip is shown
  const inputRef = useRef(null);

  useEffect(() => {
    fetch(CSV_FILE)
      .then(r => r.text())
      .then(text => {
        const parsed = parseCSV(text);
        setRows(parsed);
        setCurrentIdx(Math.floor(Math.random() * parsed.length));
      })
      .catch(e => setCsvError(e.message));
  }, []);

  function handleGuess() {
    setShowAnswer(true);
  }

  function nextExample() {
    setShowAnswer(false);
    setGuess({ determinant: '', adj: '', decl: '', nounEnding: '' });
    setCurrentIdx(Math.floor(Math.random() * rows.length));
    if (inputRef.current) inputRef.current.focus();
  }

  // Only run auto-validation effect if current is defined and not loading
  useEffect(() => {
    if (!rows.length || currentIdx === null) return;
    const current = rows[currentIdx];
    if (!current) return;
    const det = current.Determinant;
    const artikel = ["der", "die", "das", "den", "dem", "des"];
    const einOpts = ["ein", "eine", "einen", "einem", "einer", "eines"];
    let options = null;
    if (det && artikel.includes(det)) options = artikel;
    else if (det && det.startsWith("ein")) options = einOpts;
    // Genitive noun ending required for genitive case (check Kasus)
    const isGenitive = current.Kasus && current.Kasus.toLowerCase() === 'genitiv';
    if (!showAnswer && options) {
      if (isGenitive) {
        if (guess.determinant && guess.decl && guess.nounEnding) handleGuess();
      } else {
        if (guess.determinant && guess.decl) handleGuess();
      }
    }
    // If no determinant, require declination and noun ending (if genitive)
    if (!showAnswer && !options) {
      if (isGenitive) {
        if (guess.decl && guess.nounEnding) handleGuess();
      } else {
        if (guess.decl) handleGuess();
      }
    }
  }, [rows, currentIdx, guess.determinant, guess.decl, guess.nounEnding, showAnswer]);

  if (csvError) {
    return (
      <div style={{ color: 'red', padding: '2rem', textAlign: 'center', fontWeight: 'bold', fontSize: '1.2em' }}>
        Error: {csvError}
        <button style={styles.guessButton} onClick={onBack}>Back to Menu</button>
      </div>
    );
  }
  if (!rows.length || currentIdx === null) return <div>Loading...</div>;

  const current = rows[currentIdx];
  // Present German sentence with custom placeholder for determinant, declension, and noun ending (genitive)
  function getCustomForm(row, showAnswer, guess, showGenus, onToggleGenus) {
    const { Determinant, Adjektiv, Adjektivdeklination, Nomen, Kasus, Genus } = row;
    let detPlaceholder = '';
    let declPlaceholder = '__';
    let nounForm = Nomen;
    const artikel = ["der", "die", "das", "den", "dem", "des"];
    // Determinant placeholder
    if (Determinant && artikel.includes(Determinant)) detPlaceholder = "d__";
    else if (Determinant && Determinant.startsWith("ein")) detPlaceholder = "ein__";
    // Noun ending placeholder for genitive
    const isGenitive = Kasus && Kasus.toLowerCase() === 'genitiv';
    // Genus color coding (distinct from Kasus, no green, no similar hues)
    const genusColors = {
      'm': { bg: '#ffe082', color: '#6d4c00' },    // Orange, brown text
      'f': { bg: '#80cbc4', color: '#004d40' },   // Teal, dark teal text
      'n': { bg: '#f8bbd0', color: '#ad1457' }    // Pink, deep pink text
    };
    const genusKey = (row.Genus || '').trim().toLowerCase().charAt(0);
    const genusStyle = genusColors[genusKey] || { bg: '#ececec', color: '#222' };
    // Noun display with genus background color (not a badge), and click-to-show-genus
    let nounDisplay = Nomen;
    const genusLabels = { m: 'Maskulin', f: 'Feminin', n: 'Neutrum' };
    const genusLabel = genusLabels[genusKey] || row.Genus || '';
    if (Nomen) {
      // For Genitiv, show the placeholder or green 'es' ending in the clickable span
      let displayNoun = Nomen;
      if (isGenitive && !showAnswer) {
        displayNoun = Nomen.replace(/(es)?$/, '__');
      } else if (isGenitive && showAnswer && typeof Nomen === 'string' && Nomen.match(/es$/)) {
        const base = Nomen.slice(0, -2);
        displayNoun = <>{base}<span style={{ color: '#388e3c', fontWeight: 'bold', background: '#c8e6c9', borderRadius: 4, padding: '0 4px', fontSize: '1.08em' }}>es</span></>;
      }
      nounDisplay = (
        <span style={{ position: 'relative', display: 'inline-block' }}>
          <span
            style={{
              background: genusStyle.bg,
              color: genusStyle.color,
              borderRadius: 6,
              padding: '2px 8px',
              fontWeight: 'bold',
              fontSize: '1.08em',
              marginLeft: 2,
              marginRight: 2,
              letterSpacing: '0.5px',
              boxShadow: '0 1px 2px #0001',
              verticalAlign: 'middle',
              cursor: 'pointer',
              transition: 'box-shadow 0.2s',
              border: showGenus ? '2px solid #3332' : 'none',
              display: 'inline-block'
            }}
            title="Click to show Genus"
            onClick={e => { e.stopPropagation(); onToggleGenus(); }}
          >
            {displayNoun}
          </span>
          {showGenus && genusLabel && (
            <span style={{
              position: 'absolute',
              left: '50%',
              top: '100%',
              transform: 'translateX(-50%)',
              background: '#fff',
              color: genusStyle.color,
              border: `1.5px solid ${genusStyle.bg}`,
              borderRadius: 8,
              padding: '4px 14px',
              fontWeight: 'bold',
              fontSize: '1em',
              marginTop: 6,
              boxShadow: '0 2px 8px #0002',
              zIndex: 20,
              whiteSpace: 'nowrap',
              pointerEvents: 'none'
            }}>
              {genusLabel}
            </span>
          )}
        </span>
      );
    }
    if (isGenitive) {
      // nounDisplay is always clickable, nothing else to do
    }
    // Adjective declension
    let adjFull = null;
    if (!showAnswer) {
      adjFull = Adjektiv + declPlaceholder;
    } else {
      adjFull = <>{Adjektiv}<span style={{ color: '#388e3c', fontWeight: 'bold', background: '#c8e6c9', borderRadius: 4, padding: '0 4px', fontSize: '1.08em' }}>{row.Adjektivdeklination}</span></>;
    }
    // Determinant
    let detSpan = null;
    if (showAnswer && Determinant && Determinant.trim() !== '') {
      detSpan = <span style={{ color: '#388e3c', fontWeight: 'bold', background: '#c8e6c9', borderRadius: 4, padding: '0 4px', fontSize: '1.08em' }}>{Determinant}</span>;
    } else if (detPlaceholder) {
      detSpan = detPlaceholder;
    }
    // Compose
    return <>{detSpan ? <>{detSpan} </> : null}{adjFull} {nounDisplay}</>;
  }
  // Use getCustomForm for sentence rendering, pass genus tooltip state/handler
  const customForm = getCustomForm(
    current,
    showAnswer,
    guess,
    showGenusIdx === currentIdx,
    () => setShowGenusIdx(showGenusIdx === currentIdx ? null : currentIdx)
  );
  let germanSentence = current.Beispielsatz;
  if (germanSentence.includes('{FORM}')) {
    const parts = germanSentence.split('{FORM}');
    germanSentence = <>{parts[0]}{customForm}{parts[1]}</>;
  } else if (germanSentence.includes(current.Form)) {
    const parts = germanSentence.split(current.Form);
    germanSentence = <>{parts[0]}{customForm}{parts[1]}</>;
  }
  let exampleTranslation = getTranslation(current, language);
  if (exampleTranslation.includes('{FORM}')) {
    const parts = exampleTranslation.split('{FORM}');
    exampleTranslation = <>{parts[0]}{customForm}{parts[1]}</>;
  } else if (exampleTranslation.includes(current.Form)) {
    const parts = exampleTranslation.split(current.Form);
    exampleTranslation = <>{parts[0]}{customForm}{parts[1]}</>;
  }

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
      <h2 style={styles.header}>Kasus und Deklination</h2>
      <div style={styles.verbDisplay}>
        <div style={{ textAlign: 'center', width: '100%' }}>
          {/* Kasus badge with color coding */}
          {current.Kasus && (
            <span style={{
              display: 'inline-block',
              background: (() => {
                switch ((current.Kasus || '').toLowerCase()) {
                  case 'nominativ': return '#bbdefb'; // blue
                  case 'akkusativ': return '#ffcdd2'; // red
                  case 'dativ': return '#d1c4e9'; // purple
                  case 'genitiv': return '#bcaaa4'; // brown
                  default: return '#f5f5f5';
                }
              })(),
              color: (() => {
                switch ((current.Kasus || '').toLowerCase()) {
                  case 'nominativ': return '#0d47a1';
                  case 'akkusativ': return '#b71c1c';
                  case 'dativ': return '#4527a0';
                  case 'genitiv': return '#4e342e';
                  default: return '#333';
                }
              })(),
              borderRadius: 12,
              padding: '2px 14px',
              fontWeight: 'bold',
              fontSize: '1.1em',
              letterSpacing: '0.5px',
              marginBottom: 4
            }}>
              {current.Kasus}
            </span>
          )}
          <span style={{ ...styles.verbText, fontSize: '2em', letterSpacing: '1px' }}>
            {germanSentence}
          </span>
          <div style={styles.verbTranslation}>
            ({exampleTranslation})
          </div>
        </div>
      </div>
      {/* Determinant field logic based on placeholder */}
      {(() => {
        const det = current.Determinant;
        const artikel = ["der", "die", "das", "den", "dem", "des"];
        const einOpts = ["ein", "eine", "einen", "einem", "einer", "eines"];
        let options = null;
        if (artikel.includes(det)) options = artikel;
        else if (det.startsWith("ein")) options = einOpts;
        if (!options) return null;
        return (
          <div style={{ margin: '1rem 0', width: '100%' }}>
            <label style={{ ...styles.settingsLabel, marginBottom: 8 }}>Determinant:</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(40px, 1fr))', gap: 8, justifyItems: 'center' }}>
              {options.map(opt => {
                let btnColor = '#fff';
                let btnTextColor = '#1976d2';
                let border = '1px solid #1976d2';
                let fontWeight = 'normal';
                if (showAnswer) {
                  const correctDet = current.Determinant.trim().toLowerCase();
                  if (opt.trim().toLowerCase() === correctDet) {
                    btnColor = guess.determinant.trim().toLowerCase() === correctDet ? '#c8e6c9' : '#bbdefb';
                    btnTextColor = '#256029';
                    fontWeight = 'bold';
                    border = '2px solid #388e3c';
                  } else if (opt === guess.determinant) {
                    btnColor = '#ffcdd2';
                    btnTextColor = '#b71c1c';
                    fontWeight = 'bold';
                    border = '2px solid #b71c1c';
                  }
                } else if (guess.determinant === opt) {
                  btnColor = '#1976d2';
                  btnTextColor = '#fff';
                  fontWeight = 'bold';
                  border = '2px solid #1976d2';
                }
                return (
                  <button
                    key={opt}
                    style={{
                      ...styles.prepInput,
                      background: btnColor,
                      color: btnTextColor,
                      border,
                      fontWeight,
                      minWidth: 40,
                      padding: '6px 0',
                      fontSize: '1em',
                      borderRadius: 6
                    }}
                    disabled={showAnswer}
                    onClick={() => setGuess({ ...guess, determinant: opt })}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}
      {/* Declination multiple choice */}
      <div style={{ width: '100%', marginBottom: '1rem' }}>
        <label style={{ ...styles.settingsLabel, marginBottom: 8 }}>Declination:</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(40px, 1fr))', gap: 8, justifyItems: 'center' }}>
          {["e", "en", "er", "es"].map(opt => {
            let btnColor = '#fff';
            let btnTextColor = '#1976d2';
            let border = '1px solid #1976d2';
            let fontWeight = 'normal';
            if (showAnswer) {
              const correctDecl = current.Adjektivdeklination.trim().toLowerCase();
              if (opt.trim().toLowerCase() === correctDecl) {
                btnColor = guess.decl.trim().toLowerCase() === correctDecl ? '#c8e6c9' : '#bbdefb';
                btnTextColor = '#256029';
                fontWeight = 'bold';
                border = '2px solid #388e3c';
              } else if (opt === guess.decl) {
                btnColor = '#ffcdd2';
                btnTextColor = '#b71c1c';
                fontWeight = 'bold';
                border = '2px solid #b71c1c';
              }
            } else if (guess.decl === opt) {
              btnColor = '#1976d2';
              btnTextColor = '#fff';
              fontWeight = 'bold';
              border = '2px solid #1976d2';
            }
            return (
              <button
                key={opt}
                style={{
                  ...styles.prepInput,
                  background: btnColor,
                  color: btnTextColor,
                  border,
                  fontWeight,
                  minWidth: 40,
                  padding: '6px 0',
                  fontSize: '1em',
                  borderRadius: 6
                }}
                disabled={showAnswer}
                onClick={() => setGuess({ ...guess, decl: opt })}
              >
                {'-' + opt}
              </button>
            );
          })}
        </div>
      </div>
      {/* Genitive noun ending multiple choice: show before and after validation */}
      {current.Kasus && current.Kasus.toLowerCase() === 'genitiv' && (
        <div style={{ width: '100%', marginBottom: '1rem' }}>
          <label style={{ ...styles.settingsLabel, marginBottom: 8 }}>Noun Ending:</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(40px, 1fr))', gap: 8, justifyItems: 'center' }}>
            {["-", "-es"].map(opt => {
              let btnColor = '#fff';
              let btnTextColor = '#1976d2';
              let border = '1px solid #1976d2';
              let fontWeight = 'normal';
              // Determine correct ending based on noun
              const nounEndsWithEs = current.Nomen && current.Nomen.trim().toLowerCase().endsWith('es');
              const correctEnding = nounEndsWithEs ? "-es" : "-";
              if (showAnswer) {
                if (opt === correctEnding) {
                  btnColor = guess.nounEnding === correctEnding ? '#c8e6c9' : '#bbdefb';
                  btnTextColor = '#256029';
                  fontWeight = 'bold';
                  border = '2px solid #388e3c';
                } else if (opt === guess.nounEnding) {
                  btnColor = '#ffcdd2';
                  btnTextColor = '#b71c1c';
                  fontWeight = 'bold';
                  border = '2px solid #b71c1c';
                }
              } else if (guess.nounEnding === opt) {
                btnColor = '#1976d2';
                btnTextColor = '#fff';
                fontWeight = 'bold';
                border = '2px solid #1976d2';
              }
              return (
                <button
                  key={opt}
                  style={{
                    ...styles.prepInput,
                    background: btnColor,
                    color: btnTextColor,
                    border,
                    fontWeight,
                    minWidth: 40,
                    padding: '6px 0',
                    fontSize: '1em',
                    borderRadius: 6
                  }}
                  disabled={showAnswer}
                  onClick={() => setGuess({ ...guess, nounEnding: opt })}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {/* Guess button to reveal the answer directly */}
      {!showAnswer && (
        <button
          style={{ ...styles.guessButton, margin: '1rem auto', display: 'block', minWidth: 120 }}
          onClick={handleGuess}
        >
          Guess
        </button>
      )}
      {/* Show German and translation when answer is shown, click anywhere to go to next */}
      {showAnswer && false && (
        <div
          style={styles.exampleTranslation}
          onClick={nextExample}
        >
          <div><b>German:</b> {current.Beispielsatz.replace(/\{FORM\}/g, current.Form)}</div>
          <div><b>Translation:</b> {getTranslation(current, language)}</div>
        </div>
      )}
      {/* Clickable region for next guess when answer is validated, only over multiple choice area */}
      {showAnswer && (
        <div>
          <div style={{ textAlign: 'center', color: '#1976d2', fontWeight: 'bold', fontSize: '1.1em', margin: '1.5rem 0 0.5rem 0' }}>
            (Click anywhere below to continue)
          </div>
          <div
            style={{ position: 'absolute', left: 0, right: 0, top: 'calc(100% - 12rem)', height: '12rem', zIndex: 5, cursor: 'pointer', background: 'rgba(255,255,255,0)' }}
            onClick={nextExample}
          />
        </div>
      )}
    </div>
  );
}
