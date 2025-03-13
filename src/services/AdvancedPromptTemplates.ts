// Advanced prompt templates for music generation
// These templates are designed to elicit more creative, dynamic, and musically realistic responses

export interface PromptOptions {
  style: string;           // Musical style (e.g., classical, jazz)
  complexity: number;      // Complexity level (0 to 1)
  mood?: string;           // Emotional mood (e.g., happy)
  melodyLength?: number;   // Length in measures
  tempo?: number;          // Tempo in beats per minute
  timeSignature?: string;  // Time signature (e.g., "4/4", "3/4")
  includePickupMeasure?: boolean; // Whether to include a pickup measure
  key?: string;            // New: Musical key (e.g., "C major")
  scale?: string;          // New: Scale type (e.g., "major", "pentatonic")
  structure?: string;      // New: Form (e.g., "ABA", "AABA")
  musicalElements?: string[];  // New: Elements like "arpeggios", "motifs"
  emotion?: string;        // New: Detailed emotional description (e.g., "uplifting and cheerful")
  rhythm?: string;         // New: Rhythmic pattern (e.g., "syncopated")
  dynamics?: string;       // New: Dynamics (e.g., "crescendo")
  chordProgression?: string;   // New: Chord progression (e.g., "I-IV-V-I")
  avoid?: string[];        // New: Things to avoid (e.g., "abrupt octave jumps")
  reference?: string;      // New: Inspiration (e.g., "Beethoven's Ode to Joy")
}

// System prompt for more sophisticated melody generation
export function getSystemPrompt(): string {
  return `You are an AI music composer specializing in creating high-quality piano melodies. Your task is to generate melodies that are musically coherent, emotionally expressive, and stylistically authentic.

You have expertise in music theory, composition techniques, and the specific characteristics of various musical styles and composers. You understand concepts such as:
- Harmony, counterpoint, and voice leading
- Musical form and structure
- Melody development and motif transformation
- Genre-specific techniques and ornamentations
- Expressive elements like dynamics and articulation
- Historical performance practices

CRITICAL REQUIREMENTS:
1. Return ONLY a valid JSON object with no text outside of it.
2. Do not include markdown, code blocks, explanations, or any other text.
3. Each note in the melody array MUST have a "rest" property (true or false).
4. Format note names in scientific pitch notation (e.g., "C4", "F#3", "Bb5").
5. Use standard duration values (1.0=quarter note, 0.5=eighth, 0.25=sixteenth).
6. Ensure velocities range from 30 (soft) to 120 (loud).
7. Include articulations that vary between notes.
8. Make sure chord structures align with the specified style, key, and progression.

Required fields in your JSON response:
- melody: Array of note objects with:
  * note: String in scientific pitch notation (e.g., "C4", "F#3", "Bb5")
  * duration: Number (1.0=quarter note, 0.5=eighth, 0.25=sixteenth, 1.5=dotted quarter, etc.)
  * velocity: Number between 30-120 indicating intensity/volume
  * articulation: String ("staccato", "legato", "normal", "accent", "tenuto")
  * rest: Boolean (true if this is a rest, false if it's a played note) - REQUIRED FOR EVERY NOTE

- chords: Array of chord objects with:
  * notes: Array of notes forming the chord (e.g., ["C3", "E3", "G3"])
  * duration: Number representing chord duration
  * chord_symbol: String representation (e.g., "Cmaj7", "Dm9", "G7sus4")
  
- tempo: Number (beats per minute)
- style: String (matching requested style)
- key: String (e.g., "C major", "F# minor")
- time_signature: String (e.g., "4/4", "3/4", "6/8")
- form: String describing structure (e.g., "AABA", "verse-chorus", "through-composed")
- composer_influence: String describing composer influence

Focus on creating compelling, musically interesting melodies that capture the essence of the requested style, emotion, and composer influence.`;
}

