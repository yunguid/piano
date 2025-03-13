import { SoundType } from '../../../services/SoundLoader';

export type EffectsSettings = {
  reverb: {
    wet: number;
    decay: number;
  };
  delay: {
    wet: number;
    time: number;
    feedback: number;
  };
  filter: {
    frequency: number;
    resonance: number;
  };
};

class AudioEngine {
  private audioContext: AudioContext | null = null;
  private soundBuffers: Record<string, AudioBuffer> = {};
  private activeNodes: Map<string, {
    source: AudioBufferSourceNode;
    gain: GainNode;
    startTime: number;
  }> = new Map();
  private masterGain: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private delayNode: DelayNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private reverbGain: GainNode | null = null;
  private delayGain: GainNode | null = null;
  private reverbImpulse: AudioBuffer | null = null;
  private currentEffectsSettings: EffectsSettings = {
    reverb: { wet: 0.1, decay: 1.5 },
    delay: { wet: 0.2, time: 0.3, feedback: 0.4 },
    filter: { frequency: 2000, resonance: 1 }
  };
  private volume = 0.8;
  private initialized = false;

  // Initialize audio context and setup audio graph
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.volume;
      
      // Create and configure effects
      await this.createReverb();
      this.createDelay();
      this.createFilter();
      
      // Connect audio graph
      this.filterNode!.connect(this.delayNode!);
      this.delayNode!.connect(this.delayGain!);
      this.delayGain!.connect(this.masterGain!);
      this.filterNode!.connect(this.reverbNode!);
      this.reverbNode!.connect(this.reverbGain!);
      this.reverbGain!.connect(this.masterGain!);
      this.filterNode!.connect(this.masterGain!);
      this.masterGain!.connect(this.audioContext.destination);
      
      // Update effects with initial settings
      this.updateEffects(this.currentEffectsSettings);
      
