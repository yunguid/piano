import React, { useEffect, useState, useCallback, useRef, useMemo, memo } from 'react';
import * as Tone from 'tone';
import EnhancedMelodyControls from './EnhancedMelodyControls';
import { Melody, Note, Chord } from '../services/MelodyGenerator';
import Logger from '../utils/Logger';
import { SoundOption, DEFAULT_SOUNDS, getSoundNameFromFilename, getAllSounds } from '../services/SoundLoader';
import './Piano.css';

// Create a domain-specific logger
const logger = new Logger('EnhancedPiano');

// Available sound types
const SOUND_TYPE = {
  DEFAULT: 'default'
};

// Performance settings
const PERFORMANCE = {
  LOW: {
    maxActiveNotes: 4,
    maxDebugMessages: 20,
    enableParticleEffects: false,
    enableAdvancedVisualizations: false,
    enableShadowEffects: false,
    throttleVisualizationUpdates: true,
    visualizationFPS: 15
  },
  MEDIUM: {
    maxActiveNotes: 8,
    maxDebugMessages: 50,
    enableParticleEffects: true,
    enableAdvancedVisualizations: true,
    enableShadowEffects: true,
    throttleVisualizationUpdates: true,
    visualizationFPS: 30
  },
  HIGH: {
    maxActiveNotes: 16,
    maxDebugMessages: 100,
    enableParticleEffects: true,
    enableAdvancedVisualizations: true,
    enableShadowEffects: true,
    throttleVisualizationUpdates: false,
    visualizationFPS: 60
  }
};

// Define a simpler interface for the basic piano key data
interface PianoKeyData {
  note: string;
  keyType: 'white' | 'black';
  keyboardKey?: string;
}

interface PianoKeyProps {
  note: string;
  keyType: 'white' | 'black';
  keyboardKey?: string;
  isActive: boolean;
  articulation?: string;
  onMouseDown: (note: string) => void;
  onMouseUp: (note: string) => void;
  onMouseLeave: (note: string) => void;
  performanceSettings: typeof PERFORMANCE.MEDIUM;
}

// Define piano keys with their corresponding keyboard keys
const pianoKeys: PianoKeyData[] = [
  { note: 'C', keyType: 'white', keyboardKey: 'a' },
  { note: 'C#', keyType: 'black', keyboardKey: 'w' },
  { note: 'D', keyType: 'white', keyboardKey: 's' },
  { note: 'D#', keyType: 'black', keyboardKey: 'e' },
  { note: 'E', keyType: 'white', keyboardKey: 'd' },
  { note: 'F', keyType: 'white', keyboardKey: 'f' },
  { note: 'F#', keyType: 'black', keyboardKey: 't' },
  { note: 'G', keyType: 'white', keyboardKey: 'g' },
  { note: 'G#', keyType: 'black', keyboardKey: 'y' },
  { note: 'A', keyType: 'white', keyboardKey: 'h' },
  { note: 'A#', keyType: 'black', keyboardKey: 'u' },
  { note: 'B', keyType: 'white', keyboardKey: 'j' },
];

type PianoMode = 'keyboard' | 'melody';

// Enhanced piano specific types
interface ArticulationProps {
  articulation?: string;
  velocity?: number;
}