// Example JSON format for reference (not part of the getSystemPrompt function)
const exampleJson = {
  "melody": [
    {"note": "E4", "duration": 1, "velocity": 85, "articulation": "legato", "rest": false},
    {"note": "G4", "duration": 0.5, "velocity": 75, "articulation": "staccato", "rest": false},
    {"note": "A4", "duration": 0.5, "velocity": 80, "articulation": "accent", "rest": false},
    {"note": "B4", "duration": 2, "velocity": 90, "articulation": "legato", "rest": false},
    {"note": "", "duration": 0.5, "velocity": 0, "articulation": "normal", "rest": true},
    {"note": "C5", "duration": 1.5, "velocity": 95, "articulation": "tenuto", "rest": false}
  ],
  "chords": [
    {"notes": ["C3", "E3", "G3", "B3"], "duration": 2, "chord_symbol": "Cmaj7"},
    {"notes": ["D3", "F3", "A3", "C4"], "duration": 2, "chord_symbol": "Dm7"},
    {"notes": ["G2", "B2", "D3", "F3"], "duration": 2, "chord_symbol": "G7"}
  ],
  "tempo": 110,
  "style": "jazz",
  "key": "C major",
  "time_signature": "4/4",
  "form": "AABA",
  "composer_influence": "Bill Evans"
};

// User prompt for melody generation
export function getUserPrompt(options: PromptOptions): string {
  // Destructure options with default values
  const {
    style,
    complexity,
    mood = getRandomMood(style),
    melodyLength = 8,
    tempo = getAppropriateTempo(style),
    timeSignature = "4/4",
    key = getMoodAppropriateKeys(mood).split(', ')[0], // Take first recommended key
    scale = key.includes('minor') ? 'minor' : 'major',
    structure = getStyleForms(style).split(', ')[0], // Take first recommended form
    musicalElements = ['motifs'],
    emotion = mood, // Use mood as default emotion if not specified
    rhythm = getStyleRhythmicPatterns(style).split(', ')[0], // Take first recommended rhythm
    dynamics = getDynamicVariationForMood(mood).split(', ')[0], // Take first recommended dynamic
    chordProgression = getStyleChordProgressions(style).split(', ')[0], // Take first recommended progression
    avoid = ['abrupt octave jumps'],
    reference = getStyleComposers(style).split(', ')[0] // Take first recommended composer
  } = options;

  // Prepare commonly used variables
  const complexityDesc = complexity < 0.3 ? 'simple' : complexity > 0.7 ? 'complex' : 'moderate';
  const composers = getStyleComposers(style);
  const styleCharacteristics = getStyleCharacteristics(style);
  
  // Start building the prompt with a clear instruction
  let prompt = `Generate a high-quality ${melodyLength}-bar ${style} melody with ${complexityDesc} complexity in a ${mood} mood.

Musical Specifications:
- Style: ${style}
- Complexity: ${complexityDesc} (${Math.round(complexity * 100)}% of maximum complexity)
- Mood: ${mood} with emphasis on a ${emotion} feeling
- Length: ${melodyLength} measures
- Key: ${key}
- Scale: ${scale}
- Structure: ${structure} form
- Tempo: ${tempo} BPM
- Time Signature: ${timeSignature}
- Include these musical elements: ${musicalElements.join(', ')}
- Rhythm: use ${rhythm} rhythmic patterns
- Dynamics: apply ${dynamics} dynamic variations
- Chord progression: follow ${chordProgression} progression
- Avoid: ${avoid.join(', ')}
- Inspiration: take inspiration from ${reference}

Style guidance:
- Compose in the style of composers like: ${composers}
- Use these style characteristics: ${styleCharacteristics}
- Consider chord progressions like: ${getStyleChordProgressions(style)}
- Include rhythmic patterns like: ${getStyleRhythmicPatterns(style)}
- Structure using form: ${getStyleForms(style)}
- Use dynamic variation: ${getDynamicVariationForMood(mood)}

Make it musically interesting and expressive with:
- Well-defined motifs that develop throughout the piece
- A clear musical arc with beginning, climax, and resolution
- Varied articulations (staccato, legato, accents) for expressiveness
- Dynamic contrasts from soft (velocity 30-60) to loud (velocity 80-120)
- Authentic ${style} ornamentation and techniques
- Strategic use of rests for phrasing and musical breathing
- Rhythmic variety that maintains coherence
- Voice leading that creates smooth melodic contours
- Harmonic tension and resolution that follows ${style} traditions

Return a complete, VALID JSON object with EXACTLY this structure:
{
  "melody": [
    {"note": "C4", "duration": 1, "velocity": 90, "articulation": "legato", "rest": false},
    {"note": "", "duration": 0.5, "velocity": 0, "articulation": "normal", "rest": true},
    {"note": "D4", "duration": 0.25, "velocity": 75, "articulation": "staccato", "rest": false}
  ],
  "chords": [
    {"notes": ["C3", "E3", "G3", "B3"], "duration": 2, "chord_symbol": "Cmaj7"}
  ],
  "tempo": ${tempo},
  "time_signature": "${timeSignature}",
  "key": "${key}",
  "style": "${style}",
  "form": "${structure}",
  "composer_influence": "${reference.split(' ')[0]}" // Just the composer's name
}

CRITICAL REQUIREMENTS:
- Include EXACTLY ${melodyLength} bars of music
- Use standard note durations (1.0=quarter, 0.5=eighth, 0.25=sixteenth, 1.5=dotted quarter)
- EVERY melody item MUST have a "rest" property (rest: false for notes, rest: true for rests)
- For rests, use note="", velocity=0, articulation="normal", rest=true
- Create dynamic melodies with velocity values from 30-120
- Ensure chords complement the melody and follow ${style} harmonic conventions
- Return ONLY JSON with no explanations, no markdown, no code blocks, and no extra text`;

  return prompt;
}

