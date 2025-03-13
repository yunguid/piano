import Logger from '../utils/Logger';

// Create a domain-specific logger
const logger = new Logger('SoundLoader');

// Sound option interface
export interface SoundOption {
  id: string;
  name: string;
  url?: string;
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

// Helper to dynamically import a sound file
export const importSound = async (path: string): Promise<any> => {
  try {
    return await import(/* @vite-ignore */ path);
  } catch (error) {
    logger.error(`Failed to import sound: ${path}`, { error });
    throw error;
  }
};

// Default sounds always available
export const DEFAULT_SOUNDS: SoundOption[] = [
  { id: 'default', name: 'Default Synth' }
]; 