// Memoized PianoKey component to prevent unnecessary re-renders
const PianoKey = memo(({
  note,
  keyType,
  keyboardKey,
  isActive,
  articulation,
  onMouseDown,
  onMouseUp,
  onMouseLeave,
  performanceSettings
}: PianoKeyProps) => {
  // Determine key class based on active state and articulation
  const keyClass = `piano-key ${keyType}-key${isActive ? ' active' : ''}${articulation ? ` ${articulation}` : ''}`;
  
  // Only render advanced effects if enabled in performance settings
  const renderAdvancedEffects = performanceSettings.enableAdvancedVisualizations && isActive;
  
  return (
    <div
      className={keyClass}
      data-note={note}
      onMouseDown={() => onMouseDown(note)}
      onMouseUp={() => onMouseUp(note)}
      onMouseLeave={() => onMouseLeave(note)}
    >
      {keyboardKey && <span className="key-label">{keyboardKey}</span>}
      {renderAdvancedEffects && (
        <div className="key-effect">
          {performanceSettings.enableParticleEffects && (
            <div className="key-particles"></div>
          )}
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to optimize re-renders
  return (
    prevProps.isActive === nextProps.isActive &&
    prevProps.articulation === nextProps.articulation &&
    prevProps.performanceSettings === nextProps.performanceSettings
  );
});

const EnhancedPiano = () => {
  const [synth, setSynth] = useState<Tone.PolySynth | null>(null);
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [currentMelody, setCurrentMelody] = useState<Melody | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  
  // Effect parameters
  const [reverbWet, setReverbWet] = useState<number>(0.3);
  const [reverbDecay, setReverbDecay] = useState<number>(1.5);
  const [delayWet, setDelayWet] = useState<number>(0.2);
  const [delayTime, setDelayTime] = useState<number>(0.25);
  const [delayFeedback, setDelayFeedback] = useState<number>(0.3);
  
  // Effects panel UI state
  const [showEffectsPanel, setShowEffectsPanel] = useState<boolean>(false);
  const [activeEffectTab, setActiveEffectTab] = useState<'reverb' | 'delay'>('reverb');
  
  // Effect references
  const reverbRef = useRef<Tone.Reverb | null>(null);
  const delayRef = useRef<Tone.FeedbackDelay | null>(null);
  
  // Debug state
  const [showDebugInfo, setShowDebugInfo] = useState<boolean>(true);
  const [debugMessages, setDebugMessages] = useState<string[]>([]);
  const [lastNotePlayedTime, setLastNotePlayedTime] = useState<string>('N/A');
  const [playbackIssueDetected, setPlaybackIssueDetected] = useState<boolean>(false);
  const playbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Add direct logging on component mount
  useEffect(() => {
    // Force the debug console to be visible
    const debugConsole = document.getElementById('debug-console-container');
    if (debugConsole) {
      debugConsole.style.display = 'block';
      
      // Directly add a log entry to the console
      const logEntries = document.getElementById('log-entries');
      if (logEntries) {
        // Clear any existing content
        logEntries.innerHTML = '';
        
        // Add a direct log entry
        const entry = document.createElement('div');
        entry.className = 'debug-log-entry success';
        entry.textContent = `[${new Date().toLocaleTimeString()}] [Direct] Piano component initialized`;
        logEntries.appendChild(entry);
        
        // Update entry count if it exists
        const entriesCount = document.getElementById('log-entries-count');
        if (entriesCount) {
          entriesCount.textContent = '1 entry';
        }
      } else {
        console.error('Log entries element not found in debug console');
        
        // Try to create the log entries element if it doesn't exist
        if (debugConsole.innerHTML === '') {
          console.log('Debug console is empty, initializing it directly');
          
          // Create basic structure
          const header = document.createElement('div');
          header.textContent = 'Debug Console';
          header.style.padding = '10px';
          header.style.backgroundColor = '#111';
          header.style.borderBottom = '1px solid #333';
          
          const newLogEntries = document.createElement('div');
          newLogEntries.id = 'log-entries';
          newLogEntries.className = 'log-entries';
          
          const entry = document.createElement('div');
          entry.className = 'debug-log-entry success';
          entry.textContent = `[${new Date().toLocaleTimeString()}] [Direct] Piano component initialized`;
          
          newLogEntries.appendChild(entry);
          
          debugConsole.appendChild(header);
          debugConsole.appendChild(newLogEntries);
        }
      }
    } else {
      console.error('Debug console container not found!');
    }
    
    // Log startup messages
    console.log('EnhancedPiano component mounted');
    logger.info('Piano application started');
    logger.debug('Debug console should be visible now');
    logger.success('Initialization complete');
    
    // Log some test messages with different levels
    setTimeout(() => {
      logger.info('Testing info message');
      logger.warn('Testing warning message');
      logger.error('Testing error message');
      logger.debug('Testing debug message', { test: 'data' });
    }, 1000);
  }, []);
  
  // Helper function to add debug messages
  const addDebugMessage = useCallback((message: string) => {
    setDebugMessages(prev => {
      const newMessages = [...prev, `${new Date().toISOString().substring(11, 23)}: ${message}`];
      // Keep only the last 20 messages to avoid cluttering the UI
      if (newMessages.length > 20) {
        return newMessages.slice(newMessages.length - 20);
      }
      
      // Also log to the Logger utility to ensure it appears in the debug console
      logger.debug(message);
      
      return newMessages;
    });
  }, []);
  
  // Intercept isPlaying state changes for debugging
  const setIsPlayingWithDebug = useCallback((newState: boolean) => {
    // Only add debug messages when the state actually changes
    if (newState !== isPlaying) {
      const debugMsg = newState ? 
        '🟢 isPlaying changed to TRUE' : 
        '🔴 isPlaying changed to FALSE';
      
      // Use a timeout to ensure this runs after the current execution context
      setTimeout(() => {
        console.log(debugMsg, {
          timestamp: new Date().toISOString(),
          caller: new Error().stack?.split('\n')[2] || 'unknown caller'
        });
        
        // Add to UI debug panel
        addDebugMessage(debugMsg);
      }, 0);
    }
    
    // Actually update the state
    setIsPlaying(newState);
  }, [isPlaying, addDebugMessage]);
  
  const [hasFocus, setHasFocus] = useState<boolean>(false);
  const [mode, setMode] = useState<PianoMode>('keyboard');
  const [showModeSelection, setShowModeSelection] = useState<boolean>(false);
  const [isGeneratingMelody, setIsGeneratingMelody] = useState<boolean>(false);
  const sequenceRef = useRef<Tone.Sequence | null>(null);
  const currentNoteIndex = useRef<number>(0);
  const currentChordIndex = useRef<number>(0);
  const pianoContainerRef = useRef<HTMLDivElement>(null);
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const melodySynthRef = useRef<Tone.Synth | null>(null);
  const chordSynthRef = useRef<Tone.PolySynth | null>(null);
  const [toneStarted, setToneStarted] = useState<boolean>(false);
  const [showAudioPrompt, setShowAudioPrompt] = useState<boolean>(false);
  const [showVisualizations, setShowVisualizations] = useState<boolean>(true);
  const [articulations, setArticulations] = useState<Map<string, string>>(new Map());
  const progressRef = useRef<HTMLDivElement>(null);
  const currentTimeoutId = useRef<NodeJS.Timeout | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const recorderRef = useRef<Tone.Recorder | null>(null);
  // Sound selector state
  const [selectedSound, setSelectedSound] = useState<string>('default');
  const samplerRef = useRef<Tone.Sampler | null>(null);
  const [soundsLoaded, setSoundsLoaded] = useState<boolean>(true);
  const [availableSounds, setAvailableSounds] = useState<SoundOption[]>(DEFAULT_SOUNDS);
  const [soundsLoading, setSoundsLoading] = useState<boolean>(false);
  
  // Forward declarations to break circular references
  const stopRecordingRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const scheduleNextNoteRef = useRef<(() => void) | undefined>(undefined);
  const togglePlayEnhancedMelodyRef = useRef<(() => Promise<void>) | undefined>(undefined);

  // Piano configuration
  const octaves = 2;
  const startOctave = 4;
  
  // Generate all keys for the specified octave range
  const allKeys = Array.from({ length: octaves }, (_, octaveIndex) => {
    const octave = startOctave + octaveIndex;
    return pianoKeys.map(key => ({
      ...key,
      id: `${key.note}${octave}`,
    }));
  }).flat();

  // Initialize Tone.js instruments and effects
  useEffect(() => {
    logger.perfStart('Synth Initialization');
    
    // Initialize main piano synth
    const newSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: 'sine',
      },
      envelope: {
        attack: 0.005,
        decay: 0.1,
        sustain: 0.3,
        release: 1
      }
    });
    
    // Create enhanced effects for main piano synth with increased quality
    logger.debug('Creating main piano effects with params', {
      reverb: { decay: reverbDecay, wet: reverbWet },
      delay: { delayTime, feedback: delayFeedback, wet: delayWet }
    });
    
    // Create a high-quality reverb with optimized settings
    const mainReverb = new Tone.Reverb({
      decay: reverbDecay,
      wet: reverbWet,
      preDelay: 0.01
    }).toDestination();
    
    // Ensure the reverb is ready before connecting
    mainReverb.generate().then(() => {
      logger.debug('Reverb impulse response generated successfully');
    }).catch(err => {
      logger.error('Error generating reverb impulse response', { error: err });
    });
    
    // Create a stereo delay for more immersive sound
    const mainDelay = new Tone.FeedbackDelay({
      delayTime: delayTime,
      feedback: delayFeedback,
      wet: delayWet,
      maxDelay: 1.5 // Allow for longer delay times
    });
    
    // Store effect references for parameter updates
    reverbRef.current = mainReverb;
    delayRef.current = mainDelay;
    
    // Connect effects chain: synth -> delay -> reverb -> destination
    // This ensures the signal passes through each effect in sequence
    newSynth.chain(mainDelay, mainReverb, Tone.Destination);
    
    logger.debug('Effects chain connected: synth -> delay -> reverb -> destination');
    
    // Initialize melody synth with appropriate settings
    const melodyInstrument = new Tone.Synth({
      oscillator: {
        type: 'triangle',
      },
      envelope: {
        attack: 0.01,
        decay: 0.2,
        sustain: 0.4,
        release: 0.8
      }
    });
    
    // Add enhanced effects for melody with same parameters as the main piano
    logger.debug('Creating melody synth effects');
    
    const melodyReverb = new Tone.Reverb({
      decay: reverbDecay, 
      wet: reverbWet,
      preDelay: 0.01
    }).toDestination();
    
    const melodyDelay = new Tone.FeedbackDelay({
      delayTime: delayTime, 
      feedback: delayFeedback, 
      wet: delayWet
    });
    
    // Connect melody effects chain
    melodyInstrument.chain(melodyDelay, melodyReverb);
    melodySynthRef.current = melodyInstrument;
    
    // Initialize chord synth with appropriate settings
    const chordInstrument = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: 'sine',
      },
      envelope: {
        attack: 0.02,
        decay: 0.2,
        sustain: 0.5,
        release: 1.5
      }
    });
    
    // Add enhanced effects for chords with same parameters as the main piano
    logger.debug('Creating chord synth effects');
    
    const chordReverb = new Tone.Reverb({
      decay: reverbDecay, 
      wet: reverbWet,
      preDelay: 0.01
    }).toDestination();
    
    const chordDelay = new Tone.FeedbackDelay({
      delayTime: delayTime, 
      feedback: delayFeedback * 0.8, // Slightly less feedback for chords to avoid muddiness
      wet: delayWet * 0.8 // Slightly drier for chords
    });
    
    // Connect chord effects chain
    chordInstrument.chain(chordDelay, chordReverb);
    chordSynthRef.current = chordInstrument;
    
    setSynth(newSynth);
    synthRef.current = newSynth;

    logger.success('Synth and effects initialized successfully');
    logger.perfEnd('Synth Initialization');

    return () => {
      logger.debug('Cleaning up synths and effects');
      
      // Safe disposal function to handle null checks and error catching
      const safeDispose = (item: any, name: string) => {
        if (item) {
          try {
            item.dispose();
            logger.debug(`Disposed of ${name} successfully`);
          } catch (error) {
            logger.error(`Error disposing of ${name}`, { error });
          }
        }
      };
      
      // Dispose of all synths and effects
      safeDispose(newSynth, 'main synth');
      safeDispose(melodyInstrument, 'melody synth');
      safeDispose(chordInstrument, 'chord synth');
      safeDispose(melodyReverb, 'melody reverb');
      safeDispose(melodyDelay, 'melody delay');
      safeDispose(chordReverb, 'chord reverb');
      safeDispose(chordDelay, 'chord delay');
      safeDispose(mainReverb, 'main reverb');
      safeDispose(mainDelay, 'main delay');
      
      // Clear all refs
      synthRef.current = null;
      melodySynthRef.current = null;
      chordSynthRef.current = null;
      reverbRef.current = null;
      delayRef.current = null;
      
      logger.debug('All synths and effects disposed and refs cleared');
    };
  }, []);

  // Initialize Tone.js on first user interaction
  const initializeTone = useCallback(() => {
    // Only start the AudioContext after a user gesture/interaction
    if (Tone.context.state !== 'running') {
      logger.perfStart('Tone.js Context Start');
      
      // Try to start audio
      const startAudio = () => {
        Tone.start().then(() => {
          logger.success('Tone.js initialized successfully');
          logger.perfEnd('Tone.js Context Start');
          setToneStarted(true);
          setShowAudioPrompt(false);
          
          // Resume AudioContext explicitly
          Tone.context.resume().then(() => {
            logger.debug('AudioContext resumed successfully');
          });
        }).catch(err => {
          logger.error('Failed to start Tone.js', err);
          // Show audio prompt if we couldn't start the audio context
          setShowAudioPrompt(true);
        });
      };
      
      // Try to start audio directly
      startAudio();
    } else {
      setToneStarted(true);
      setShowAudioPrompt(false);
    }
  }, []);

  // Handle user interaction to initialize audio
  const handleInteraction = useCallback(() => {
    logger.debug('User interaction detected, initializing Tone.js');
    initializeTone();
    setHasFocus(true);
  }, [initializeTone]);

  // Set up event listeners for keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!hasFocus || !toneStarted || !synth) return;
      
      const key = e.key.toLowerCase();
      const mappedKey = allKeys.find(k => k.keyboardKey === key);
      
      if (mappedKey && !e.repeat) {
        logger.debug(`Key press: ${key} -> note ${mappedKey.id}`);
        playNote(mappedKey.id);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!hasFocus || !toneStarted || !synth) return;
      
      const key = e.key.toLowerCase();
      const mappedKey = allKeys.find(k => k.keyboardKey === key);
      
      if (mappedKey) {
        logger.debug(`Key release: ${key} -> note ${mappedKey.id}`);
        stopNote(mappedKey.id);
      }
    };

    logger.debug('Setting up keyboard event listeners');
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      logger.debug('Removing keyboard event listeners');
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [hasFocus, toneStarted, synth, allKeys]);

  // Handle focus events for the piano container
  const handleFocus = useCallback(() => {
    logger.debug('Piano container focused');
    setHasFocus(true);
    initializeTone();
  }, [initializeTone]);
  
  const handleBlur = useCallback(() => {
    logger.debug('Piano container blurred');
    setHasFocus(false);
  }, []);

  // Stop any playing melody sequence
  const stopSequence = useCallback(() => {
    if (sequenceRef.current) {
      logger.debug('Stopping melody sequence');
      sequenceRef.current.stop();
      sequenceRef.current.dispose();
      sequenceRef.current = null;
    }
    
    // Clear active notes
    setActiveNotes(new Set());
    setIsPlaying(false);
    
    // Reset indices
    currentNoteIndex.current = 0;
    currentChordIndex.current = 0;
    
    // Clear articulations
    setArticulations(new Map());
    
    logger.debug('Melody sequence stopped, all states reset');
  }, []);

  // Play a note on the piano
  const playNote = useCallback((noteId: string, velocity = 1, articulation = 'normal') => {
    if (!synthRef.current && !samplerRef.current) {
      logger.warn('Attempted to play note but neither synth nor sampler is initialized');
      return;
    }
    
    logger.debug(`Playing note: ${noteId}`, { velocity, articulation, selectedSound });
    
    setActiveNotes(prev => {
      const updated = new Set(prev);
      updated.add(noteId);
      return updated;
    });
    
    // Update articulation for visualization
    setArticulations(prev => {
      const updated = new Map(prev);
      updated.set(noteId, articulation);
      return updated;
    });
    
    if (selectedSound === SOUND_TYPE.DEFAULT) {
      // Use default synth
      if (!synthRef.current) return;
      
      // Apply different envelope settings based on articulation
      const currentSynth = synthRef.current as any;
      const baseEnvelope = currentSynth.get().envelope;
      
      switch (articulation) {
        case 'staccato':
          logger.debug('Applying staccato articulation', { noteId });
          currentSynth.set({
            envelope: { ...baseEnvelope, release: 0.1, sustain: 0.1 }
          });
          break;
        case 'legato':
          logger.debug('Applying legato articulation', { noteId });
          currentSynth.set({
            envelope: { ...baseEnvelope, release: 1.5, sustain: 0.8 }
          });
          break;
        case 'accent':
          logger.debug('Applying accent articulation', { noteId });
          currentSynth.set({
            envelope: { ...baseEnvelope, attack: 0.001, sustain: 0.4 }
          });
          velocity *= 1.2; // Increase velocity for accented notes
          break;
        case 'tenuto':
          logger.debug('Applying tenuto articulation', { noteId });
          currentSynth.set({
            envelope: { ...baseEnvelope, sustain: 0.7, release: 1.2 }
          });
          break;
        default:
          currentSynth.set({
            envelope: baseEnvelope
          });
      }
      
      // Play the note with the given velocity
      synthRef.current.triggerAttack(noteId, Tone.now(), velocity);
      
      // Reset to default envelope after a short delay
      setTimeout(() => {
        if (synthRef.current) {
          (synthRef.current as any).set({
            envelope: baseEnvelope
          });
        }
      }, 100);
    } else {
      // Use sampler
      if (!samplerRef.current || !soundsLoaded) return;
      
      // Play the note with the sampler
      samplerRef.current.triggerAttack(noteId, Tone.now(), velocity);
    }
  }, [selectedSound, soundsLoaded]);

  // Stop a note on the piano
  const stopNote = useCallback((noteId: string) => {
    setActiveNotes(prev => {
      const updated = new Set(prev);
      updated.delete(noteId);
      return updated;
    });
    
    // Clear articulation
    setArticulations(prev => {
      const updated = new Map(prev);
      updated.delete(noteId);
      return updated;
    });
    
    if (selectedSound === SOUND_TYPE.DEFAULT) {
      if (!synthRef.current) {
        logger.warn('Attempted to stop note but synth is not initialized');
        return;
      }
      synthRef.current.triggerRelease(noteId);
    } else {
      if (!samplerRef.current) {
        logger.warn('Attempted to stop note but sampler is not initialized');
        return;
      }
      samplerRef.current.triggerRelease(noteId);
    }
  }, [selectedSound]);

  // Play a melody note with appropriate articulation and velocity
  const playMelodyNote = useCallback((note: Note) => {
    // Skip rests
    if (note.rest) {
      logger.debug('Skipping rest in melody');
      return;
    }
    
    const velocity = note.velocity !== undefined ? note.velocity / 127 : 0.8;
    const noteId = note.note!;
    
    try {
      // Create a safe object for logging without circular references
      const logSafeNote = {
        note: noteId,
        duration: note.duration,
        velocity: note.velocity,
        articulation: note.articulation
      };
      
      logger.debug(`Playing melody note ${noteId}`, logSafeNote);
      
      // Visual feedback for the note being played
      setActiveNotes(prev => {
        const newSet = new Set(prev);
        newSet.add(noteId);
        return newSet;
      });
      
      // Store articulation for visual feedback
      setArticulations(prev => {
        const newMap = new Map(prev);
        if (note.articulation) {
          newMap.set(noteId, note.articulation);
        }
        return newMap;
      });
      
      if (selectedSound === SOUND_TYPE.DEFAULT) {
        // Use the melody synth for the default sound
        if (!melodySynthRef.current) {
          logger.warn('Attempted to play melody note but melody synth is not initialized');
          return;
        }
        
        // Play the note with appropriate velocity and duration
        melodySynthRef.current.triggerAttackRelease(
          noteId,
          note.duration * 0.9, // Slightly shorter than full duration to separate notes
          Tone.now(),
          velocity // Use velocity for dynamics
        );
      } else {
        // Use the sampler for custom sounds
        if (!samplerRef.current || !soundsLoaded) {
          logger.warn('Attempted to play melody note but sampler is not loaded');
          return;
        }
        
        // Play the note with the sampler
        samplerRef.current.triggerAttackRelease(
          noteId,
          note.duration * 0.9,
          Tone.now(),
          velocity
        );
      }
      
      // Schedule note release
      setTimeout(() => {
        setActiveNotes(prev => {
          const newSet = new Set(prev);
          newSet.delete(noteId);
          return newSet;
        });
      }, note.duration * 1000);
    } catch (error) {
      logger.error(`Error playing note ${noteId}`, { 
        message: (error as Error).message, 
        name: (error as Error).name,
        stack: (error as Error).stack
      });
    }
  }, [selectedSound, soundsLoaded]);

  // Play a chord with appropriate voicing
  const playChord = useCallback((chord: Chord) => {
    try {
      // Create a safe object for logging
      const logSafeChord = {
        notes: [...chord.notes],
        duration: chord.duration
      };
      
      logger.debug('Playing chord', logSafeChord);
      
      // Visual feedback for the chord being played
      chord.notes.forEach(note => {
        playNote(note, 0.7, 'normal');
      });
      
      if (selectedSound === SOUND_TYPE.DEFAULT) {
        // Use chord synth for default sound
        if (!chordSynthRef.current) {
          logger.warn('Attempted to play chord but chord synth is not initialized');
          return;
        }
        
        // Play the chord with the appropriate duration
        chordSynthRef.current.triggerAttackRelease(
          chord.notes,
          chord.duration * 60 / Tone.Transport.bpm.value,
          Tone.now(),
          0.7
        );
      } else {
        // Use sampler for custom sounds
        if (!samplerRef.current || !soundsLoaded) {
          logger.warn('Attempted to play chord but sampler is not loaded');
          return;
        }
        
        // Play each note of the chord with the sampler
        chord.notes.forEach(note => {
          samplerRef.current!.triggerAttackRelease(
            note,
            chord.duration * 60 / Tone.Transport.bpm.value,
            Tone.now(),
            0.7
          );
        });
      }
      
      // Visual feedback that the chord has stopped
      setTimeout(() => {
        chord.notes.forEach(note => {
          stopNote(note);
        });
      }, chord.duration * 60 / Tone.Transport.bpm.value * 1000);
    } catch (error) {
      logger.error('Error playing chord', {
        message: (error as Error).message,
        name: (error as Error).name,
        stack: (error as Error).stack
      });
    }
  }, [playNote, stopNote, selectedSound, soundsLoaded]);

  // Initialize recorder for downloading melodies as WAV
  useEffect(() => {
    // Create the recorder instance if it doesn't exist
    if (!recorderRef.current) {
      logger.debug('Initializing audio recorder');
      recorderRef.current = new Tone.Recorder();
      
      // Connect main destination to recorder
      Tone.getDestination().connect(recorderRef.current);
    }
    
    return () => {
      // Clean up recorder on unmount
      if (recorderRef.current) {
        logger.debug('Disposing recorder');
        recorderRef.current.dispose();
        recorderRef.current = null;
      }
    };
  }, []);

  // Enhanced ensureAudioContextRunning to fix context issues
  const ensureAudioContextRunning = useCallback(async () => {
    if (Tone.context.state !== 'running') {
      logger.debug('Audio context not running, attempting to resume...');
      try {
        await Tone.start();
        await Tone.context.resume();
        logger.debug('Audio context resumed successfully');
        setToneStarted(true);
        setShowAudioPrompt(false);
      } catch (error) {
        logger.error('Error resuming audio context', error);
        // Show the prompt if we can't auto-start the context
        setShowAudioPrompt(true);
        throw new Error('Audio context could not be started. User interaction required.');
      }
    }
  }, []);

  // Monitor for playback issues
  useEffect(() => {
    if (isPlaying) {
      // Set up a timeout to check if notes are advancing
      const checkTimeout = setTimeout(() => {
        const now = new Date();
        const lastTime = lastNotePlayedTime !== 'N/A' ? new Date(lastNotePlayedTime) : null;
        
        // If last note played was more than 3 seconds ago, something might be wrong
        if (lastTime && now.getTime() - lastTime.getTime() > 3000) {
          setPlaybackIssueDetected(true);
          addDebugMessage(`⚠️ ISSUE: No note played for over 3 seconds while isPlaying=true`);
          addDebugMessage(`⚠️ Current note index: ${currentNoteIndex.current}, timeoutId: ${currentTimeoutId.current || 'none'}`);
          
          // Check if we have chord information
          if (currentMelody && currentMelody.chords && currentMelody.chords.length > 0) {
            const chordIndex = Math.min(Math.floor(currentNoteIndex.current / 2), currentMelody.chords.length - 1);
            const chord = currentMelody.chords[chordIndex];
            if (chord) {
              const chordName = chord.chord_symbol || 
                (chord.notes && chord.notes.length > 0 ? chord.notes.join(',') : '(unknown)');
              addDebugMessage(`ℹ️ Current chord: ${chordName} (idx=${chordIndex})`);
            }
          }
          
          // Let's check if scheduleNextNote is still accessible
          if (scheduleNextNoteRef.current) {
            addDebugMessage(`ℹ️ scheduleNextNote function is available`);
            
            // Let's try to manually advance to the next note and continue playback
            addDebugMessage(`🔄 Manually advancing to next note and continuing playback...`);
            currentNoteIndex.current += 1; // Force increment index
            addDebugMessage(`📊 Advancing to note index ${currentNoteIndex.current}`);
            scheduleNextNoteRef.current();
          } else {
            addDebugMessage(`❌ scheduleNextNote function is MISSING!`);
          }
        }
      }, 3000);
      
      playbackTimeoutRef.current = checkTimeout;
      return () => {
        if (playbackTimeoutRef.current) {
          clearTimeout(playbackTimeoutRef.current);
        }
      };
    }
  }, [isPlaying, lastNotePlayedTime, addDebugMessage, currentNoteIndex, currentMelody]);

  // Failsafe mechanism to ensure continuous playback
  useEffect(() => {
    if (isPlaying && currentMelody && currentMelody.melody) {
      // Set up a global failsafe timer that checks if playback has stalled
      const failsafeDelay = 3500; // 3.5 seconds
      
      const failsafeTimer = setTimeout(() => {
        // Check if we actually advanced in the melody since last check
        const currentIndex = currentNoteIndex.current;
        const totalNotes = currentMelody?.melody?.length || 0;
        
        // If we're not at the end but no new notes have played recently
        if (currentIndex >= 0 && currentIndex < totalNotes - 1) {
          console.warn(`FAILSAFE: Playback may be stalled at note ${currentIndex} of ${totalNotes}`);
          addDebugMessage(`⚠️ FAILSAFE: Playback stalled at note ${currentIndex}`);
          
          // Try to force advance to the next note
          if (scheduleNextNoteRef.current) {
            currentNoteIndex.current = currentIndex + 1; // Force increment
            addDebugMessage(`🔄 FAILSAFE: Advancing to note ${currentNoteIndex.current}`);
            scheduleNextNoteRef.current();
          }
        }
      }, failsafeDelay);
      
      return () => clearTimeout(failsafeTimer);
    }
  }, [isPlaying, currentMelody, lastNotePlayedTime]);

  const scheduleNextNote = useCallback(() => {
    // Enhanced debug: Log state at the beginning of each call
    logger.debug('🔍 scheduleNextNote called', {
      isPlaying: isPlaying,
      currentNoteIndex: currentNoteIndex.current,
      hasMelody: Boolean(currentMelody && currentMelody.melody),
      hasTimeout: Boolean(currentTimeoutId.current),
      activeSynthType: selectedSound,
      audioContextState: Tone.context.state,
      melodySynthExists: Boolean(melodySynthRef.current),
      samplerExists: Boolean(samplerRef.current && soundsLoaded)
    });
    
    // Add to debug UI
    addDebugMessage(`scheduleNextNote called, index=${currentNoteIndex.current}, playing=${isPlaying}`);

    // Basic validation
    if (!currentMelody || !currentMelody.melody || currentMelody.melody.length === 0) {
      logger.warn('❌ Cannot schedule next note: no melody available');
      setIsPlayingWithDebug(false);
      addDebugMessage('❌ Error: No melody available');
      return;
    }

    // Log the entire melody structure only once for debugging
    if (currentNoteIndex.current === -1) {
      const melodyLength = currentMelody.melody.length;
      // Add to debug UI
      addDebugMessage(`📊 Melody has ${melodyLength} notes total`);
      
      logger.debug('🎼 FULL MELODY DATA:', JSON.stringify({
        melodyLength: melodyLength,
        notes: currentMelody.melody.map((n, i) => ({
          index: i,
          note: n.note,
          duration: n.duration,
          isRest: n.rest,
          velocity: n.velocity,
          articulation: n.articulation
        })),
        tempo: currentMelody.tempo,
        key: currentMelody.key,
        timeSignature: currentMelody.timeSignature
      }, null, 2));
    }
    
    // Increment note index
    const oldIndex = currentNoteIndex.current;
    currentNoteIndex.current += 1;
    logger.debug(`📊 Note index updated: ${oldIndex} -> ${currentNoteIndex.current}`);
    
    // If we've played all notes, stop playback
    if (currentNoteIndex.current >= currentMelody.melody.length) {
      logger.debug('🏁 Reached end of melody, stopping playback');
      currentNoteIndex.current = -1;
      setIsPlayingWithDebug(false);
      addDebugMessage('🏁 Reached end of melody, stopping playback');
      
      // Stop recording if recording was active
      if (isRecording && stopRecordingRef.current) {
        stopRecordingRef.current();
      }
      return;
    }
    
    // Get current note
    const note = currentMelody.melody[currentNoteIndex.current];
    if (!note) {
      logger.error(`❌ Invalid note at index ${currentNoteIndex.current}`);
      logger.debug('⏭️ Skipping invalid note and trying next');
      setTimeout(() => {
        logger.debug('⏱️ Invalid note timeout triggered, calling scheduleNextNote');
        scheduleNextNote();
      }, 500);
      return;
    }

    try {
      // Handle rest
      // Check if we should play a chord along with this note
      if (currentMelody.chords && currentMelody.chords.length > 0 && currentNoteIndex.current % 2 === 0) {
        const chordIndex = Math.min(Math.floor(currentNoteIndex.current / 2), currentMelody.chords.length - 1);
        const chord = currentMelody.chords[chordIndex];
        
        if (chord && chord.notes && chord.notes.length > 0) {
          addDebugMessage(`🎵 Playing chord ${chord.notes.join(',')} (idx=${chordIndex})`);
          
          // Play each note in the chord
          chord.notes.forEach(chordNote => {
            if (!chordNote) return;
            
            // Use the synth available (melody synth or sampler)
            if (selectedSound === SOUND_TYPE.DEFAULT) {
              if (melodySynthRef.current) {
                melodySynthRef.current.triggerAttackRelease(
                  chordNote,
                  note.duration * 0.9,
                  Tone.now(),
                  0.6 // Lower velocity for chord notes
                );
              }
            } else if (samplerRef.current && soundsLoaded) {
              samplerRef.current.triggerAttackRelease(
                chordNote,
                note.duration * 0.9,
                Tone.now(),
                0.6 // Lower velocity for chord notes
              );
            }
            
            // Update active notes for visual feedback
            setActiveNotes(prev => {
              const newSet = new Set(prev);
              newSet.add(chordNote);
              return newSet;
            });
            
            // Schedule removal from active notes
            setTimeout(() => {
              setActiveNotes(prev => {
                const newSet = new Set(prev);
                newSet.delete(chordNote);
                return newSet;
              });
            }, note.duration * 900); // Slightly shorter than note duration
          });
          
          logger.debug(`✅ Chord played at index ${chordIndex}`);
        }
      }

      if (note.rest === true) {
        logger.debug(`⏸️ Rest at index ${currentNoteIndex.current}`, { 
          duration: note.duration,
          delayMs: note.duration * 1000
        });
        
        // For rests, just wait the duration then schedule the next note
        const timeout = setTimeout(() => {
          logger.debug(`⏱️ Rest timeout completed, isPlaying=${isPlaying}, calling scheduleNextNote`);
          if (isPlaying) {
            scheduleNextNote();
          } else {
            logger.warn('⚠️ Rest timeout completed but isPlaying=false, not scheduling next note');
          }
        }, note.duration * 1000);
        
        logger.debug(`🆔 Setting currentTimeoutId to ${timeout}`);
        currentTimeoutId.current = timeout;
        return;
      }
      
      // From here we're dealing with an actual note
      if (!note.note) {
        logger.error(`❌ Note at index ${currentNoteIndex.current} is missing note property`);
        logger.debug('⏭️ Skipping note with missing properties and trying next');
        setTimeout(() => {
          logger.debug('⏱️ Invalid note timeout triggered, calling scheduleNextNote');
          scheduleNextNote();
        }, 500);
        return;
      }
      
      // Log note information with detailed parameters
      logger.debug(`🎵 Playing melody note ${currentNoteIndex.current}: ${note.note}`, { 
        duration: note.duration,
        velocity: note.velocity || 80,
        articulation: note.articulation || 'normal',
        actualNoteData: note,
        timeNow: new Date().toISOString(),
        toneNow: Tone.now()
      });
      
      // Update UI to show active note
      setActiveNotes(prev => {
        const newSet = new Set(prev);
        newSet.add(note.note || '');
        logger.debug(`📝 Added note ${note.note} to active notes set`);
        return newSet;
      });
      
      // Store articulation for visual feedback
      setArticulations(prev => {
        const newMap = new Map(prev);
        newMap.set(note.note || '', note.articulation || 'normal');
        logger.debug(`📝 Added articulation ${note.articulation || 'normal'} for note ${note.note}`);
        return newMap;
      });
      
      // Set up sound parameters with enhanced logging
      const originalDuration = note.duration || 1;
      
      // Apply articulation-specific duration limits
      let durationSeconds;
      if (note.articulation === 'legato') {
        // For legato, we need to be especially careful with duration
        durationSeconds = Math.min(originalDuration, 0.8); // Max 0.8 seconds for legato notes
        if (originalDuration > 0.8) {
          addDebugMessage(`⚠️ LEGATO NOTE: Limited duration from ${originalDuration}s to 0.8s`);
        }
      } else {
        // For other articulations, use the general limit
        durationSeconds = Math.min(originalDuration, 1.0);
      }
      
      const velocity = (note.velocity || 80) / 127;
      const articulation = note.articulation || 'normal';
      
      // Log if we modified the duration
      if (originalDuration !== durationSeconds) {
        addDebugMessage(`ℹ️ Limited duration from ${originalDuration}s to ${durationSeconds}s for testing`);
      }
      
      // Calculate actual note duration based on articulation
      let actualDuration = durationSeconds;
      
      // Legato articulation was causing issues - let's add extra logging and ensure correct handling
      if (articulation === 'staccato') {
        actualDuration = durationSeconds * 0.5;
        addDebugMessage(`ℹ️ Staccato articulation: ${durationSeconds}s → ${actualDuration}s`);
      } else if (articulation === 'legato') {
        // For legato, ensure a reasonable duration but don't let it prevent next note scheduling
        actualDuration = durationSeconds * 0.95;  // Slight adjustment to prevent overlap issues
        addDebugMessage(`🔍 LEGATO FIX: ${durationSeconds}s → ${actualDuration}s`);
        console.warn(`LEGATO FIX: Duration ${durationSeconds}s → ${actualDuration}s for note ${note.note}`);
      } else {
        actualDuration = durationSeconds * 0.9;
      }

      logger.debug(`⚙️ Note parameters calculated`, {
        durationSeconds,
        actualDuration,
        velocity,
        articulation,
        delayBeforeNextNote: durationSeconds * 1000
      });
      
      // Debug AudioContext state before playing
      logger.debug(`🔊 AudioContext state before playing: ${Tone.context.state}`);
      if (Tone.context.state !== 'running') {
        logger.warn('⚠️ AudioContext not running, attempting to resume');
        Tone.context.resume().then(() => {
          logger.debug(`🔊 AudioContext state after resume attempt: ${Tone.context.state}`);
        }).catch(err => {
          logger.error('Failed to resume AudioContext', err);
        });
      }
      
      // Play the note using available synth
      if (selectedSound === SOUND_TYPE.DEFAULT) {
        // Use the default synth
        logger.debug(`🎹 Using default synth for playback, melodySynthRef exists: ${Boolean(melodySynthRef.current)}`);
        
        if (!melodySynthRef.current) {
          logger.debug(`🔧 Creating new melody synth instance`);
          melodySynthRef.current = new Tone.Synth({
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.8 }
          }).toDestination();
        }
        
        // Play the note
        logger.debug(`🎵 Triggering note on default synth: ${note.note}, duration: ${actualDuration}`);
        melodySynthRef.current.triggerAttackRelease(
          note.note,
          actualDuration,
          Tone.now(),
          velocity
        );
        // Update debug tracking
        const now = new Date().toISOString();
        setLastNotePlayedTime(now);
        addDebugMessage(`▶️ Played note ${note.note} (idx=${currentNoteIndex.current})`);
        logger.debug(`✅ Note triggered on default synth`);
      } else {
        // Use the sampler if available
        logger.debug(`🎹 Using custom sound for playback, samplerRef exists: ${Boolean(samplerRef.current)}, soundsLoaded: ${soundsLoaded}`);
        
        if (samplerRef.current && soundsLoaded) {
          logger.debug(`🎵 Triggering note on sampler: ${note.note}, duration: ${actualDuration}`);
          samplerRef.current.triggerAttackRelease(
            note.note,
            actualDuration,
            Tone.now(),
            velocity
          );
          // Update debug tracking
          const now = new Date().toISOString();
          setLastNotePlayedTime(now);
          addDebugMessage(`▶️ Played note ${note.note} with sampler (idx=${currentNoteIndex.current})`);
          logger.debug(`✅ Note triggered on sampler`);
        } else {
          // Fallback to default synth if sampler not ready
          logger.warn(`⚠️ Sampler not ready, falling back to default synth`);
          
          if (!melodySynthRef.current) {
            logger.debug(`🔧 Creating new fallback melody synth instance`);
            melodySynthRef.current = new Tone.Synth().toDestination();
          }
          
          logger.debug(`🎵 Triggering note on fallback synth: ${note.note}, duration: ${actualDuration}`);
          melodySynthRef.current.triggerAttackRelease(
            note.note,
            actualDuration,
            Tone.now(),
            velocity
          );
          // Update debug tracking
          const now = new Date().toISOString();
          setLastNotePlayedTime(now);
          addDebugMessage(`▶️ Played note ${note.note} with fallback synth (idx=${currentNoteIndex.current})`);
          logger.debug(`✅ Note triggered on fallback synth`);
        }
      }
      
      // Schedule the next note after this note's duration
      // TESTING: Make sure timing is not too long
      const maxAllowedDelay = 2000; // 2 seconds max
      const minRequiredDelay = 200; // 200ms minimum to ensure we can hear notes distinctly
      
      // Calculate based on articulation type - legato needs special handling
      let originalDelay;
      
      if (articulation === 'legato') {
        // For legato articulation, use a shorter delay to ensure continuous playback
        originalDelay = Math.min(durationSeconds * 800, 1200); // Max 1.2 seconds
        console.warn(`LEGATO TIMING ADJUSTMENT: Using fixed delay of ${originalDelay}ms instead of ${durationSeconds * 1000}ms`);
        addDebugMessage(`⚠️ LEGATO TIMING FIX: Using ${originalDelay}ms delay`);
      } else {
        originalDelay = durationSeconds * 1000;
      }
      
      let nextNoteDelay = originalDelay;
      
      // Ensure delay is within reasonable bounds
      if (nextNoteDelay > maxAllowedDelay) {
        addDebugMessage(`⚠️ Note delay too long (${nextNoteDelay}ms), limiting to ${maxAllowedDelay}ms`);
        nextNoteDelay = maxAllowedDelay;
      }
      
      if (nextNoteDelay < minRequiredDelay) {
        addDebugMessage(`⚠️ Note delay too short (${nextNoteDelay}ms), increasing to ${minRequiredDelay}ms`);
        nextNoteDelay = minRequiredDelay;
      }
      
      logger.debug(`⏱️ Will schedule next note in ${nextNoteDelay}ms`);
      
      // Update progress indicator if available
      if (progressRef.current && currentMelody.melody) {
        const progress = ((currentNoteIndex.current + 1) / currentMelody.melody.length) * 100;
        progressRef.current.style.width = `${progress}%`;
        logger.debug(`📊 Updated progress bar to ${progress.toFixed(1)}%`);
      }
      
      // Clear the active note after it's done playing
      const visualFeedbackTimeout = setTimeout(() => {
        logger.debug(`⏱️ Visual feedback timeout triggered for note ${note.note}`);
        setActiveNotes(prev => {
          const newSet = new Set(prev);
          newSet.delete(note.note || '');
          logger.debug(`📝 Removed note ${note.note} from active notes set`);
          return newSet;
        });
      }, actualDuration * 1000);
      
      // Critical: Verify isPlaying state before scheduling next note
      logger.debug(`🔍 Before scheduling next note: isPlaying=${isPlaying}`);
      
      // CRITICAL DEBUG FOR LEGATO ARTICULATION 
      if (articulation === 'legato') {
        console.warn(`⚠️ LEGATO NOTE DETECTED - NOTE INDEX ${currentNoteIndex.current} - ARTICULATION ${articulation}`);
        console.warn(`Note ${note.note} duration: ${durationSeconds}s, delay: ${nextNoteDelay}ms`);
        addDebugMessage(`⚠️ LEGATO NOTE: ${note.note} idx=${currentNoteIndex.current}`);
      }
      
      // Schedule the next note with more details - CRITICAL SECTION
      logger.debug(`🔍 About to set timeout for next note in ${nextNoteDelay}ms - CRITICAL PATH`, {
        articulation: articulation,
        nextNoteIdx: currentNoteIndex.current + 1,
        totalNotes: currentMelody.melody.length,
        currentNote: note.note,
        isPlaying: isPlaying,
        hasMelody: Boolean(currentMelody && currentMelody.melody),
        audioContextState: Tone.context.state
      });
      
      addDebugMessage(`⏱️ Setting timeout for note #${currentNoteIndex.current + 1} (${nextNoteDelay}ms)`);
      
      // Verify we haven't reached the end of the melody
      if (currentNoteIndex.current + 1 >= currentMelody.melody.length) {
        logger.debug(`🏁 Next note would be at the end of melody - total notes: ${currentMelody.melody.length}`);
        addDebugMessage(`ℹ️ Next note is at end of melody (total: ${currentMelody.melody.length})`);
      }
      
      try {
        // Create the timeout with extra debugging
        // CRITICAL - Make sure we capture and debug the duration for the next note scheduling
        const debugTimeoutDuration = Math.round(nextNoteDelay);
        addDebugMessage(`⏱️ Scheduling next note in ${debugTimeoutDuration}ms`);
        
        // Set up an immediate timeout to verify the timer system works
        setTimeout(() => {
          addDebugMessage(`✅ Immediate timeout works!`);
        }, 50);
        
        // Add special identifier for legato notes to help with debugging
        const timeoutType = articulation === 'legato' ? 'LEGATO_TIMEOUT' : 'NORMAL_TIMEOUT';
        const nextNoteIdx = currentNoteIndex.current + 1;
        
        // Create the timeout with detailed identifier
        const nextNoteTimeout = setTimeout(() => {
          // First thing in the timeout handler - check if we're still in playing state
          const timeoutMsg = `⏱️ TIMEOUT FIRED! [${timeoutType}] Note ${nextNoteIdx}, delay=${debugTimeoutDuration}ms, isPlaying=${isPlaying}`;
          logger.debug(timeoutMsg);
          addDebugMessage(timeoutMsg);
          
          // Add extra detail logging in case of legato
          if (articulation === 'legato') {
            console.warn(`LEGATO TIMEOUT FIRED at ${new Date().toLocaleTimeString()}`);
            console.warn(`Moving from note ${currentNoteIndex.current} (${note.note}) to note ${nextNoteIdx}`);
            addDebugMessage(`🔍 LEGATO NOTE TIMEOUT FIRED: ${note.note} -> next note`);
          }
          
          // Verify that state is consistent
          if (!isPlaying) {
            logger.warn('⚠️ Note timeout triggered but isPlaying=false, playback appears to have been stopped');
            addDebugMessage('⚠️ ERROR: Timeout fired but isPlaying=false!');
            
            // Special recovery for legato notes - they seem to have issues
            if (articulation === 'legato') {
              console.warn('LEGATO RECOVERY: Attempting to force continue playback');
              addDebugMessage('🔄 LEGATO RECOVERY: Force continuing playback');
              
              // Force the playing state to true and continue
              setIsPlayingWithDebug(true);
              
              // Still continue with playback
            } else {
              return;
            }
          }
          
          // Check if we have a melody to continue playing
          if (!currentMelody || !currentMelody.melody) {
            logger.warn('⚠️ Timeout fired but no melody available to continue');
            addDebugMessage('⚠️ ERROR: No melody available in timeout!');
            return;
          }
          
          logger.debug(`🔄 Recursively calling scheduleNextNote from timeout for note index ${currentNoteIndex.current + 1}`);
          addDebugMessage(`🔄 Scheduling next note (${currentNoteIndex.current + 1})`);
          
          // Call schedule next note directly rather than through ref
          scheduleNextNote();
        }, nextNoteDelay);
        
        // Log the timeout ID
        const timeoutIdString = String(nextNoteTimeout).slice(0, 10);
        logger.debug(`🆔 Set currentTimeoutId to ${timeoutIdString}...`);
        addDebugMessage(`🆔 Set timeout ID: ${timeoutIdString}...`);
        
        // Store the timeout ID
        currentTimeoutId.current = nextNoteTimeout;
      } catch (timeoutError) {
        // Catch any errors in setting up the timeout
        logger.error('❌ Error setting up next note timeout', {
          error: timeoutError instanceof Error ? timeoutError.message : String(timeoutError),
          noteIndex: currentNoteIndex.current,
          nextDelay: nextNoteDelay,
          isPlaying
        });
        addDebugMessage(`❌ ERROR setting up timeout: ${timeoutError instanceof Error ? timeoutError.message : String(timeoutError)}`);
      }
      
    } catch (error) {
      logger.error(`❌ Error in scheduleNextNote for note at index ${currentNoteIndex.current}`, {
        message: (error as Error).message,
        name: (error as Error).name,
        stack: (error as Error).stack,
        note: note ? JSON.stringify(note) : 'undefined',
        isPlaying: isPlaying,
        audioContextState: Tone.context.state
      });
      
      // Try to continue with the next note
      logger.debug(`🔄 Attempting to continue after error by scheduling next note`);
      setTimeout(() => {
        logger.debug(`⏱️ Error recovery timeout triggered, isPlaying=${isPlaying}`);
        if (isPlaying) {
          scheduleNextNote();
        } else {
          logger.warn(`⚠️ Error recovery timeout triggered but isPlaying=false, not scheduling next note`);
        }
      }, 500);
    }
  }, [currentMelody, isPlaying, isRecording, selectedSound, soundsLoaded, addDebugMessage, setIsPlayingWithDebug]);

  // Save reference to scheduleNextNote
  useEffect(() => {
    scheduleNextNoteRef.current = scheduleNextNote;
  }, [scheduleNextNote]);

  // Enhanced toggle function with improved playback control and extensive debugging
  const togglePlayEnhancedMelody = useCallback(async () => {
    logger.debug('🎮 togglePlayEnhancedMelody called', {
      isPlaying: isPlaying,
      hasMelody: Boolean(currentMelody && currentMelody.melody),
      melodyLength: currentMelody?.melody?.length || 0,
      toneStarted: toneStarted,
      audioContextState: Tone.context.state,
      currentNoteIndex: currentNoteIndex.current,
      hasScheduleFunc: Boolean(scheduleNextNoteRef.current),
      hasTimeout: Boolean(currentTimeoutId.current),
      timeoutId: currentTimeoutId.current
    });

    if (!currentMelody) {
      logger.warn('❌ Cannot play melody: no melody available');
      addDebugMessage('❌ Error: No melody available');
      return;
    }
    
    if (!currentMelody.melody || !Array.isArray(currentMelody.melody) || currentMelody.melody.length === 0) {
      logger.warn('❌ Cannot play melody: melody data is missing or empty', {
        melodyExists: Boolean(currentMelody.melody),
        isArray: Array.isArray(currentMelody.melody),
        length: currentMelody.melody ? currentMelody.melody.length : 0
      });
      addDebugMessage('❌ Error: Melody data is missing or empty');
      return;
    }
    
    if (isPlaying) {
      // Stop playback
      logger.debug('⏹️ Stopping melody playback - START STOP SEQUENCE');
      
      // Log current playback state before stopping
      logger.debug('📊 Playback state before stopping', {
        currentNoteIndex: currentNoteIndex.current,
        activeNotesCount: activeNotes.size,
        activeNotes: Array.from(activeNotes),
        currentTimeoutId: currentTimeoutId.current,
        audioContextState: Tone.context.state
      });
      
      // Clear any pending timeouts with verification
      if (currentTimeoutId.current) {
        logger.debug(`🧹 Clearing timeout ID ${currentTimeoutId.current}`);
        clearTimeout(currentTimeoutId.current);
        currentTimeoutId.current = null;
        logger.debug('✅ Timeout cleared successfully');
      } else {
        logger.debug('ℹ️ No active timeout to clear');
      }
      
      // Update state - critical to do this BEFORE releasing sounds to avoid race conditions
      logger.debug('🔄 Setting isPlaying to false');
      setIsPlayingWithDebug(false);
      
      // Stop all active sounds
      if (melodySynthRef.current) {
        logger.debug('🔄 Releasing all notes on melody synth');
        melodySynthRef.current.triggerRelease();
        logger.debug('✅ Melody synth notes released');
      } else {
        logger.debug('ℹ️ No melody synth to release');
      }
      
      if (samplerRef.current) {
        logger.debug('🔄 Releasing all notes on sampler');
        samplerRef.current.releaseAll();
        logger.debug('✅ Sampler notes released');
      } else {
        logger.debug('ℹ️ No sampler to release');
      }
      
      // Reset note indices
      logger.debug(`🔄 Resetting currentNoteIndex from ${currentNoteIndex.current} to -1`);
      currentNoteIndex.current = -1;
      
      // Clear any visual feedback
      logger.debug('🔄 Clearing active notes set and articulations map');
      setActiveNotes(new Set());
      setArticulations(new Map());
      
      // Reset progress bar
      if (progressRef.current) {
        logger.debug('🔄 Resetting progress bar to 0%');
        progressRef.current.style.width = '0%';
      }
      
      logger.debug('✅ Melody playback stopped - END STOP SEQUENCE');
    } else {
      // Start playback
      logger.debug('▶️ Starting melody playback - START PLAY SEQUENCE');
      
      try {
        // Check audio context state with detailed logging
        logger.debug(`🔊 AudioContext current state: ${Tone.context.state}`);
        
        if (Tone.context.state !== 'running') {
          logger.debug('⚠️ AudioContext not running, attempting to start and resume');
          
          // Try to start, but show prompt if it fails
          try {
            logger.debug('🔄 Calling Tone.start()');
            await Tone.start();
            logger.debug('✅ Tone.start() succeeded');
            
            logger.debug('🔄 Calling Tone.context.resume()');
            await Tone.context.resume();
            logger.debug(`✅ Tone.context.resume() succeeded, new state: ${Tone.context.state}`);
            
            setToneStarted(true);
            setShowAudioPrompt(false);
            logger.debug('✅ Audio context initialized successfully');
          } catch (err) {
            logger.warn('❌ AudioContext needs user interaction', {
              error: err instanceof Error ? err.message : String(err),
              contextState: Tone.context.state
            });
            setShowAudioPrompt(true);
            logger.debug('🔄 Showing audio prompt to user');
            return; // Exit early - can't play until user interacts
          }
        } else {
          logger.debug('✅ AudioContext already running');
        }
        
        // Log actual melody data structure in detail for debugging
        logger.debug('🎼 Full melody structure:', JSON.stringify({
          melodyLength: currentMelody.melody?.length || 0,
          notesPreview: currentMelody.melody?.slice(0, 5).map(n => ({
            note: n.note,
            duration: n.duration,
            rest: n.rest,
            velocity: n.velocity,
            articulation: n.articulation
          })),
          totalNotes: currentMelody.melody?.length,
          chordCount: currentMelody.chords?.length || 0,
          tempo: currentMelody.tempo,
          key: currentMelody.key,
          timeSignature: currentMelody.timeSignature,
          style: currentMelody.style
        }, null, 2));
        
        // Reset counters with verification
        logger.debug(`🔄 Setting currentNoteIndex from ${currentNoteIndex.current} to -1`);
        currentNoteIndex.current = -1;  // Will be incremented to 0 in scheduleNextNote
        
        logger.debug(`🔄 Setting currentChordIndex from ${currentChordIndex.current} to -1`);
        currentChordIndex.current = -1;
        
        // Set playing state - this is critical!
        logger.debug('🔄 Setting isPlaying to true');
        setIsPlayingWithDebug(true);
        
        // Log playback start with detailed information
        const tempo = currentMelody.tempo || 120;
        logger.debug('🎵 Starting melody playback', { 
          tempo, 
          notes: currentMelody.melody.length,
          key: currentMelody.key,
          timeSignature: currentMelody.timeSignature,
          startTime: new Date().toISOString(),
          toneTime: Tone.now(),
          audioContextTime: Tone.context.currentTime
        });
        
        // Reset progress indicator
        if (progressRef.current) {
          logger.debug('🔄 Resetting progress bar to 0%');
          progressRef.current.style.width = '0%';
        }
        
        // Verify that scheduleNextNoteRef is set properly
        if (scheduleNextNoteRef.current) {
          logger.debug('🔄 Calling scheduleNextNote to start playback sequence');
          scheduleNextNoteRef.current();
        } else {
          logger.error('❌ scheduleNextNoteRef is not set! Cannot start playback');
          setIsPlayingWithDebug(false);
        }
        
        logger.debug('✅ Melody playback initiated - END PLAY SEQUENCE');
      } catch (error) {
        logger.error('❌ Error during melody playback start', {
          message: error instanceof Error ? error.message : String(error),
          name: error instanceof Error ? error.name : 'Unknown',
          stack: error instanceof Error ? error.stack : 'No stack trace',
          contextState: Tone.context.state
        });
        
        // Make sure to set isPlaying back to false in case of error
        logger.debug('🔄 Setting isPlaying to false due to error');
        setIsPlayingWithDebug(false);
        
        // Show audio prompt if the error is related to AudioContext
        if (error instanceof Error && error.message.includes('AudioContext')) {
          logger.debug('🔄 Error related to AudioContext, showing prompt');
          setShowAudioPrompt(true);
        }
      }
    }
  }, [currentMelody, isPlaying, toneStarted, activeNotes, addDebugMessage, setIsPlayingWithDebug]);

  // Save reference to togglePlayEnhancedMelody
  useEffect(() => {
    togglePlayEnhancedMelodyRef.current = togglePlayEnhancedMelody;
  }, [togglePlayEnhancedMelody]);

  // Stop recording and create downloadable blob
  const stopRecording = useCallback(async () => {
    if (!recorderRef.current || !isRecording) {
      logger.warn('Cannot stop recording: no active recording');
      return;
    }
    
    try {
      logger.debug('Stopping audio recording');
      const recording = await recorderRef.current.stop();
      setIsRecording(false);
      setRecordedBlob(recording);
      
      // Stop playback if it was started for recording
      if (isPlaying && togglePlayEnhancedMelodyRef.current) {
        togglePlayEnhancedMelodyRef.current();
      }
      
      logger.success('Recording completed successfully');
    } catch (error) {
      logger.error('Failed to stop recording', error);
      setIsRecording(false);
    }
  }, [isRecording, isPlaying]);

  // Save reference to stopRecording
  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);

  // Start recording the melody
  const startRecording = useCallback(async () => {
    if (!recorderRef.current) {
      logger.error('Cannot start recording: recorder not initialized');
      return;
    }
    
    try {
      await ensureAudioContextRunning();
      logger.debug('Starting audio recording');
      await recorderRef.current.start();
      setIsRecording(true);
      
      // Start playback if not already playing
      if (!isPlaying && togglePlayEnhancedMelodyRef.current) {
        togglePlayEnhancedMelodyRef.current();
      }
    } catch (error) {
      logger.error('Failed to start recording', error);
    }
  }, [isPlaying, ensureAudioContextRunning]);

  // Download the recorded melody as a WAV file
  const downloadRecording = useCallback(() => {
    if (!recordedBlob) {
      logger.warn('No recording available to download');
      return;
    }
    
    try {
      logger.debug('Creating download link for recorded melody');
      const url = URL.createObjectURL(recordedBlob);
      const a = document.createElement('a');
      const melodyName = `melody_${currentMelody?.style || 'piano'}_${new Date().toISOString().slice(0, 10)}`;
      
      a.href = url;
      a.download = `${melodyName}.wav`;
      a.click();
      
      // Clean up
      URL.revokeObjectURL(url);
      logger.success('Melody download initiated');
    } catch (error) {
      logger.error('Failed to download recording', error);
    }
  }, [recordedBlob, currentMelody]);

  // Handle receiving a new enhanced melody
  const handleEnhancedMelodyGenerated = useCallback((enhancedMelody: Melody) => {
    // Validate melody data before setting
    if (!enhancedMelody) {
      logger.error('Received undefined or null melody data');
      addDebugMessage('❌ ERROR: Received invalid melody data (null/undefined)');
      return;
    }
    
    // Ensure melody array exists
    if (!enhancedMelody.melody) {
      logger.warn('Received melody without notes array, creating empty array');
      enhancedMelody.melody = [];
    }
    
    // Ensure melody array is an array
    if (!Array.isArray(enhancedMelody.melody)) {
      logger.error('Melody notes property is not an array', { 
        type: typeof enhancedMelody.melody 
      });
      addDebugMessage('❌ ERROR: Melody notes property is not an array');
      enhancedMelody.melody = [];
    }
    
    // Ensure chords array exists
    if (!enhancedMelody.chords) {
      logger.warn('Received melody without chords array, creating empty array');
      enhancedMelody.chords = [];
    }
    
    // Set the validated melody
    setCurrentMelody(enhancedMelody);
    
    // Automatically switch to melody mode when a melody is generated
    setMode('melody');
    
    // Reset playback state
    setIsPlaying(false);
    currentNoteIndex.current = -1;
    currentChordIndex.current = -1;
    
    // Log the melody for debugging
    logger.info('Generated enhanced melody', { 
      notesCount: enhancedMelody.melody ? enhancedMelody.melody.length : 0,
      chordsCount: enhancedMelody.chords.length,
      style: enhancedMelody.style,
      key: enhancedMelody.key,
      tempo: enhancedMelody.tempo
    });
    
    // Add debug message about melody status
    if (enhancedMelody.melody && enhancedMelody.melody.length > 0) {
      addDebugMessage(`✅ Melody generated with ${enhancedMelody.melody.length} notes`);
    } else {
      addDebugMessage('⚠️ WARNING: Generated melody contains no notes');
    }
  }, [addDebugMessage]);

  // Toggle between keyboard and melody modes
  const handleModeChange = useCallback((newMode: PianoMode) => {
    logger.debug(`Changing mode to ${newMode}`);
    if (sequenceRef.current) {
      sequenceRef.current.stop();
      sequenceRef.current.dispose();
      sequenceRef.current = null;
    }
    
    // Clear active notes
    setActiveNotes(new Set());
    setIsPlaying(false);
    
    // Reset indices
    currentNoteIndex.current = 0;
    currentChordIndex.current = 0;
    
    // Clear articulations
    setArticulations(new Map());
    
    // Set the new mode
    setMode(newMode);
    setShowModeSelection(false);
    
    logger.debug(`Mode changed to ${newMode}`);
  }, []);

  // Toggle mode selection visibility
  const toggleModeSelection = useCallback(() => {
    setShowModeSelection(prev => !prev);
  }, []);

  // Determine which CSS class to apply based on active and articulation state
  const getKeyClass = (keyId: string) => {
    const isActive = activeNotes.has(keyId);
    const articulation = articulations.get(keyId) || 'normal';
    
    if (isActive) {
      return `key-active ${articulation}`;
    }
    return '';
  };

  // Get appropriate CSS class for the piano container
  const getPianoContainerClass = useCallback(() => {
    let className = 'piano-container';
    
    if (hasFocus) {
      className += ' has-focus';
    }
    
    if (mode === 'keyboard') {
      className += ' keyboard-mode';
    } else {
      className += ' melody-mode';
    }
    
    if (isPlaying) {
      className += ' is-playing';
    }
    
    if (isRecording) {
      className += ' is-recording';
    }
    
    if (showVisualizations) {
      className += ' with-visualizations';
    }
    
    return className;
  }, [hasFocus, mode, isPlaying, isRecording, showVisualizations]);

  // Add a useEffect to update progress bar during playback
  useEffect(() => {
    if (isPlaying && currentMelody && currentMelody.melody && progressRef.current) {
      const totalNotes = currentMelody.melody.length;
      const currentNote = currentNoteIndex.current + 1;
      const progressPercentage = totalNotes > 0 ? (currentNote / totalNotes) * 100 : 0;
      progressRef.current.style.width = `${progressPercentage}%`;
    }
  }, [isPlaying, currentNoteIndex.current, currentMelody]);

  // Optimize synth creation to avoid creating new synths repeatedly
  useEffect(() => {
    // Create synths once when component mounts
    if (!melodySynthRef.current) {
      melodySynthRef.current = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.8 }
      }).toDestination();
    }
    
    if (!chordSynthRef.current) {
      chordSynthRef.current = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.02, decay: 0.2, sustain: 0.5, release: 1.5 }
      }).toDestination();
    }
    
    return () => {
      // Clean up synths on component unmount
      if (melodySynthRef.current) {
        melodySynthRef.current.dispose();
        melodySynthRef.current = null;
      }
      
      if (chordSynthRef.current) {
        chordSynthRef.current.dispose();
        chordSynthRef.current = null;
      }
    };
  }, []);

  // Initialize audio effects
  useEffect(() => {
    const initializeEffects = async () => {
      try {
        await ensureAudioContextRunning();
        
        // Create reverb effect
        if (!reverbRef.current) {
          reverbRef.current = new Tone.Reverb({
            decay: reverbDecay,
            wet: reverbWet,
            preDelay: 0.01
          }).toDestination();
        } else {
          reverbRef.current.decay = reverbDecay;
          reverbRef.current.wet.value = reverbWet;
        }
        
        // Create delay effect
        if (!delayRef.current) {
          delayRef.current = new Tone.FeedbackDelay({
            delayTime: delayTime,
            feedback: delayFeedback,
            wet: delayWet
          }).connect(reverbRef.current);
        } else {
          delayRef.current.delayTime.value = delayTime;
          delayRef.current.feedback.value = delayFeedback;
          delayRef.current.wet.value = delayWet;
        }
        
        logger.debug('Audio effects initialized', {
          reverb: { decay: reverbDecay, wet: reverbWet },
          delay: { time: delayTime, feedback: delayFeedback, wet: delayWet }
        });
      } catch (error) {
        logger.error('Failed to initialize audio effects', error);
      }
    };
    
    initializeEffects();
    
    return () => {
      // Clean up effects on unmount
      if (reverbRef.current) {
        reverbRef.current.dispose();
        reverbRef.current = null;
      }
      
      if (delayRef.current) {
        delayRef.current.dispose();
        delayRef.current = null;
      }
    };
  }, [reverbDecay, reverbWet, delayTime, delayFeedback, delayWet, ensureAudioContextRunning]);

  // Update effects parameters when they change
  useEffect(() => {
    if (reverbRef.current) {
      reverbRef.current.decay = reverbDecay;
      reverbRef.current.wet.value = reverbWet;
    }
    
    if (delayRef.current) {
      delayRef.current.delayTime.value = delayTime;
      delayRef.current.feedback.value = delayFeedback;
      delayRef.current.wet.value = delayWet;
    }
  }, [reverbDecay, reverbWet, delayTime, delayFeedback, delayWet]);

  // Load available sounds using the getAllSounds function
  useEffect(() => {
    const loadSounds = async () => {
      try {
        logger.debug('Loading available sounds...');
        setSoundsLoading(true);
        
        // Get all sounds from the SoundLoader
        const sounds = getAllSounds();
        
        // Update available sounds
        setAvailableSounds(sounds);
        logger.success(`Loaded ${sounds.length} sound options`);
      } catch (error) {
        logger.error('Error loading sounds', { 
          message: (error as Error).message,
          stack: (error as Error).stack 
        });
      } finally {
        setSoundsLoading(false);
      }
    };
    
    // Start loading sounds after a short delay to ensure UI is responsive first
    const timer = setTimeout(() => {
      loadSounds();
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // Update sampler when sound changes
  useEffect(() => {
    if (selectedSound === 'default') {
      setSoundsLoaded(true);
      return;
    }
    
    // Find the selected sound option
    const soundOption = availableSounds.find(sound => sound.id === selectedSound);
    if (!soundOption || !soundOption.url) {
      logger.warn(`Selected sound ${selectedSound} not found or has no URL`);
      setSoundsLoaded(false);
      return;
    }
    
    logger.debug(`Initializing sampler for ${soundOption.name}...`);
    setSoundsLoaded(false);
    
    // Set a timeout to prevent hanging indefinitely
    const timeoutId = setTimeout(() => {
      logger.error(`Loading timeout for sound ${soundOption.name}`);
      setSoundsLoaded(false);
      if (samplerRef.current) {
        samplerRef.current.dispose();
        samplerRef.current = null;
      }
      
      // Fall back to default sound
      setSelectedSound('default');
      alert(`Sound "${soundOption.name}" failed to load (timeout). Falling back to default sound.`);
    }, 5000);
    
    // Ensure audio context is running before creating sampler
    ensureAudioContextRunning().then(() => {
      // Dispose existing sampler
      if (samplerRef.current) {
        samplerRef.current.dispose();
        samplerRef.current = null;
      }
      
      // Create new sampler with the selected sound
      try {
        // Pre-fetch the audio to check if it's valid
        if (soundOption.url) {
          fetch(soundOption.url)
            .then(response => {
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              return response.arrayBuffer();
            })
            .then(buffer => {
              // Create audio buffer from response
              return Tone.context.decodeAudioData(buffer);
            })
            .then(audioBuffer => {
              // Create sampler with pre-loaded buffer and map to all piano notes
              const newSampler = new Tone.Sampler({
                urls: {
                  "C4": audioBuffer,
                },
                release: 1,
                onload: () => {
                  clearTimeout(timeoutId);
                  logger.success(`Sound '${soundOption.name}' loaded successfully`);
                  setSoundsLoaded(true);
                  
                  // Connect sampler to effects chain
                  if (delayRef.current && reverbRef.current) {
                    newSampler.chain(delayRef.current, reverbRef.current, Tone.Destination);
                  } else {
                    newSampler.toDestination();
                  }
                  
                  logger.debug('Sampler connected to effects chain');
                }
              });
              
              samplerRef.current = newSampler;
            })
            .catch(error => {
              clearTimeout(timeoutId);
              logger.error(`Failed to load audio for ${soundOption.name}`, error);
              setSoundsLoaded(false);
              setSelectedSound('default');
            });
        }
      } catch (error) {
        clearTimeout(timeoutId);
        logger.error(`Failed to create sampler for ${soundOption.name}`, error);
        setSoundsLoaded(false);
        setSelectedSound('default');
      }
    }).catch(error => {
      clearTimeout(timeoutId);
      logger.error("Failed to initialize audio context for sampler", error);
      setSoundsLoaded(false);
      setSelectedSound('default');
    });
    
    return () => {
      clearTimeout(timeoutId);
      if (samplerRef.current) {
        samplerRef.current.dispose();
        samplerRef.current = null;
      }
    };
  }, [selectedSound, availableSounds, ensureAudioContextRunning]);

  // Handle sound selection change
  const handleSoundChange = useCallback((soundId: string) => {
    logger.debug(`Changing sound to ${soundId}`);
    setSelectedSound(soundId);
  }, []);

  // Toggle effects panel
  const toggleEffectsPanel = useCallback(() => {
    setShowEffectsPanel(!showEffectsPanel);
  }, [showEffectsPanel]);

  // Sound Options component with added effects controls
  const SoundOptions = () => {
    return (
      <div className="sound-options" style={{ top: mode === 'melody' ? '80px' : '20px' }}>
        <select
          value={selectedSound}
          onChange={(e) => handleSoundChange(e.target.value)}
          disabled={soundsLoading}
          className="sound-selector"
        >
          {availableSounds.map(sound => (
            <option key={sound.id} value={sound.id}>
              {sound.name}
            </option>
          ))}
        </select>
        
        {selectedSound !== 'default' && !soundsLoaded && (
          <span className="loading-indicator">Loading...</span>
        )}
      </div>
    );
  };

  return (
    <div className="enhanced-piano-container" onClick={handleInteraction}>
      {/* Toggle Debug Button */}
      {!showDebugInfo && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setShowDebugInfo(true);
            
            // Find the debug console container and make it visible
            const debugConsole = document.getElementById('debug-console-container');
            if (debugConsole) {
              debugConsole.style.display = 'block';
              
              // Log a message to indicate the debug console was opened
              logger.info('Debug console opened by user');
              
              // Add some initial debug information
              logger.debug('Current state', {
                activeNotes: Array.from(activeNotes),
                isPlaying,
                selectedSound,
                mode,
                audioContext: Tone.context.state
              });
            }
          }} 
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: 'rgba(10, 12, 16, 0.9)',
            color: '#3fdf4b',
            border: '1px solid rgba(63, 223, 75, 0.3)',
            borderRadius: '8px',
            padding: '8px 16px',
            cursor: 'pointer',
            zIndex: 9998,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: '12px',
            fontWeight: 'bold',
            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05) inset',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05) inset';
          }}
        >
          <span style={{ fontSize: '14px' }}>🔧</span>
          Show Debug Console
        </button>
      )}
      
      {/* Audio Context Notification */}
      {showAudioPrompt && (
        <div className="audio-context-notification">
          <h3>Enable Audio</h3>
          <p>Click the button below to enable audio playback for the piano</p>
          <button onClick={(e) => {
            e.stopPropagation();
            initializeTone();
          }}>
            Enable Audio
          </button>
        </div>
      )}
      
      {/* Sound Options */}
      <SoundOptions />
      
      {/* Mode Controls */}
      <div className="mode-controls">
        <button 
          className="mode-toggle-button"
          onClick={(e) => {
            e.stopPropagation();
            toggleModeSelection();
          }}
        >
          {mode === 'keyboard' ? 'Switch to Melody Mode' : 'Switch to Keyboard Mode'}
        </button>
        
        {showModeSelection && (
          <div className="mode-selector">
            <button 
              className={`mode-button ${mode === 'keyboard' ? 'active' : ''}`}
              onClick={() => handleModeChange('keyboard')}
            >
              Keyboard Mode
            </button>
            <button 
              className={`mode-button ${mode === 'melody' ? 'active' : ''}`}
              onClick={() => handleModeChange('melody')}
            >
              Melody Mode
            </button>
            <button className="close-button" onClick={() => setShowModeSelection(false)}>×</button>
          </div>
        )}
      </div>
      
      {/* Melody Controls when in melody mode */}
      {mode === 'melody' && (
        <div className="melody-generator-container">
          <EnhancedMelodyControls
            onGenerateMelody={handleEnhancedMelodyGenerated}
            isGenerating={isGeneratingMelody}
            setIsGenerating={setIsGeneratingMelody}
            availableSounds={availableSounds}
            selectedSound={selectedSound}
            onSoundChange={handleSoundChange}
            reverbWet={reverbWet}
            setReverbWet={setReverbWet}
            reverbDecay={reverbDecay}
            setReverbDecay={setReverbDecay}
            delayWet={delayWet}
            setDelayWet={setDelayWet}
            delayTime={delayTime}
            setDelayTime={setDelayTime}
            delayFeedback={delayFeedback}
            setDelayFeedback={setDelayFeedback}
            showEffectsPanel={showEffectsPanel}
            toggleEffectsPanel={toggleEffectsPanel}
          />
          
          {/* New Improved Playback Controls */}
          <div style={{
            marginTop: '20px',
            padding: '20px',
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
            transform: 'translateZ(0)',
            animation: 'fadeIn 0.4s ease'
          }}>
            <h3 style={{
              margin: '0 0 15px 0',
              color: '#e2e8f0',
              fontSize: '18px',
              fontWeight: '600',
              textAlign: 'center',
              letterSpacing: '0.5px'
            }}>
              <span style={{ marginRight: '8px' }}>🎵</span>
              Melody Player
            </h3>
            
            <div style={{
              display: 'flex',
              gap: '15px',
              justifyContent: 'center',
              marginBottom: '15px'
            }}>
              {/* New Play Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (currentMelody && currentMelody.melody && !isPlaying) {
                    togglePlayEnhancedMelody();
                    addDebugMessage('▶️ Starting melody playback');
                  }
                }}
                disabled={isPlaying || !currentMelody || !currentMelody.melody}
                style={{
                  padding: '15px 25px',
                  background: isPlaying ? 'rgba(75, 85, 99, 0.4)' : 'linear-gradient(135deg, #FF5722, #FF9800)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: (currentMelody && currentMelody.melody && !isPlaying) ? 'pointer' : 'not-allowed',
                  opacity: isPlaying ? 0.6 : 1,
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  width: '150px',
                  boxShadow: isPlaying ? 'none' : '0 4px 6px rgba(0, 0, 0, 0.3)'
                }}
              >
                <span style={{ fontSize: '20px' }}>▶️</span>
                <span>Play</span>
              </button>
              
              {/* New Pause Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isPlaying) {
                    togglePlayEnhancedMelody();
                    addDebugMessage('⏸️ Paused melody playback');
                  }
                }}
                disabled={!isPlaying}
                style={{
                  padding: '15px 25px',
                  background: isPlaying ? 'linear-gradient(135deg, #3949AB, #1E88E5)' : 'rgba(75, 85, 99, 0.4)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: isPlaying ? 'pointer' : 'not-allowed',
                  opacity: isPlaying ? 1 : 0.6,
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  width: '150px',
                  boxShadow: isPlaying ? '0 4px 6px rgba(0, 0, 0, 0.3)' : 'none'
                }}
              >
                <span style={{ fontSize: '20px' }}>⏸️</span>
                <span>Pause</span>
              </button>
            </div>
            
            {!currentMelody || !currentMelody.melody ? (
              <div style={{ 
                marginTop: '10px', 
                color: '#FFA000', 
                background: 'rgba(255,160,0,0.1)', 
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid rgba(255,160,0,0.3)'
              }}>
                ⚠️ Generate a melody first to enable playback
              </div>
            ) : null}
          </div>
        </div>
      )}
      
      <div 
        ref={pianoContainerRef}
        className={getPianoContainerClass()}
        tabIndex={0}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        <div className="piano-keyboard">
          {allKeys.map(({ id, note, keyType, keyboardKey }) => (
            <div
              key={id}
              className={`piano-key ${keyType} ${getKeyClass(id)}`}
              data-note={id}
              data-keyboard-key={keyboardKey}
              onMouseDown={() => {
                initializeTone();
                playNote(id);
              }}
              onMouseUp={() => stopNote(id)}
              onMouseLeave={() => {
                if (activeNotes.has(id)) {
                  stopNote(id);
                }
              }}
            >
              <div className="key-label">{note.replace('#', '♯')}</div>
              {keyboardKey && <div className="keyboard-label">{keyboardKey}</div>}
            </div>
          ))}
        </div>
        
        {mode === 'melody' && (
          <div className="enhanced-melody-visualizer">
            <div className="melody-controls">
              {/* Always show the play button, but disable it if no melody */}
              <button 
                className={`play-button ${isPlaying ? 'playing' : ''} ${!currentMelody || !currentMelody.melody ? 'disabled' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (currentMelody && currentMelody.melody) {
                    togglePlayEnhancedMelody();
                  } else {
                    // Show warning message
                    addDebugMessage('⚠️ Cannot play: No melody available. Please generate a melody first.');
                  }
                }}
                disabled={!currentMelody || !currentMelody.melody}
              >
                {isPlaying ? (
                  <>
                    <span className="pause-icon">⏸</span>
                    <span className="button-text">Pause Melody</span>
                  </>
                ) : (
                  <>
                    <span className="play-icon">▶</span>
                    <span className="button-text">Play Melody</span>
                  </>
                )}
              </button>
              
              {/* Show warning if needed */}
              {!currentMelody || !currentMelody.melody ? (
                <div className="melody-warning">
                  ⚠️ Melody data is missing. Generate a melody first.
                </div>
              ) : null}
              
              {currentMelody && currentMelody.melody && (
                <>
                  {!isRecording && (
                    <button 
                      className="record-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        startRecording();
                      }}
                      disabled={isRecording}
                    >
                      <span className="record-icon">⚫</span>
                      <span className="button-text">Record Melody</span>
                    </button>
                  )}
                  
                  {isRecording && (
                    <button 
                      className="stop-record-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        stopRecording();
                      }}
                    >
                      <span className="stop-icon">⏹</span>
                      <span className="button-text">Stop Recording</span>
                    </button>
                  )}
                </>
              )}
              
              {currentMelody && recordedBlob && (
                <button 
                  className="download-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadRecording();
                  }}
                >
                  <span className="download-icon">💾</span>
                  <span className="button-text">Download WAV</span>
                </button>
              )}
              
              {currentMelody && (
                <div className="melody-info-display">
                  {currentMelody.tempo && (
                    <div className="tempo-display">
                      <span className="info-label">Tempo:</span>
                      <span className="info-value">{currentMelody.tempo} BPM</span>
                    </div>
                  )}
                
                {currentMelody.key && (
                  <div className="key-display">
                    <span className="info-label">Key:</span>
                    <span className="info-value">{currentMelody.key}</span>
                  </div>
                )}
                
                {currentMelody.style && (
                  <div className="style-display">
                    <span className="info-label">Style:</span>
                    <span className="info-value">{currentMelody.style}</span>
                  </div>
                )}
              </div>
              )}
            </div>
            
            {currentMelody && currentMelody.melody && (
              <div className="melody-visualization">
                <div className="melody-timeline">
                  {currentMelody.melody.map((note, index) => (
                    <div 
                      key={index}
                      className={`melody-note ${note.rest ? 'rest' : ''} ${index === currentNoteIndex.current ? 'current' : ''} ${note.articulation || ''}`}
                      style={{ 
                        height: note.rest ? '10px' : `${Math.min(90, 30 + (note.velocity || 80) / 2)}px`,
                        width: `${note.duration * 30}px`
                      }}
                      title={note.rest ? 'Rest' : `${note.note} (${note.articulation || 'normal'}, velocity: ${note.velocity || 80})`}
                    />
                  ))}
                </div>
                
                <div className="chord-timeline">
                  {currentMelody.chords && currentMelody.chords.map((chord, index) => (
                    <div 
                      key={index}
                      className={`chord-block ${index === currentChordIndex.current ? 'current' : ''}`}
                      style={{ width: `${chord.duration * 30}px` }}
                      title={`${chord.chord_symbol || chord.notes.join(', ')}`}
                    >
                      {chord.chord_symbol && <span className="chord-symbol">{chord.chord_symbol}</span>}
                    </div>
                  ))}
                </div>
                
                <div className="melody-progress">
                  <div className="progress-indicator" ref={progressRef} style={{ width: '0%' }}></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedPiano; 