// Helper functions to generate musically appropriate values

function getRandomMood(style: string): string {
  const moodsByStyle: Record<string, string[]> = {
    jazz: ['contemplative', 'sophisticated', 'energetic', 'melancholic', 'playful'],
    classical: ['majestic', 'serene', 'dramatic', 'pastoral', 'triumphant'],
    blues: ['soulful', 'mournful', 'resilient', 'raw', 'introspective'],
    pop: ['upbeat', 'catchy', 'nostalgic', 'optimistic', 'dreamy'],
    ambient: ['ethereal', 'peaceful', 'mysterious', 'expansive', 'meditative'],
    cinematic: ['epic', 'suspenseful', 'poignant', 'heroic', 'mysterious'],
    electronic: ['energetic', 'hypnotic', 'futuristic', 'driving', 'atmospheric'],
    folk: ['rustic', 'intimate', 'authentic', 'wistful', 'storytelling']
  };
  
  const defaultMoods = ['emotive', 'expressive', 'dynamic', 'engaging', 'captivating'];
  const moods = moodsByStyle[style] || defaultMoods;
  return moods[Math.floor(Math.random() * moods.length)];
}

function getAppropriateTempo(style: string): number {
  const tempoRanges: Record<string, [number, number]> = {
    jazz: [100, 220],
    classical: [60, 140],
    blues: [60, 120],
    pop: [90, 130],
    ambient: [60, 90],
    cinematic: [60, 110],
    electronic: [110, 150],
    folk: [80, 120]
  };
  
  const range = tempoRanges[style] || [80, 120];
  return Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
}

function getDynamicKey(style: string, mood: string): string {
  const keys = ['C major', 'G major', 'D major', 'A major', 'E major', 'B major',
                'F major', 'Bb major', 'Eb major', 'Ab major', 'Db major', 'Gb major',
                'A minor', 'E minor', 'B minor', 'F# minor', 'C# minor', 'G# minor',
                'D minor', 'G minor', 'C minor', 'F minor', 'Bb minor', 'Eb minor'];
  
  // Implement more sophisticated key selection based on style and mood
  if (mood === 'melancholic' || mood === 'mournful' || mood === 'dramatic') {
    const minorKeys = keys.filter(k => k.includes('minor'));
    return minorKeys[Math.floor(Math.random() * minorKeys.length)];
  } else if (mood === 'triumphant' || mood === 'heroic' || mood === 'majestic') {
    return ['D major', 'G major', 'C major', 'A major', 'E major'][Math.floor(Math.random() * 5)];
  }
  
  return keys[Math.floor(Math.random() * keys.length)];
}

