import Logger from '../utils/Logger';

// Create a domain-specific logger
const logger = new Logger('SoundLoader');

// Sound option interface
export interface SoundOption {
  id: string;
  name: string;
  url?: string;
  category: string;
}

// Load a sound from a URL
export const loadSound = async (url: string): Promise<ArrayBuffer> => {
  try {
    logger.debug(`Loading sound from ${url}...`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to load sound: ${response.status} ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();
    logger.success(`Sound loaded successfully: ${url} (${buffer.byteLength} bytes)`);
    return buffer;
  } catch (error) {
    logger.error(`Error loading sound: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
};

// Get name from filename
export const getSoundNameFromFilename = (filename: string): string => {
  // Remove extension
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  
  // Convert to title case and replace underscores and hyphens with spaces
  return nameWithoutExt
    .replace(/[_-]/g, ' ')
    .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
};

// Dynamically load all sound files
const soundModules = import.meta.glob('../assets/sounds/*/*.wav', { eager: true });

type InstrumentSounds = Record<string, Record<string, string>>;

const instrumentSounds: InstrumentSounds = {};

Object.entries(soundModules).forEach(([path, module]) => {
  const parts = path.split('/');
  const instrument = parts[parts.length - 2];
  const note = parts[parts.length - 1].replace('.wav', '');
  if (!instrumentSounds[instrument]) {
    instrumentSounds[instrument] = {};
  }
  instrumentSounds[instrument][note] = (module as any).default;
});

export const AVAILABLE_INSTRUMENTS: string[] = Object.keys(instrumentSounds);

export const getInstrumentSounds = (instrument: string): Record<string, string> => {
  return instrumentSounds[instrument] || {};
};

// Create sound options from instrument sounds
export const getAllSounds = (): SoundOption[] => {
  const sounds: SoundOption[] = [
    { id: 'default', name: 'Default Synth', category: 'synth' }
  ];
  
  AVAILABLE_INSTRUMENTS.forEach(instrument => {
    const instrumentSoundMap = getInstrumentSounds(instrument);
    
    // Get the first sound from each instrument for the dropdown
    const firstSoundUrl = Object.values(instrumentSoundMap)[0];
    if (firstSoundUrl) {
      sounds.push({
        id: `${instrument}_main`,
        name: instrument.charAt(0).toUpperCase() + instrument.slice(1),
        url: firstSoundUrl,
        category: instrument
      });
    }
    
    // Add individual sounds if needed
    Object.entries(instrumentSoundMap).forEach(([note, url]) => {
      sounds.push({
        id: `${instrument}_${note}`,
        name: `${instrument.charAt(0).toUpperCase() + instrument.slice(1)} - ${note}`,
        url,
        category: instrument
      });
    });
  });
  
  return sounds;
};

// Default sounds always available
export const DEFAULT_SOUNDS: SoundOption[] = [
  { id: 'default', name: 'Default Synth', category: 'synth' }
]; 