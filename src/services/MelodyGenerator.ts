// MelodyGenerator.ts - Common types and interfaces for music generation

// Define types for our melody generation
export interface Note {
  note?: string;
  pitch?: string; // Backward compatibility
  duration: number;
  rest?: boolean;
  velocity?: number; // 0-127 for volume
  articulation?: 'normal' | 'staccato' | 'legato' | 'accent' | 'tenuto' | 'marcato';
  tie?: boolean; // Indicates if this note is tied to the next one
}

export interface Chord {
  notes: string[];
  duration: number;
  chord_symbol?: string; // For enhanced chord display
  voicing?: 'close' | 'spread' | 'drop2' | 'drop3' | 'open';
}

export interface Melody {
  notes?: Note[]; // New enhanced melodies will use this
  melody?: Note[]; // Backward compatibility 
  chords: Chord[];
  tempo: number;
  style: string;
  key?: string;
  timeSignature?: string;
}

export type MusicStyle = 
  | 'jazz'
  | 'classical'
  | 'blues'
  | 'pop'
  | 'ambient'
  | 'cinematic'
  | 'electronic'
  | 'folk';

// Fallback melodies in case the API call fails
export const getFallbackMelody = (style: MusicStyle): Melody => {
  console.log(`🎹 Using fallback melody for ${style} style`);
  
  const fallbacks: Record<MusicStyle, Melody> = {
    jazz: {
      chords: [
        { notes: ["D4", "F#4", "A4", "C5"], duration: 1 },
        { notes: ["G4", "B4", "D5", "F5"], duration: 1 },
        { notes: ["C4", "E4", "G4", "B4"], duration: 1 },
        { notes: ["F4", "A4", "C5", "E5"], duration: 1 },
        { notes: ["Bb4", "D5", "F5"], duration: 1 },
        { notes: ["A4", "C#5", "E5", "G5"], duration: 1 },
        { notes: ["D4", "F#4", "A4", "C5"], duration: 1 },
        { notes: ["G4", "B4", "D5"], duration: 1 }
      ],
      tempo: 120,
      style: "jazz"
    },
    classical: {
      chords: [
        { notes: ["C4", "E4", "G4"], duration: 1 },
        { notes: ["G4", "B4", "D5"], duration: 1 },
        { notes: ["A4", "C5", "E5"], duration: 1 },
        { notes: ["F4", "A4", "C5"], duration: 1 },
        { notes: ["C4", "E4", "G4"], duration: 1 },
        { notes: ["G4", "B4", "D5"], duration: 1 },
        { notes: ["C4", "E4", "G4"], duration: 1 }
      ],
      tempo: 90,
      style: "classical"
    },
    blues: {
      chords: [
        { notes: ["C4", "E4", "G4", "Bb4"], duration: 1 },
        { notes: ["C4", "E4", "G4", "Bb4"], duration: 1 },
        { notes: ["C4", "E4", "G4", "Bb4"], duration: 1 },
        { notes: ["C4", "E4", "G4", "Bb4"], duration: 1 },
        { notes: ["F4", "A4", "C5", "Eb5"], duration: 1 },
        { notes: ["F4", "A4", "C5", "Eb5"], duration: 1 },
        { notes: ["C4", "E4", "G4", "Bb4"], duration: 1 },
        { notes: ["C4", "E4", "G4", "Bb4"], duration: 1 },
        { notes: ["G4", "B4", "D5", "F5"], duration: 1 },
        { notes: ["F4", "A4", "C5", "Eb5"], duration: 1 },
        { notes: ["C4", "E4", "G4", "Bb4"], duration: 1 },
        { notes: ["G4", "B4", "D5", "F5"], duration: 1 }
      ],
      tempo: 80,
      style: "blues"
    },
    pop: {
      chords: [
        { notes: ["C4", "E4", "G4"], duration: 1 },
        { notes: ["G4", "B4", "D5"], duration: 1 },
        { notes: ["A4", "C5", "E5"], duration: 1 },
        { notes: ["F4", "A4", "C5"], duration: 1 },
        { notes: ["C4", "E4", "G4"], duration: 1 },
        { notes: ["G4", "B4", "D5"], duration: 1 },
        { notes: ["A4", "C5", "E5"], duration: 1 },
        { notes: ["F4", "A4", "C5"], duration: 1 }
      ],
      tempo: 120,
      style: "pop"
    },
    ambient: {
      chords: [
        { notes: ["C4", "G4", "C5", "E5"], duration: 2 },
        { notes: ["A3", "E4", "A4", "C5"], duration: 2 },
        { notes: ["F3", "C4", "F4", "A4"], duration: 2 },
        { notes: ["G3", "D4", "G4", "B4"], duration: 2 },
        { notes: ["C4", "G4", "C5", "E5"], duration: 2 },
        { notes: ["A3", "E4", "A4", "C5"], duration: 2 }
      ],
      tempo: 70,
      style: "ambient"
    },
    cinematic: {
      chords: [
        { notes: ["C3", "G3", "C4", "E4"], duration: 2 },
        { notes: ["Ab3", "Eb4", "Ab4", "C5"], duration: 2 },
        { notes: ["F3", "C4", "F4", "A4"], duration: 2 },
        { notes: ["G3", "D4", "G4", "B4"], duration: 2 },
        { notes: ["C3", "G3", "C4", "E4"], duration: 2 },
        { notes: ["F3", "C4", "F4", "A4"], duration: 2 }
      ],
      tempo: 60,
      style: "cinematic"
    },
    electronic: {
      chords: [
        { notes: ["C4", "E4", "G4", "B4"], duration: 1 },
        { notes: ["A3", "C4", "E4", "G4"], duration: 1 },
        { notes: ["F3", "A3", "C4", "E4"], duration: 1 },
        { notes: ["G3", "B3", "D4", "F4"], duration: 1 },
        { notes: ["C4", "E4", "G4", "B4"], duration: 1 },
        { notes: ["A3", "C4", "E4", "G4"], duration: 1 },
        { notes: ["F3", "A3", "C4", "E4"], duration: 1 },
        { notes: ["G3", "B3", "D4", "F4"], duration: 1 }
      ],
      tempo: 128,
      style: "electronic"
    },
    folk: {
      chords: [
        { notes: ["G3", "B3", "D4"], duration: 1 },
        { notes: ["C4", "E4", "G4"], duration: 1 },
        { notes: ["D4", "F#4", "A4"], duration: 1 },
        { notes: ["G3", "B3", "D4"], duration: 1 },
        { notes: ["E4", "G4", "B4"], duration: 1 },
        { notes: ["C4", "E4", "G4"], duration: 1 },
        { notes: ["D4", "F#4", "A4"], duration: 1 },
        { notes: ["G3", "B3", "D4"], duration: 1 }
      ],
      tempo: 100,
      style: "folk"
    }
  };
  
  return fallbacks[style];
};