function getAppropriateMelodyInstrument(style: string): string {
  const instrumentsByStyle: Record<string, string[]> = {
    jazz: ['piano', 'saxophone', 'trumpet', 'clarinet'],
    classical: ['piano', 'violin', 'flute', 'cello'],
    blues: ['guitar', 'harmonica', 'piano', 'saxophone'],
    pop: ['piano', 'electric_guitar', 'synth_lead', 'vocal_melody'],
    ambient: ['synth_pad', 'piano', 'electric_piano', 'guitar_with_delay'],
    cinematic: ['piano', 'string_ensemble', 'french_horn', 'oboe'],
    electronic: ['synth_lead', 'pluck', 'fm_electric_piano', 'digital_bell'],
    folk: ['acoustic_guitar', 'violin', 'mandolin', 'flute']
  };
  
  const instruments = instrumentsByStyle[style] || ['piano', 'guitar', 'synth'];
  return instruments[Math.floor(Math.random() * instruments.length)];
}

function getAppropriateChordInstrument(style: string): string {
  const instrumentsByStyle: Record<string, string[]> = {
    jazz: ['piano', 'guitar', 'vibraphone'],
    classical: ['string_quartet', 'piano', 'harp'],
    blues: ['piano', 'guitar', 'organ'],
    pop: ['piano', 'acoustic_guitar', 'electric_guitar', 'synth_pad'],
    ambient: ['synth_pad', 'electric_piano', 'guitar_with_reverb'],
    cinematic: ['string_orchestra', 'piano', 'harp', 'brass_ensemble'],
    electronic: ['synth_pad', 'synth_pluck', 'fm_electric_piano'],
    folk: ['acoustic_guitar', 'piano', 'accordion', 'banjo']
  };
  
  const instruments = instrumentsByStyle[style] || ['piano', 'guitar', 'synth_pad'];
  return instruments[Math.floor(Math.random() * instruments.length)];
}

function getAppropriateDefaultDynamic(mood: string): string {
  const dynamicsByMood: Record<string, string[]> = {
    contemplative: ['mp', 'p'],
    sophisticated: ['mf', 'mp'],
    energetic: ['f', 'ff'],
    melancholic: ['p', 'mp'],
    playful: ['mf', 'f'],
    majestic: ['f', 'ff'],
    serene: ['pp', 'p'],
    dramatic: ['f', 'ff', 'mf'],
    pastoral: ['mp', 'p'],
    triumphant: ['ff', 'f'],
    soulful: ['mf', 'mp'],
    mournful: ['p', 'pp'],
    resilient: ['mf', 'f'],
    upbeat: ['f', 'mf'],
    catchy: ['mf', 'f'],
    dreamy: ['p', 'pp'],
    ethereal: ['pp', 'p'],
    mysterious: ['p', 'mp'],
    epic: ['ff', 'f']
  };
  
  const defaults = ['mf', 'mp', 'f', 'p'];
  const dynamics = dynamicsByMood[mood] || defaults;
  return dynamics[Math.floor(Math.random() * dynamics.length)];
}

function getRandomDynamicChange(): string {
  return ['crescendo', 'diminuendo', 'subito'][Math.floor(Math.random() * 3)];
}

function getRandomTargetDynamic(): string {
  return ['pp', 'p', 'mp', 'mf', 'f', 'ff'][Math.floor(Math.random() * 6)];
}

function getPhraseAdvice(style: string, mood: string): string {
  const adviceByStyle: Record<string, string[]> = {
    jazz: [
      'Use subtle swing feel with slight delay on upbeats',
      'Allow phrasing to breathe with natural jazz articulation',
      'Shape phrases with subtle dynamic contours'
    ],
    classical: [
      'Create balanced phrases with clear antecedent-consequent relationship',
      'Use rubato appropriately at phrase endings',
      'Employ graceful dynamic arcs within phrases'
    ],
    blues: [
      'Emphasize blue notes and allow for expressive bending',
      'Let phrases breathe with strategic pauses',
      'Allow for call-and-response feeling between phrases'
    ],
    // Additional styles omitted for brevity
  };
  
  const defaultAdvice = ['Shape phrases with natural dynamic contours', 'Allow breathing space between phrases'];
  const advice = adviceByStyle[style] || defaultAdvice;
  return advice[Math.floor(Math.random() * advice.length)];
}

