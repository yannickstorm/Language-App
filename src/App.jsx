import React, { useEffect, useState, useRef } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { getRandomIndex, loadProgress, saveProgress, loadAttempts, saveAttempts } from './utils';
import { fetchAndParseCSV } from './csvLoader';
import styles from './AppStyles';

const CSV_FILE = '/Top_50_Verbes_avec_exemples_traduits.csv';
// const CSV_FILE = '/Test3.csv';

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
	}
};

const supportedLanguages = [
	{ code: 'en', label: 'English' },
	{ code: 'fr', label: 'Français' }
];

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
	const [language, setLanguage] = useState(() => {
		const savedLang = localStorage.getItem('language');
		const found = supportedLanguages.find(l => l.code === savedLang);
		return found ? found.code : supportedLanguages[0].code;
	});
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

	useEffect(() => {
		localStorage.setItem('language', language);
	}, [language]);

	function t(key) {
		return translations[language][key] || key;
	}

	// Helper to get the correct translation for the verb
	function getVerbTranslation(current) {
		return current['Translation_' + language] || '';
	}

	// Helper to get the correct example translation
	function getCurrentTranslation(current) {
		return current['ExampleTranslation_' + language] || '';
	}

	if (csvError) {
		return (
			<div style={{ color: 'red', padding: '2rem', textAlign: 'center', fontWeight: 'bold', fontSize: '1.2em' }}>
				{t('error')} {csvError}
			</div>
		);
	}
	if (!verbs.length || currentIdx === null) return <div>{t('loading')}</div>;
	if (progress.learned.length === verbs.length) {
		return (
			<div style={{ maxWidth: 500, margin: '2rem auto', padding: '2rem', border: '1px solid #ccc', borderRadius: 8, textAlign: 'center' }}>
				<h2>{t('appTitle')}</h2>
				<div style={{ fontSize: '1.2em', margin: '2rem 0' }}>
					🎉 {t('allLearned')} 🎉<br />
					<b>{t('score')}:</b> {progress.score} / {verbs.length}
				</div>
				<button onClick={() => {
					setProgress({ score: 0, learned: [] });
					setAttempts({});
					setCurrentIdx(getRandomIndex(verbs.length, []));
				}}>
					{t('restart')}
				</button>
			</div>
		);
	}

	const current = verbs[currentIdx];


	return (
		<div style={styles.appContainer}>

			<div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
				<button
					aria-label={t('settings')}
					onClick={() => setShowSettings((s) => !s)}
					style={styles.settingsButton}
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
				<div style={styles.settingsModalOverlay} onClick={() => setShowSettings(false)}>
					<div style={styles.settingsModalCard} onClick={e => e.stopPropagation()}>

						<button
							onClick={() => setShowSettings(false)}
							style={styles.closeButton}
							aria-label={t('close')}
						>
							{/* Modern SVG X icon, styled like gear icon */}
							<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
								<circle cx="12" cy="12" r="9.5" stroke="#1976d2" strokeWidth="1.5" fill="none" />
								<path d="M8 8l8 8M16 8l-8 8" stroke="#1976d2" strokeWidth="2" strokeLinecap="round" />
							</svg>
						</button>

						<h3 style={styles.settingsHeading}>{t('settings')}</h3>

						<div style={{ margin: '1.2rem 0', width: '100%' }}>
							<div style={{ marginBottom: '1rem', width: '100%' }}>
								<label style={styles.settingsLabel}>{t('mode')}:</label>
								<select value={mode} onChange={e => setMode(e.target.value)} style={styles.settingsSelect}>
									<option value="both">{t('modeBoth')}</option>
									<option value="prep">{t('modePrep')}</option>
									<option value="case">{t('modeCase')}</option>
								</select>
							</div>

							<div style={{ width: '100%' }}>
								<label style={styles.settingsLabel}>{t('level')}:</label>
								<select value={level} onChange={e => setLevel(Number(e.target.value))} style={styles.settingsSelect}>
									<option value={1}>{t('level1')}</option>
									<option value={2}>{t('level2')}</option>
								</select>
							</div>

							<div style={{ width: '100%', marginTop: '1rem' }}>
								<label style={styles.settingsLabel}>{t('language')}:</label>
								<select value={language} onChange={e => setLanguage(e.target.value)} style={styles.settingsSelect}>
									{supportedLanguages.map(lang => (
										<option key={lang.code} value={lang.code}>{lang.label}</option>
									))}
								</select>
							</div>
						</div>

					</div>
				</div>
			)}

			<h2 style={styles.header}>{t('appTitle')}</h2>

			{/* Centered verb display with emphasis and animation */}
			<div style={styles.verbDisplay}>
				<div style={{ textAlign: 'center', width: '100%' }}>
					<span style={{ ...styles.verbText, transform: showAnswer ? 'scale(1.08)' : 'scale(1)' }}>
						{current['Verb']}
					</span>

					<div style={styles.verbTranslation}>
						({getVerbTranslation(current)})
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
					<div style={styles.nextOverlay}>
						{t('tapToContinue')}
					</div>
				)}
			</div>

			<div style={{ margin: '1rem 0' }}>
				{mode !== 'case' && (
					<label style={{ display: 'block', marginBottom: 12 }}>
						<span style={{ fontWeight: 'bold', fontSize: '1.1em' }}>{t('preposition')}:</span>

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

				{mode !== 'prep' && (
					<label style={{ display: 'block', marginBottom: 12 }}>
						<span style={{ fontWeight: 'bold', fontSize: '1.1em' }}>{t('case')}:</span>

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
				<div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
					<button onClick={handleGuess} style={styles.guessButton}>{t('guess')}</button>
				</div>
			)}

			{showAnswer && level === 1 && mode !== 'case' && (
				<div style={{ marginTop: '1rem' }}></div>
			)}

			{showAnswer && level === 2 && mode !== 'case' && (
				<div style={styles.feedbackContainer}>
					<div>
						<b>{t('preposition')}:</b>
						<span style={{ ...styles.feedbackText, ...(guess.prep.trim().toLowerCase() === (current['Preposition']?.trim().toLowerCase() || '') ? styles.feedbackCorrect : styles.feedbackIncorrect) }}>
							{guess.prep}
						</span>
						{guess.prep.trim().toLowerCase() !== (current['Preposition']?.trim().toLowerCase() || '') && current['Preposition'] && (
							<span style={styles.feedbackExpected}>
								({current['Preposition']})
							</span>
						)}
					</div>
				</div>
			)}

			{/* Only show Example and Translation when answer is displayed */}
			{showAnswer && (
				<div onClick={nextVerb} style={styles.exampleTranslation}>
					<div><b>{t('example')}:</b> {current['Exemple']}</div>
					<div><b>{t('translation')}:</b> {getCurrentTranslation(current)}</div>
				</div>
			)}

			{/* Progress bar for score */}
			<div style={styles.progressBarContainer}>
				<div style={{ ...styles.progressBarFill, width: `${(progress.learned.length / verbs.length) * 100}%` }}></div>
			</div>

			<div style={styles.scoreText}>
				<b>{t('score')}:</b> {progress.score} | <b>{t('learned')}:</b> {progress.learned.length}/{verbs.length}
			</div>

		</div>
	);
}
