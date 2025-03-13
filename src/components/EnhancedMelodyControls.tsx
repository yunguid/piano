import React, { useState } from 'react';
import { Melody, MusicStyle } from '../services/MelodyGenerator';
import { EnhancedMelodyGenerator, MelodyComplexity } from '../services/EnhancedMelodyGenerator';
import Logger from '../utils/Logger';
import './EnhancedMelodyStyles.css';

// Create a domain-specific logger
const logger = new Logger('MelodyControls');

interface MelodyControlsProps {
  onGenerateMelody: (melody: Melody) => void;
  isGenerating: boolean;
  setIsGenerating: (isGenerating: boolean) => void;
}

// Predefined moods for better music generation
const MOODS = ["happy", "melancholic", "energetic", "relaxed", "mysterious", "dramatic", "playful", "romantic"];

// Predefined articulations for more interesting music
const ARTICULATIONS = ["staccato", "legato", "accent", "tenuto", "marcato"];

const EnhancedMelodyControls: React.FC<MelodyControlsProps> = ({
  onGenerateMelody,
  isGenerating,
  setIsGenerating
}) => {
  const [selectedStyle, setSelectedStyle] = useState<MusicStyle>("classical");
  const [selectedComplexity, setSelectedComplexity] = useState<MelodyComplexity>("medium");
  const [generatedMelodyInfo, setGeneratedMelodyInfo] = useState<string>("");
  const [selectedMood, setSelectedMood] = useState<string>("happy");
  const [melodyLength, setMelodyLength] = useState<number>(8);
  const [useChords, setUseChords] = useState<boolean>(true);
  const [selectedArticulation, setSelectedArticulation] = useState<string>("legato");
  
  // Create a shared instance of the melody generator
  const melodyGenerator = new EnhancedMelodyGenerator();
  
  const generateMelody = async () => {
    setIsGenerating(true);
    setGeneratedMelodyInfo("Creating your unique melody...");
    
    logger.perfStart('Melody Generation');
    logger.music(`Generating ${selectedStyle} melody`, {
      style: selectedStyle,
      complexity: selectedComplexity,
      mood: selectedMood,
      length: melodyLength,
      useChords,
      articulation: selectedArticulation
    });
    
    try {
      // Include mood, articulation, and other parameters for more unique results
      const prompt = `Generate a ${melodyLength}-bar ${selectedMood} ${selectedStyle} melody with ${selectedComplexity} complexity in the style of a creative composer. Use ${selectedArticulation} articulation and ${useChords ? "include interesting chords" : "focus on melody only"}. Make it unique and memorable with varied dynamics and rhythm.`;
      
      logger.debug('Generated prompt', prompt);
      
      // Use the non-streaming method
      const melody = await melodyGenerator.generateEnhancedMelody(
        selectedStyle, 
        selectedComplexity,
        prompt,
        melodyLength,
        useChords
      );
      
      logger.perfEnd('Melody Generation');
      logger.success('Successfully generated melody', {
        style: melody.style,
        tempo: melody.tempo,
        chords: melody.chords.length,
        notes: melody.melody?.length || 0
      });
      
      onGenerateMelody(melody);
      
      const melodyInfo = `${selectedMood.charAt(0).toUpperCase() + selectedMood.slice(1)} ${selectedStyle} melody with ${selectedComplexity} complexity. ${selectedArticulation} articulation. ${melody.chords.length} chords.`;
      logger.info(melodyInfo);
      setGeneratedMelodyInfo(melodyInfo);
    } catch (error) {
      logger.error("Failed to generate melody", error);
      setGeneratedMelodyInfo("Could not generate melody. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <div className="enhanced-melody-controls">
      <div className="melody-config">
        <div className="control-group">
          <h3>Style</h3>
          <div className="style-select">
            <select
              value={selectedStyle}
              onChange={(e) => setSelectedStyle(e.target.value as MusicStyle)}
              disabled={isGenerating}
            >
              <option value="classical">Classical</option>
              <option value="jazz">Jazz</option>
              <option value="pop">Pop</option>
              <option value="folk">Folk</option>
              <option value="blues">Blues</option>
              <option value="electronic">Electronic</option>
              <option value="cinematic">Cinematic</option>
            </select>
          </div>
        </div>
        
        <div className="control-group">
          <h3>Complexity</h3>
          <div className="complexity-controls">
            <button
              className={selectedComplexity === "simple" ? "active" : ""}
              onClick={() => setSelectedComplexity("simple")}
              disabled={isGenerating}
            >
              Simple
            </button>
            <button
              className={selectedComplexity === "medium" ? "active" : ""}
              onClick={() => setSelectedComplexity("medium")}
              disabled={isGenerating}
            >
              Medium
            </button>
            <button
              className={selectedComplexity === "complex" ? "active" : ""}
              onClick={() => setSelectedComplexity("complex")}
              disabled={isGenerating}
            >
              Complex
            </button>
          </div>
        </div>
        
        <div className="control-group">
          <h3>Mood</h3>
          <div className="mood-controls">
            {MOODS.slice(0, 4).map(mood => (
              <button
                key={mood}
                className={selectedMood === mood ? "active" : ""}
                onClick={() => setSelectedMood(mood)}
                disabled={isGenerating}
              >
                {mood.charAt(0).toUpperCase() + mood.slice(1)}
              </button>
            ))}
          </div>
          <div className="mood-controls">
            {MOODS.slice(4).map(mood => (
              <button
                key={mood}
                className={selectedMood === mood ? "active" : ""}
                onClick={() => setSelectedMood(mood)}
                disabled={isGenerating}
              >
                {mood.charAt(0).toUpperCase() + mood.slice(1)}
              </button>
            ))}
          </div>
        </div>
        
        <div className="control-group">
          <h3>Articulation</h3>
          <div className="articulation-controls">
            {ARTICULATIONS.map(articulation => (
              <button
                key={articulation}
                className={selectedArticulation === articulation ? "active" : ""}
                onClick={() => setSelectedArticulation(articulation)}
                disabled={isGenerating}
              >
                {articulation.charAt(0).toUpperCase() + articulation.slice(1)}
              </button>
            ))}
          </div>
        </div>
        
        <div className="control-group">
          <h3>Length</h3>
          <div className="slider-control">
            <input
              type="range"
              min={4}
              max={16}
              step={2}
              value={melodyLength}
              onChange={(e) => setMelodyLength(parseInt(e.target.value))}
              disabled={isGenerating}
            />
            <span>{melodyLength} bars</span>
          </div>
        </div>
        
        <div className="control-group">
          <div className="toggle-control">
            <label>
              <input
                type="checkbox"
                checked={useChords}
                onChange={() => setUseChords(!useChords)}
                disabled={isGenerating}
              />
              Include chords
            </label>
          </div>
        </div>
        
        {/* Streaming generation control removed */}
      </div>
      
      <div className="melody-generate">
        <button
          className="generate-btn"
          onClick={generateMelody}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <span className="spinner" style={{ 
                width: '18px', 
                height: '18px', 
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                borderTopColor: 'white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginRight: '10px'
              }}></span>
              Generating Melody...
            </>
          ) : (
            <>
              <span style={{ marginRight: '8px', fontSize: '16px' }}>🎵</span>
              Generate New Melody
            </>
          )}
        </button>
        {/* Streaming status indicator removed */}
        
        <div className="melody-info">
          {isGenerating ? (
            <div style={{ opacity: 0.7, fontStyle: 'italic' }}>
              {generatedMelodyInfo}
            </div>
          ) : generatedMelodyInfo ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span style={{ color: '#4CAF50', fontSize: '16px' }}>✓</span>
              <span>{generatedMelodyInfo}</span>
            </div>
          ) : (
            <div style={{ opacity: 0.7, fontStyle: 'italic' }}>
              Generate a melody to begin playing
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedMelodyControls; 