function getStyleElements(style: string): string {
  const elementsByStyle: Record<string, string[]> = {
    jazz: [
      'Use subtle swing eighth notes',
      'Add chromatic approach tones to target notes',
      'Employ bebop-style enclosures around chord tones'
    ],
    classical: [
      'Use careful voice leading between harmony changes',
      'Balance rhythmic motifs with melodic development',
      'Employ appropriate ornaments like mordents or turns'
    ],
    blues: [
      'Emphasize blue notes (b3, b5, b7)',
      'Use slight anticipation of the beat',
      'Apply subtle pitch bends and microtonal embellishments'
    ],
    // Additional styles omitted for brevity
  };
  
  const defaultElements = ['Use appropriate stylistic articulations', 'Balance repetition with variation'];
  const elements = elementsByStyle[style] || defaultElements;
  return elements[Math.floor(Math.random() * elements.length)];
}

function getAppropriateForm(style: string): string {
  const formsByStyle: Record<string, string[]> = {
    jazz: ['AABA', 'AB', 'ABAC', '12-bar'],
    classical: ['ABA', 'ABACA', 'Theme and Variation', 'Sonata'],
    blues: ['12-bar', '16-bar', '8-bar'],
    pop: ['Verse-Chorus', 'AABA', 'ABAB', 'ABCAB'],
    ambient: ['Through-composed', 'ABCD', 'Evolving'],
    cinematic: ['AB', 'ABAC', 'Through-composed'],
    electronic: ['ABAB', 'ABABCB', 'AABBCC'],
    folk: ['AABB', 'AABA', 'Verse-Chorus']
  };
  
  const defaultForms = ['AB', 'AABA', 'ABAC'];
  const forms = formsByStyle[style] || defaultForms;
  return forms[Math.floor(Math.random() * forms.length)];
}

function getAppropriateNumberOfMeasures(style: string): number {
  const measuresByForm: Record<string, number> = {
    jazz: 32,
    classical: 16,
    blues: 12,
    pop: 16,
    ambient: 16,
    cinematic: 16,
    electronic: 16,
    folk: 16
  };
  
  return measuresByForm[style] || 16;
}

// New helper functions for enhanced prompt templates

function getStyleComposers(style: string): string {
  const composersByStyle: Record<string, string[]> = {
    classical: [
      "Mozart (elegant, balanced phrases)", 
      "Beethoven (dramatic, bold themes)", 
      "Chopin (lyrical, ornate melodies)", 
      "Debussy (impressionistic, non-traditional harmonies)",
      "Bach (contrapuntal, mathematically precise)"
    ],
    jazz: [
      "Miles Davis (cool, modal explorations)", 
      "John Coltrane (complex, spiritually driven)",
      "Thelonious Monk (angular, quirky phrasing)", 
      "Bill Evans (lush, impressionistic harmonies)",
      "Duke Ellington (orchestral, blues-infused)"
    ],
    blues: [
      "B.B. King (expressive, vocal-like phrasing)", 
      "Robert Johnson (raw, emotionally direct)",
      "Muddy Waters (powerful, assertive lines)", 
      "Stevie Ray Vaughan (virtuosic, intensity)"
    ],
    pop: [
      "The Beatles (innovative, memorable hooks)", 
      "Elton John (piano-based, theatrical)",
      "Adele (soulful, dramatic arcs)", 
      "Max Martin (modern, mathematically precise hooks)"
    ],
    ambient: [
      "Brian Eno (atmospheric, slowly evolving)", 
      "Harold Budd (delicate, spacious piano)",
      "Boards of Canada (nostalgic, slightly dissonant)", 
      "Aphex Twin (complex, layered textures)"
    ],
    cinematic: [
      "John Williams (thematic, orchestral grandeur)", 
      "Hans Zimmer (textural, rhythmically driven)",
      "Ennio Morricone (distinctive, emotionally resonant)", 
      "Thomas Newman (minimalist, evocative)"
    ],
    electronic: [
      "Daft Punk (repetitive, filter-evolving)", 
      "Deadmau5 (progressive, gradually building)",
      "Burial (atmospheric, textural)", 
      "Four Tet (organic, sample-based)"
    ],
    folk: [
      "Bob Dylan (storytelling, speech-like rhythm)", 
      "Joni Mitchell (unique tunings, jazz-influenced)",
      "Nick Drake (intricate, delicate fingerpicking)", 
      "Woody Guthrie (direct, protest-oriented)"
    ]
  };
  
  const defaultComposers = ["Bach", "Mozart", "Beethoven"];
  const composers = composersByStyle[style] || defaultComposers;
  return composers.slice(0, 3).join(", ");
}

