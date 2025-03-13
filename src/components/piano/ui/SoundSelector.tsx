import React from 'react';
import '../styles/SoundSelector.css';
import { SoundType } from '../../../services/SoundLoader';

interface SoundSelectorProps {
  availableSounds: Record<string, SoundType[]>;
  currentSound: SoundType;
  isLoading: boolean;
  onChange: (sound: SoundType) => void;
}

const SoundSelector: React.FC<SoundSelectorProps> = ({
  availableSounds,
  currentSound,
  isLoading,
  onChange
}) => {
  const handleSoundChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value as SoundType);
  };

  return (
    <div className="sound-options">
      <label htmlFor="sound-selector">SOUND</label>
      <select
        id="sound-selector"
        className={`sound-selector ${isLoading ? 'loading' : ''}`}
        value={currentSound}
        onChange={handleSoundChange}
        disabled={isLoading}
      >
        {Object.entries(availableSounds).map(([category, sounds]) => (
          <optgroup key={category} label={category.toUpperCase()}>
            {sounds.map((sound) => (
              <option key={sound} value={sound}>
                {sound.split(' - ').pop()?.replace(/_.+$/, '') || sound}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {isLoading && <span className="loading-indicator">Loading...</span>}
    </div>
  );
};

export default SoundSelector;