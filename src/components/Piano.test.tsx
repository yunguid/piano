import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Piano from './Piano';

// Mock Tone.js
vi.mock('tone', () => {
  return {
    PolySynth: vi.fn().mockImplementation(() => ({
      toDestination: vi.fn().mockReturnThis(),
      triggerAttack: vi.fn(),
      triggerRelease: vi.fn(),
      dispose: vi.fn(),
    })),
    Synth: vi.fn(),
    start: vi.fn(),
    context: {
      state: 'running',
    },
  };
});

describe('Piano Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the piano keyboard', () => {
    render(<Piano />);
    
    // Check if piano container exists
    const pianoContainer = screen.getByTestId('piano-container');
    expect(pianoContainer).toBeInTheDocument();
    
    // Check if white keys are rendered
    const whiteKeys = screen.getAllByTestId('white-key');
    expect(whiteKeys.length).toBeGreaterThan(0);
    
    // Check if black keys are rendered
    const blackKeys = screen.getAllByTestId('black-key');
    expect(blackKeys.length).toBeGreaterThan(0);
  });

  it('responds to mouse interactions', () => {
    render(<Piano />);
    
    const firstWhiteKey = screen.getAllByTestId('white-key')[0];
    
    // Test mouse down
    fireEvent.mouseDown(firstWhiteKey);
    expect(firstWhiteKey).toHaveClass('active');
    
    // Test mouse up
    fireEvent.mouseUp(firstWhiteKey);
    expect(firstWhiteKey).not.toHaveClass('active');
  });

  it('responds to keyboard interactions', () => {
    render(<Piano />);
    
    // Simulate pressing 'a' key (C note)
    fireEvent.keyDown(document, { key: 'a' });
    const cKey = screen.getByText('C').closest('.piano-key');
    expect(cKey).toHaveClass('active');
    
    // Simulate releasing 'a' key
    fireEvent.keyUp(document, { key: 'a' });
    expect(cKey).not.toHaveClass('active');
  });
}); 