function getStyleCharacteristics(style: string): string {
  const characteristicsByStyle: Record<string, string[]> = {
    classical: [
      "clear tonal center", 
      "balanced phrase structure", 
      "developed motifs",
      "controlled counterpoint", 
      "traditional cadences",
      "clear sectional development"
    ],
    jazz: [
      "extended harmonies (7ths, 9ths, 13ths)", 
      "swing feel", 
      "syncopation",
      "altered dominants", 
      "modal interchange",
      "ii-V-I progressions"
    ],
    blues: [
      "blue notes (b3, b5, b7)", 
      "12-bar form", 
      "call and response patterns",
      "emotional expressivity", 
      "bent notes",
      "dominant 7th harmonies"
    ],
    pop: [
      "repeated hooks", 
      "verse-chorus structure", 
      "lyrics-oriented phrasing",
      "contemporary harmonies", 
      "four-bar phrases",
      "predictable chord progressions"
    ],
    ambient: [
      "slow harmonic rhythm", 
      "focus on texture", 
      "minimal melodic movement",
      "atmospheric quality", 
      "use of space and silence",
      "blurred rhythmic pulse"
    ],
    cinematic: [
      "strong thematic motifs", 
      "emotionally evocative", 
      "orchestral textures",
      "narrative development", 
      "dynamic contrasts",
      "scene-setting mood"
    ],
    electronic: [
      "synthesized timbres", 
      "repetitive elements", 
      "layered textures",
      "gradual evolution", 
      "grid-based rhythms",
      "filter sweeps and modulation"
    ],
    folk: [
      "storytelling quality", 
      "acoustic timbres", 
      "modal influences",
      "drone elements", 
      "traditional ornamentation",
      "strophic form"
    ]
  };
  
  const defaultCharacteristics = ["structured harmony", "melodic contour", "rhythmic variety"];
  const characteristics = characteristicsByStyle[style] || defaultCharacteristics;
  return characteristics.slice(0, 4).join(", ");
}

function getStyleChordProgressions(style: string): string {
  const progressionsByStyle: Record<string, string[]> = {
    classical: [
      "I-IV-V-I", 
      "I-vi-IV-V", 
      "I-IV-viidim-I",
      "i-iv-V-i (minor)",
      "I-vi-ii-V-I"
    ],
    jazz: [
      "ii-V-I", 
      "ii7-V7-Imaj7", 
      "iiø7-V7-i (minor)",
      "I-vi-ii-V (turnaround)",
      "I-IV-iii-bIII-bVI-bII-I (Coltrane changes)"
    ],
    blues: [
      "I7-IV7-I7-V7-IV7-I7 (12-bar blues)", 
      "i7-iv7-i7-V7-iv7-i7 (minor blues)",
      "I7-IV7-V7 (quick change)",
      "I9-IV9-V9 (jazzy blues)"
    ],
    pop: [
      "I-V-vi-IV", 
      "vi-IV-I-V", 
      "I-IV-vi-V",
      "I-V-vi-iii-IV",
      "i-VI-III-VII (minor)"
    ],
    ambient: [
      "Static harmony (single chord)", 
      "Slow-moving bass notes under static upper harmony",
      "Modal interchange",
      "I-iii-IV-iv",
      "vi-V-IV-I (descending)"
    ],
    cinematic: [
      "i-VI-III-VII (minor epic)", 
      "I-V-vi-IV (emotional journey)",
      "ii-V-I-VI (adventure)",
      "i-VII-VI-V (tension)",
      "I-iii-IV-iv (nostalgic)"
    ],
    electronic: [
      "I-vi-IV-V", 
      "i-VII-VI-v", 
      "i-i-III-VII",
      "I-I-vi-IV (build up)",
      "I-V-vi-IV-I-V-IV-IV (extended)"
    ],
    folk: [
      "I-IV-I-V", 
      "i-VII-i-v", 
      "I-V-I-IV",
      "i-III-VII-iv",
      "I-vi-IV-V-I"
    ]
  };
  
  const defaultProgressions = ["I-IV-V-I", "ii-V-I", "vi-IV-I-V"];
  const progressions = progressionsByStyle[style] || defaultProgressions;
  return progressions.slice(0, 3).join(", ");
}