      this.initialized = true;
    } catch (error) {
      console.error("Error initializing audio engine:", error);
      throw error;
    }
  }

  // Create and configure reverb effect
  private async createReverb(): Promise<void> {
    this.reverbNode = this.audioContext!.createConvolver();
    this.reverbGain = this.audioContext!.createGain();
    this.reverbGain.gain.value = this.currentEffectsSettings.reverb.wet;
    
    // Generate impulse response or load from file
    const sampleRate = this.audioContext!.sampleRate;
    const length = sampleRate * this.currentEffectsSettings.reverb.decay;
    const impulse = this.audioContext!.createBuffer(2, length, sampleRate);
    
    const leftChannel = impulse.getChannelData(0);
    const rightChannel = impulse.getChannelData(1);
    
    for (let i = 0; i < length; i++) {
      const n = i / length;
      // Exponential decay
      const value = Math.random() * 2 - 1;
      // Apply decay curve
      const decay = Math.exp(-n * 5);
      leftChannel[i] = value * decay;
      rightChannel[i] = value * decay;
    }
    
    this.reverbImpulse = impulse;
    this.reverbNode.buffer = this.reverbImpulse;
  }

  // Create and configure delay effect
  private createDelay(): void {
    this.delayNode = this.audioContext!.createDelay();
    this.delayGain = this.audioContext!.createGain();
    
    this.delayNode.delayTime.value = this.currentEffectsSettings.delay.time;
    this.delayGain.gain.value = this.currentEffectsSettings.delay.wet;
    
    // Create feedback loop
    const feedbackGain = this.audioContext!.createGain();
    feedbackGain.gain.value = this.currentEffectsSettings.delay.feedback;
    
    this.delayNode.connect(feedbackGain);
    feedbackGain.connect(this.delayNode);
  }

  // Create and configure filter effect
  private createFilter(): void {
    this.filterNode = this.audioContext!.createBiquadFilter();
    this.filterNode.type = "lowpass";
    this.filterNode.frequency.value = this.currentEffectsSettings.filter.frequency;
    this.filterNode.Q.value = this.currentEffectsSettings.filter.resonance;
  }

  // Update effects with new settings
  updateEffects(settings: EffectsSettings): void {
    this.currentEffectsSettings = { ...settings };
    
    if (this.initialized) {
      // Update reverb
      this.reverbGain!.gain.value = settings.reverb.wet;
      
      // Update delay
      this.delayNode!.delayTime.setValueAtTime(
        settings.delay.time, 
        this.audioContext!.currentTime
      );
      this.delayGain!.gain.value = settings.delay.wet;
      
      // Update filter
      this.filterNode!.frequency.setValueAtTime(
        settings.filter.frequency, 
        this.audioContext!.currentTime
      );
      this.filterNode!.Q.value = settings.filter.resonance;
    }
  }

  // Load sound buffer
  loadSound(name: string, buffer: AudioBuffer): void {
    this.soundBuffers[name] = buffer;
  }

  // Play a note with options
  playNote(
    note: string, 
    sound: SoundType = 'piano', 
    velocity: number = 0.8, 
    articulation?: string
  ): void {
    if (!this.initialized || !this.audioContext) {
      return;
    }
    
    // Resume audio context if it's suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    // Get buffer for this sound
    const buffer = this.soundBuffers[sound] || this.soundBuffers['piano'];
    if (!buffer) {
      console.warn(`No sound loaded for ${sound}`);
      return;
    }
    
    // Create nodes
    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();
    
    // Set buffer and connect
    source.buffer = buffer;
    source.connect(gainNode);
    gainNode.connect(this.filterNode!);
    
    // Apply articulation settings
    const now = this.audioContext.currentTime;
    const duration = buffer.duration;
    
    // Base gain value affected by velocity
    gainNode.gain.value = Math.max(0.1, Math.min(1, velocity));
    
    // Handle different articulations
    switch (articulation) {
      case 'staccato':
        // Short and detached
        source.playbackRate.value = 1.0;
        gainNode.gain.setValueAtTime(velocity, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.3);
        break;
        
      case 'legato':
        // Smooth and connected
        source.playbackRate.value = 0.95;
        gainNode.gain.setValueAtTime(velocity * 0.8, now);
        gainNode.gain.linearRampToValueAtTime(velocity, now + 0.1);
        gainNode.gain.linearRampToValueAtTime(0.01, now + duration * 0.9);
        break;
        
      case 'accent':
        // Emphasized
        source.playbackRate.value = 1.05;
        gainNode.gain.setValueAtTime(velocity * 1.2, now);
        gainNode.gain.exponentialRampToValueAtTime(velocity * 0.8, now + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.8);
        break;
        
      case 'tenuto':
        // Held for full duration
        source.playbackRate.value = 0.98;
        gainNode.gain.setValueAtTime(velocity * 0.9, now);
        gainNode.gain.linearRampToValueAtTime(velocity * 0.7, now + 0.2);
        gainNode.gain.linearRampToValueAtTime(0.01, now + duration * 1.0);
        break;
        
      case 'marcato':
        // Strongly accented
        source.playbackRate.value = 1.08;
        gainNode.gain.setValueAtTime(velocity * 1.3, now);
        gainNode.gain.exponentialRampToValueAtTime(velocity * 0.6, now + 0.15);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.7);
        break;
        
      default:
        // Default articulation
        source.playbackRate.value = 1.0;
        gainNode.gain.setValueAtTime(velocity, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.8);
    }
    
    // Start playback and store active node
    source.start();
    this.activeNodes.set(note, { source, gain: gainNode, startTime: now });
    
    // Auto-release after buffer duration
    const releaseTimeout = setTimeout(() => {
      if (this.activeNodes.has(note)) {
        this.stopNote(note);
      }
    }, duration * 1000);
    
    // Store timeout id for cleanup
    source.onended = () => {
      clearTimeout(releaseTimeout);
      this.activeNodes.delete(note);
    };
  }

  // Stop a currently playing note
  stopNote(note: string): void {
    const activeNode = this.activeNodes.get(note);
    if (activeNode && this.audioContext) {
      const { gain, startTime } = activeNode;
      const now = this.audioContext.currentTime;
      const playedTime = now - startTime;
      
      // Apply a quick release to avoid clicks
      if (playedTime < 0.05) {
        // For very short notes, fade out a bit slower to avoid clicks
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      } else {
        // Normal release
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      }
      
      this.activeNodes.delete(note);
    }
  }

  // Stop all currently playing notes
  stopAllNotes(): void {
    this.activeNodes.forEach((_, note) => {
      this.stopNote(note);
    });
  }

  // Set master volume
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume;
    }
  }

  // Clean up resources
  dispose(): void {
    this.stopAllNotes();
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.initialized = false;
  }
}

// Create singleton instance
const audioEngine = new AudioEngine();
export default audioEngine;