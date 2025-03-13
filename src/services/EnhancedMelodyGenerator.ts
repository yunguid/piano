import { getSystemPrompt, getUserPrompt, PromptOptions } from './AdvancedPromptTemplates';
import { Melody, Note, Chord, MusicStyle, getFallbackMelody } from './MelodyGenerator';
import Logger from '../utils/Logger';
import OpenAIService from './OpenAIService';

// Create a domain-specific logger
const logger = new Logger('MelodyGenerator');

// Constants for API configuration
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 3000;

// Enhanced types for melody complexity
export type MelodyComplexity = 'simple' | 'medium' | 'complex';

// Mapping complexity to numeric values for API
const complexityMapping = {
  simple: 0.3,
  medium: 0.5,
  complex: 0.8
};

// Streaming callback type removed

export class EnhancedMelodyGenerator {
  constructor() {
    logger.info('Enhanced melody generator initialized');
  }
  
  // Updated method to generate melody
  async generateEnhancedMelody(
    style: MusicStyle,
    complexity: MelodyComplexity = "medium",
    customPrompt?: string,
    melodyLength: number = 8,
    includeChords: boolean = true
  ): Promise<Melody> {
    let retries = 0;
    
    while (retries <= MAX_RETRIES) {
      try {
        const complexityValue = complexityMapping[complexity];
        logger.music(`Generating enhanced ${style} melody (attempt ${retries + 1}/${MAX_RETRIES + 1})`, {
          style,
          complexity,
          melodyLength,
          includeChords
        });
        
        // Use custom prompt if provided, otherwise build an enhanced standard prompt with higher specificity
        const promptContent = customPrompt || getUserPrompt({
          style,
          complexity: complexityValue,
          mood: "happy", // User-selected mood can override this
          melodyLength,
          key: "C major", // Specify a clear key for consistency
          scale: "major",
          structure: "AABA", // Use a common classical form
          musicalElements: ["motifs", "sequences", "arpeggios"], // Explicit elements for richness
          emotion: "uplifting and cheerful", // Reinforce mood
          rhythm: "varied with syncopation and dotted rhythms", // Specific rhythmic instruction
          dynamics: "contrasting between piano (soft) and forte (loud)", // Specific dynamics
          chordProgression: "I-IV-V-I with secondary dominants", // Detailed progression
          avoid: ["abrupt octave jumps", "monotonous repetition"], // Clear constraints
          reference: `${style === "classical" ? "Mozart's Piano Sonata No. 11, emphasizing melodic clarity" : 
                     style === "jazz" ? "Miles Davis's Kind of Blue, with modal explorations" : 
                     style === "blues" ? "B.B. King's expressive phrasing and vibrato" : 
                     style === "pop" ? "The Beatles' memorable hooks and progressions" : 
                     style === "ambient" ? "Brian Eno's Music for Airports, with space and atmosphere" : 
                     "Mozart's Piano Sonata No. 11, emphasizing melodic clarity and harmonic interest"}` // Specific reference
        });
        
        // Prepare system prompt + user prompt
        const fullPrompt = `${getSystemPrompt()}\n\n${promptContent}`;
        
        // Debug log to see the full prompt (temporary)
        logger.debug('Generated User Prompt:', promptContent);
        
        logger.api('Sending request to OpenAI API with enhanced prompts');
        
        // Use OpenAIService instead of direct OpenAI API call
        let response;
        try {
          response = await OpenAIService.generateResponse(fullPrompt);
        } catch (apiError) {
          logger.error('Exception from OpenAIService.generateResponse', apiError);
          throw new Error('API call to OpenAI failed');
        }
        
        // Detailed validation of the response object
        if (!response) {
          logger.error('OpenAI service returned null or undefined response');
          throw new Error('Null response from OpenAI API');
        }
        
        logger.debug('OpenAI response structure', {
          hasSuccess: response.hasOwnProperty('success'),
          successValue: response.success,
          hasData: response.hasOwnProperty('data'),
          dataType: response.data ? typeof response.data : 'undefined',
          hasError: response.hasOwnProperty('error'),
          errorType: response.error ? typeof response.error : 'undefined'
        });
        
        // Check if the response was successful
        if (!response.success) {
          logger.error('OpenAI service returned an error', response.error);
          throw new Error(typeof response.error === 'string' ? response.error : 'Failed to generate melody from OpenAI');
        }
        
        // Validate response structure
        if (!response.data) {
          logger.error('OpenAI service returned a successful response but with no data');
          throw new Error('Invalid response from OpenAI: missing data property');
        }
        
        // Streaming has been removed, so we should never get a stream response
        
        // Handle non-stream response
        let structuredData;
        
        // More detailed logging of the data structure
        logger.debug('OpenAI response.data structure', {
          dataKeys: Object.keys(response.data),
          hasStructured: response.data.hasOwnProperty('structured'),
          structuredType: response.data.structured ? typeof response.data.structured : 'undefined',
          hasText: response.data.hasOwnProperty('text'),
          textType: response.data.text ? typeof response.data.text : 'undefined',
          responseId: response.data.responseId,
          model: response.data.model
        });
        
        // Check if response contains structured data from OpenAIService
        if (response.data.structured) {
          // The OpenAIService has structured data ready for us
          structuredData = response.data.structured;
          logger.debug('Using pre-parsed structured data from OpenAIService');
        } else if (response.data.text) {
          // Need to parse JSON from text
          const textValue = response.data.text;
          if (typeof textValue !== 'string') {
            logger.error('OpenAI service returned non-string text value', { 
              textType: typeof textValue,
              textValue
            });
            throw new Error('Invalid response format: text is not a string');
          }
          
          try {
            structuredData = JSON.parse(textValue);
          } catch (error) {
            logger.error('Failed to parse JSON response', {
              error,
              responseTextPreview: textValue.substring(0, 200) + '...'
            });
            
            // Try to clean and fix the JSON before giving up
            const cleanedJson = this.cleanJsonResponse(textValue);
            try {
              structuredData = JSON.parse(cleanedJson);
              logger.info('Successfully parsed cleaned JSON response');
            } catch (secondError) {
              logger.error('Failed to parse even after cleaning JSON', secondError);
              throw new Error('Failed to parse melody response JSON');
            }
          }
        } else {
          logger.error('Invalid response format from OpenAIService', {
            responseKeys: Object.keys(response),
            dataKeys: response.data ? Object.keys(response.data) : []
          });
          throw new Error('Invalid response format from OpenAIService');
        }
        
        if (!structuredData) {
          logger.error('No structured data found in response', response);
          throw new Error('No structured data found in OpenAI API response');
        }
        
        logger.api('Received enhanced melody response from OpenAI API');
        logger.debug('Response Structure', {
          melodyLength: structuredData.melody?.length || 0,
          chordsLength: structuredData.chords?.length || 0,
          tempo: structuredData.tempo,
          key: structuredData.key
        });
        
        try {
          // Process the structured data response directly
          const melody = this.processMelodyResponse(structuredData, style);
          
          logger.success(`Successfully generated enhanced ${style} melody`, {
            noteCount: melody.melody?.length || 0,
            chordCount: melody.chords?.length || 0,
            tempo: melody.tempo,
            key: melody.key,
            timeSignature: melody.timeSignature,
            composer: structuredData.composer_influence || 'Not specified'
          });
          
          // Log additional musical details if available
          if (structuredData.form || structuredData.composer_influence) {
            logger.debug('Enhanced melody details', {
              form: structuredData.form || 'Not specified',
              composer: structuredData.composer_influence || 'Not specified'
            });
          }
          
          return melody;
        } catch (processError) {
          logger.error('Error processing OpenAI enhanced melody response', processError);
          logger.debug('Structured data that failed processing', JSON.stringify(structuredData).substring(0, 500) + '...');
          
          // Fall back to default melody
          logger.info(`Using fallback melody for ${style} style due to processing error`);
          return getFallbackMelody(style);
        }
      } catch (error) {
        retries++;
        logger.error(`Error generating enhanced melody (attempt ${retries}/${MAX_RETRIES + 1})`, error);
        
        if (error instanceof Error) {
          logger.debug('Error details', {
            name: error.name,
            message: error.message,
            stack: error.stack
          });
        }
        
        // If we've reached max retries, use fallback
        if (retries > MAX_RETRIES) {
          logger.music(`Maximum retries reached, using fallback enhanced melody for ${style} style`);
          return getFallbackMelody(style);
        }
        
        // Otherwise wait before retrying
        logger.info(`Waiting ${RETRY_DELAY_MS/1000} seconds before retry ${retries}...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
    
    // This should never be reached but TypeScript requires a return
    logger.music(`Using fallback enhanced melody for ${style} style`);
    return getFallbackMelody(style);
  }
  
  // Process and validate the melody response from OpenAI
  private processMelodyResponse(response: any, style: MusicStyle): Melody {
    logger.debug('Processing melody response');
    
    // Check for various response formats and normalize
    if (!response || typeof response !== 'object') {
      logger.error('Invalid melody response format', response);
      return getFallbackMelody(style);
    }
    
    const result: Melody = {
      chords: [],
      tempo: 120,
      style: style,
      key: 'C major',
      timeSignature: '4/4'
    };
    
    // Process melody/notes array
    const melodyArray = response.melody || response.notes || response.melodic_elements || [];
    if (Array.isArray(melodyArray) && melodyArray.length > 0) {
      // Convert and validate notes
      const processedNotes = melodyArray.map((note: any, index: number) => {
        if (!note || typeof note !== 'object') {
          logger.warn(`Invalid note at index ${index}, converting to rest`);
          return { rest: true, duration: 1, velocity: 80, articulation: 'normal' } as Note;
        }
        
        // Convert pitch to note if needed
        if (note.pitch && !note.note) {
          note.note = note.pitch;
        }
        
        // Ensure required properties
        if (!note.note && !note.rest) {
          logger.warn(`Missing note/rest property at index ${index}`);
          return { rest: true, duration: 1, velocity: 80, articulation: 'normal' } as Note;
        }
        
        // Validate articulation
        const validArticulations = ['normal', 'staccato', 'legato', 'accent', 'tenuto', 'marcato'];
        const articulation = note.articulation && validArticulations.includes(note.articulation) 
          ? note.articulation 
          : 'normal';
        
        // Validate and set defaults for required properties
        return {
          note: note.note,
          rest: note.rest || false,
          duration: typeof note.duration === 'number' ? note.duration : 1,
          velocity: typeof note.velocity === 'number' ? note.velocity : 80,
          articulation: articulation
        } as Note;
      });
      
      result.melody = processedNotes;
    } else {
      logger.warn('No melody data found in response, using fallback melody');
      // Create a fallback melody based on the chords
      const fallbackNotes = [
        { note: 'C5', duration: 0.5, velocity: 0.7 },
        { note: 'E5', duration: 0.5, velocity: 0.7 },
        { note: 'G5', duration: 0.5, velocity: 0.7 },
        { note: 'E5', duration: 0.5, velocity: 0.7 },
        { note: 'G5', duration: 0.5, velocity: 0.7 },
        { note: 'B5', duration: 0.5, velocity: 0.7 },
        { note: 'A5', duration: 0.5, velocity: 0.7 },
        { note: 'F5', duration: 0.5, velocity: 0.7 }
      ];
      result.melody = fallbackNotes;
      logger.info('Created fallback melody with 8 notes');
    }
    
    // Process chords array
    const chordsArray = response.chords || response.chord_progression || response.harmony || [];
    if (Array.isArray(chordsArray) && chordsArray.length > 0) {
      // Convert and validate chords
      const processedChords = chordsArray.map((chord: any, index: number) => {
        if (!chord || typeof chord !== 'object') {
          logger.warn(`Invalid chord at index ${index}, using fallback chord`);
          return { notes: ['C4', 'E4', 'G4'], duration: 2, chord_symbol: 'C' };
        }
        
        // Handle different property names
        const notes = Array.isArray(chord.notes) ? chord.notes : 
                     (Array.isArray(chord.chord) ? chord.chord : ['C4', 'E4', 'G4']);
        
        return {
          notes: notes,
          duration: typeof chord.duration === 'number' ? chord.duration : 2,
          chord_symbol: chord.chord_symbol || '',
          voicing: chord.voicing || 'close'
        };
      });
      
      result.chords = processedChords;
    } else {
      logger.warn('No chord data found in response, using fallback chords');
      result.chords = [
        { notes: ['C4', 'E4', 'G4'], duration: 2 },
        { notes: ['G3', 'B3', 'D4'], duration: 2 },
        { notes: ['A3', 'C4', 'E4'], duration: 2 },
        { notes: ['F3', 'A3', 'C4'], duration: 2 }
      ];
    }
    
    // Process metadata
    if (typeof response.tempo === 'number' && response.tempo > 0) {
      result.tempo = response.tempo;
    }
    
    if (typeof response.key === 'string') {
      result.key = response.key;
    }
    
    if (typeof response.time_signature === 'string') {
      result.timeSignature = response.time_signature;
    } else if (typeof response.timeSignature === 'string') {
      result.timeSignature = response.timeSignature;
    }
    
    if (typeof response.style === 'string') {
      result.style = response.style;
    } else {
      result.style = style;
    }
    
    logger.debug('Processed melody response successfully', {
      melodyLength: result.melody?.length || 0,
      chordCount: result.chords.length,
      tempo: result.tempo
    });
    
    return result;
  }
  
  // Helper method to clean up JSON response before parsing
  private cleanJsonResponse(jsonString: string): string {
    if (!jsonString) {
      logger.warn('Received empty JSON string to clean');
      return '{}';
    }
    
    // Remove any leading or trailing non-JSON content
    let cleaned = jsonString.trim();
    
    // If it doesn't start with '{', try to find the first '{'
    if (!cleaned.startsWith('{')) {
      const startIndex = cleaned.indexOf('{');
      if (startIndex >= 0) {
        cleaned = cleaned.substring(startIndex);
      }
    }
    
    // If it doesn't end with '}', try to find the last '}'
    if (!cleaned.endsWith('}')) {
      const endIndex = cleaned.lastIndexOf('}');
      if (endIndex >= 0) {
        cleaned = cleaned.substring(0, endIndex + 1);
      }
    }
    
    return cleaned;
  }
  
  // Helper method to attempt fixing common JSON issues
  private attemptJsonFix(jsonString: string): string | null {
    try {
      // First try to extract any JSON-like structure
      const match = jsonString.match(/\{[\s\S]*\}/);
      if (!match) return null;
      
      let potentialJson = match[0];
      
      // Check for unterminated strings by finding unbalanced quotes
      let inString = false;
      let lastOpenQuoteIndex = -1;
      
      for (let i = 0; i < potentialJson.length; i++) {
        const char = potentialJson[i];
        
        // Skip escaped quotes
        if (char === '\\' && i + 1 < potentialJson.length) {
          i++;
          continue;
        }
        
        if (char === '"') {
          if (!inString) {
            lastOpenQuoteIndex = i;
            inString = true;
          } else {
            inString = false;
          }
        }
      }
      
      // If we ended inside a string, try to close it
      if (inString && lastOpenQuoteIndex >= 0) {
        const beforeQuote = potentialJson.substring(0, lastOpenQuoteIndex);
        const afterQuote = potentialJson.substring(lastOpenQuoteIndex);
        
        // Find the next comma, colon, or closing bracket to insert the closing quote
        const nextDelimiterMatch = afterQuote.match(/[,:\}\]]/);
        if (nextDelimiterMatch && nextDelimiterMatch.index) {
          const fixedJson = 
            beforeQuote + 
            afterQuote.substring(0, nextDelimiterMatch.index) + 
            '"' + 
            afterQuote.substring(nextDelimiterMatch.index);
          
          return fixedJson;
        }
      }
      
      // Handle truncated JSON by finding the last complete property
      const lastValidBrace = this.findLastValidBracePosition(potentialJson);
      if (lastValidBrace > 0) {
        return potentialJson.substring(0, lastValidBrace + 1);
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }
  
  // Helper to find the last position where the JSON would be valid if closed
  private findLastValidBracePosition(json: string): number {
    // Try progressively smaller portions of the JSON to find a valid part
    for (let i = json.length - 1; i >= 0; i--) {
      if (json[i] === '}') {
        try {
          const test = json.substring(0, i + 1);
          JSON.parse(test);
          return i;
        } catch (e) {
          // Continue searching
        }
      }
    }
    return -1;
  }

  // Streaming melody generation method removed
}

// Export a singleton instance
export default new EnhancedMelodyGenerator();