function getStyleRhythmicPatterns(style: string): string {
  const patternsByStyle: Record<string, string[]> = {
    classical: [
      "alberti bass (broken chords)", 
      "dotted rhythms", 
      "triplet figurations",
      "waltz patterns (3/4)",
      "melodic sequences"
    ],
    jazz: [
      "swing eighth notes", 
      "syncopated accents", 
      "walking basslines",
      "triplet figures against duple meter",
      "anticipation of beat one"
    ],
    blues: [
      "shuffle rhythm", 
      "triplet-based phrases", 
      "call and response patterns",
      "anticipations and suspensions",
      "stop-time breaks"
    ],
    pop: [
      "driving eighth notes", 
      "four-on-the-floor beats", 
      "syncopated backbeats",
      "anticipation of chorus sections",
      "hook-based repetition"
    ],
    ambient: [
      "floating, non-metric patterns", 
      "slow, evolving textures", 
      "arpeggiated figures",
      "long sustained notes",
      "blurred attacks and releases"
    ],
    cinematic: [
      "ostinato patterns", 
      "tension-building accelerations", 
      "heroic dotted rhythms",
      "sweeping arpeggios",
      "dramatic pauses"
    ],
    electronic: [
      "grid-based 16th notes", 
      "four-on-the-floor with syncopated accents", 
      "arpeggiator patterns",
      "polyrhythmic layers",
      "glitch and micro-timing effects"
    ],
    folk: [
      "fingerpicking patterns", 
      "strumming patterns (3+3+2)", 
      "narrative-based free rhythm",
      "dance rhythms (jig, reel)",
      "droned open strings"
    ]
  };
  
  const defaultPatterns = ["balanced phrases", "consistent meter", "moderate tempo"];
  const patterns = patternsByStyle[style] || defaultPatterns;
  return patterns.slice(0, 3).join(", ");
}

function getMoodAppropriateKeys(mood: string): string {
  // Map moods to appropriate key signatures
  const keysByMood: Record<string, string[]> = {
    // Happy/Uplifting moods
    happy: ["C major", "G major", "D major", "A major", "E major"],
    upbeat: ["G major", "D major", "A major", "C major"],
    energetic: ["E major", "A major", "D major", "B major"],
    triumphant: ["D major", "G major", "C major", "E major"],
    playful: ["F major", "G major", "C major", "D major"],
    
    // Sad/Melancholy moods
    sad: ["A minor", "D minor", "G minor", "C minor", "E minor"],
    melancholic: ["C minor", "G minor", "B minor", "E minor"],
    nostalgic: ["F minor", "Bb minor", "Eb major", "D minor"],
    mournful: ["C minor", "G minor", "D minor", "B minor"],
    
    // Reflective moods
    contemplative: ["E minor", "B minor", "D minor", "A minor", "F# minor"],
    introspective: ["Db major", "Ab major", "F minor", "Bb minor"],
    serene: ["F major", "Bb major", "G major", "E major"],
    peaceful: ["G major", "Eb major", "F major", "A major"],
    
    // Intense moods
    dramatic: ["C minor", "G minor", "D minor", "Bb minor"],
    intense: ["E minor", "A minor", "D minor", "G minor"],
    epic: ["C minor", "D minor", "Bb minor", "E minor"],
    passionate: ["D minor", "G minor", "C minor", "F minor"],
    
    // Other moods
    mysterious: ["B minor", "F# minor", "C# minor", "Eb minor"],
    ethereal: ["Db major", "Gb major", "B major", "E major"],
    dreamy: ["Eb major", "Ab major", "B major", "F# major"]
  };
  
  const defaultKeys = ["C major", "A minor", "G major", "E minor", "F major", "D minor"];
  const keys = keysByMood[mood] || defaultKeys;
  return keys.slice(0, 3).join(", ");
}

