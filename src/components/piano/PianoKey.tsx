import React, { memo } from 'react';
import './styles/PianoKey.css';

type PianoKeyProps = {
  note: string;
  keyType: 'white' | 'black';
  keyLabel: string;
  keyboardKey?: string;
  isActive: boolean;
  articulation?: 'staccato' | 'legato' | 'accent' | 'tenuto' | 'marcato' | null;
  onMouseDown: (note: string) => void;
  onMouseUp: (note: string) => void;
  onMouseEnter: (note: string, isMousePressed: boolean) => void;
};

const PianoKey: React.FC<PianoKeyProps> = memo(
  ({ note, keyType, keyLabel, keyboardKey, isActive, articulation, onMouseDown, onMouseUp, onMouseEnter }) => {
    const handleMouseDown = () => {
      onMouseDown(note);
    };

    const handleMouseUp = () => {
      onMouseUp(note);
    };

    const handleMouseEnter = (e: React.MouseEvent) => {
      onMouseEnter(note, e.buttons === 1);
    };

    return (
      <div
        className={`piano-key ${keyType} ${isActive ? 'active' : ''} ${articulation || ''}`}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseEnter={handleMouseEnter}
        data-note={note}
        data-keyboard-key={keyboardKey}
      >
        <div className="key-content">
          <div className="key-label">{keyLabel}</div>
          {keyboardKey && <div className="keyboard-label">{keyboardKey}</div>}
        </div>
        <div className="ripple-effect"></div>
      </div>
    );
  }
);

export default PianoKey;