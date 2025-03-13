import React, { useState, useCallback, useEffect } from 'react';
import PianoKey from './PianoKey';
import './styles/PianoKeyboard.css';

// Configuration for piano keys
const WHITE_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const BLACK_KEYS = ['C#', 'D#', 'F#', 'G#', 'A#'];
const KEYBOARD_MAPPING = {
  a: 'C3', w: 'C#3', s: 'D3', e: 'D#3', d: 'E3', f: 'F3',
  t: 'F#3', g: 'G3', y: 'G#3', h: 'A3', u: 'A#3', j: 'B3',
  k: 'C4', o: 'C#4', l: 'D4', p: 'D#4', ';': 'E4', '\'': 'F4'
};

type ArticulationType = 'staccato' | 'legato' | 'accent' | 'tenuto' | 'marcato' | null;

interface PianoKeyboardProps {
  startOctave: number;
  endOctave: number;
  activeNotes: string[];
  articulations: Record<string, ArticulationType>;
  onNoteOn: (note: string) => void;
  onNoteOff: (note: string) => void;
}

const PianoKeyboard: React.FC<PianoKeyboardProps> = ({
  startOctave,
  endOctave,
  activeNotes,
  articulations,
  onNoteOn,
  onNoteOff
}) => {
  const [isMousePressed, setIsMousePressed] = useState(false);

  // Generate piano keys based on octave range
  const renderPianoKeys = useCallback(() => {
    const keys = [];
    
    for (let octave = startOctave; octave <= endOctave; octave++) {
      // Add white keys
      WHITE_KEYS.forEach(note => {
        const fullNote = `${note}${octave}`;
        const keyboardKey = Object.entries(KEYBOARD_MAPPING).find(([_, mappedNote]) => mappedNote === fullNote)?.[0];
        
        keys.push(
          <PianoKey
            key={fullNote}
            note={fullNote}
            keyType="white"
            keyLabel={fullNote}
            keyboardKey={keyboardKey}
            isActive={activeNotes.includes(fullNote)}
            articulation={articulations[fullNote] || null}
            onMouseDown={onNoteOn}
            onMouseUp={onNoteOff}
            onMouseEnter={handleMouseEnter}
          />
        );
      });
      
      // Add black keys (rendered in a second pass to ensure proper z-index)
      BLACK_KEYS.forEach(note => {
        const fullNote = `${note}${octave}`;
        const keyboardKey = Object.entries(KEYBOARD_MAPPING).find(([_, mappedNote]) => mappedNote === fullNote)?.[0];
        
        keys.push(
          <PianoKey
            key={fullNote}
            note={fullNote}
            keyType="black"
            keyLabel={fullNote}
            keyboardKey={keyboardKey}
            isActive={activeNotes.includes(fullNote)}
            articulation={articulations[fullNote] || null}
            onMouseDown={onNoteOn}
            onMouseUp={onNoteOff}
            onMouseEnter={handleMouseEnter}
          />
        );
      });
    }
    
    return keys;
  }, [startOctave, endOctave, activeNotes, articulations, onNoteOn, onNoteOff]);

  const handleMouseEnter = useCallback((note: string, isPressed: boolean) => {
    if (isPressed) {
      onNoteOn(note);
    }
  }, [onNoteOn]);

  const handleMouseDown = useCallback(() => {
    setIsMousePressed(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsMousePressed(false);
  }, []);

  // Setup keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return; // Prevent repeat events
      
      const note = KEYBOARD_MAPPING[e.key as keyof typeof KEYBOARD_MAPPING];
      if (note && !activeNotes.includes(note)) {
        onNoteOn(note);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const note = KEYBOARD_MAPPING[e.key as keyof typeof KEYBOARD_MAPPING];
      if (note) {
        onNoteOff(note);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeNotes, onNoteOn, onNoteOff]);

  // Add global mouse event listeners
  useEffect(() => {
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseUp);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [handleMouseDown, handleMouseUp]);

  return (
    <div className="piano-keyboard">
      {renderPianoKeys()}
      <div className="piano-reflection"></div>
    </div>
  );
};

export default PianoKeyboard;