function getStyleForms(style: string): string {
  const formsByStyle: Record<string, string[]> = {
    classical: [
      "ABA (ternary form)", 
      "AABA", 
      "Sonata form (exposition-development-recapitulation)",
      "Theme and variations",
      "Rondo (ABACA)"
    ],
    jazz: [
      "32-bar AABA", 
      "12-bar blues", 
      "16-bar tune",
      "Modal exploration",
      "Verse-chorus with solos"
    ],
    blues: [
      "12-bar blues", 
      "8-bar blues", 
      "16-bar blues",
      "AAB (statement-statement-resolution)",
      "Shuffle blues"
    ],
    pop: [
      "Verse-Chorus", 
      "Verse-Chorus-Bridge", 
      "AABA",
      "Verse-Pre-Chorus-Chorus",
      "Intro-Verse-Chorus-Verse-Chorus-Bridge-Chorus-Outro"
    ],
    ambient: [
      "Through-composed", 
      "Evolving texture", 
      "Cyclic motifs",
      "Arc form (build-up and release)",
      "Non-linear/static"
    ],
    cinematic: [
      "Theme and variations", 
      "Narrative arc", 
      "Theme-development-climax",
      "Cyclical motifs",
      "Scene-based sections"
    ],
    electronic: [
      "Intro-Build-Drop-Breakdown-Build-Drop-Outro", 
      "ABAB", 
      "ABABCB",
      "Progressive build",
      "Loop-based evolution"
    ],
    folk: [
      "Strophic (verse-based)", 
      "Ballad form", 
      "Verse-Chorus",
      "AABB",
      "Call-and-response"
    ]
  };
  
  const defaultForms = ["ABA", "AABA", "AB", "ABAC"];
  const forms = formsByStyle[style] || defaultForms;
  return forms.slice(0, 2).join(", ");
}

function getDynamicVariationForMood(mood: string): string {
  const dynamicsByMood: Record<string, string[]> = {
    // Expressive moods
    happy: ["building from mf to f", "bright accents on key notes", "lilting dynamics"],
    sad: ["gentle diminuendos", "subdued with occasional swells", "p to pp with expressive accents"],
    dramatic: ["sudden contrasts between p and f", "building crescendos to climactic moments", "sforzando accents"],
    peaceful: ["consistently gentle (p to mp)", "smooth, flowing dynamic shape", "subtle ebbs and flows"],
    
    // Energetic moods
    energetic: ["driving f with accented notes", "building intensity", "marcato articulation"],
    playful: ["staccato accents", "unexpected dynamic shifts", "mf with whimsical inflections"],
    intense: ["powerful f to ff", "building tension through crescendos", "strong accents"],
    
    // Nuanced moods
    melancholic: ["expressive mp with subtle swells", "gentle emphasis on dissonances", "tender resolutions"],
    ethereal: ["delicate pp to p", "floating quality", "gentle note-to-note dynamics"],
    mysterious: ["subtle shifts between p and mp", "unexpected accents", "strategic use of silence"],
    
    // Other moods
    nostalgic: ["warm mp with gentle swells", "lingering on expressive notes", "tender rubato"],
    triumphant: ["bold f to ff", "emphatic accents", "ceremonial grandeur"],
    contemplative: ["patient mp with thoughtful inflections", "space between phrases", "subtle emphasis"]
  };
  
  const defaultDynamics = ["varied dynamics from p to f", "natural phrase shaping", "expressive articulation"];
  const dynamics = dynamicsByMood[mood] || defaultDynamics;
  return dynamics.slice(0, 2).join(", ");
}