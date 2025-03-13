# Reactive Piano with AI Melody Generation

An interactive piano application with AI-powered melody generation, offering a seamless experience for exploring and creating music.

## Features

- Interactive piano that can be played with mouse or keyboard
- AI-powered melody generation with various styles and complexity levels
- Real-time visualization of melody and chord progressions
- Comprehensive logging system for debugging and performance tracking

## Getting Started

### Prerequisites

- Node.js 16 or higher
- An OpenAI API key for melody generation

### Installation

```bash
npm install
```

### Environment Setup

Create a `.env` file in the root directory with your OpenAI API key:

```
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_ENABLE_REMOTE_LOGGING=false
```

### Development

Standard development:

```bash
npm run dev
```

Development with enhanced terminal logging:

```bash
npm run dev:logs
```

### Building for Production

```bash
npm run build
```

## Architecture

The application is built with a clean, modular architecture:

- **Services Layer**: Handles API interactions and melody generation
  - `OpenAIService`: Manages communication with OpenAI API using the latest responses API
  - `MelodyGenerator`: Defines music data structures and provides fallback melodies
  - `EnhancedMelodyGenerator`: Handles detailed melody generation with style and complexity options

- **Components**: React components for UI and music playback
  - `EnhancedPiano`: Main piano component with visualization and playback
  - `EnhancedMelodyControls`: UI for generating melodies with different styles

- **Utils**: Supporting utilities
  - `Logger`: Enhanced logging system with performance tracking
  - `LoggerClient`: Client for remote logging (optional)

## Usage

1. Launch the application
2. Choose between Keyboard mode (play piano directly) or Melody mode (generate AI melodies)
3. In Melody mode, select a music style and complexity
4. Click "Generate Melody" to create a new melody
5. Use playback controls to play, pause, and record your melody

## Logging System

The application includes a comprehensive logging system that provides detailed insights into the application's behavior.

### Log Levels

- **DEBUG** - Detailed debugging information (only in development)
- **INFO** - General information about application state
- **WARN** - Warning messages 
- **ERROR** - Error messages
- **SUCCESS** - Success messages
- **MUSIC** - Music generation events
- **PIANO** - Piano interaction events
- **API** - API interaction events
- **PERF** - Performance timing events

## License

MIT

## Acknowledgments

- Tone.js for the audio synthesis capabilities
- React and TypeScript for the frontend framework
- OpenAI for the melody generation capabilities