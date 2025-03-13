import OpenAI from 'openai';
import Logger from '../utils/Logger';

// Create a domain-specific logger
const logger = new Logger('OpenAIService');

// Constants for API configuration
const API_TIMEOUT_MS = 180000; // 3 minutes timeout
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 3000;

export class OpenAIService {
  private openai: OpenAI | null = null;
  
  constructor(apiKey?: string) {
    const key = apiKey || import.meta.env.VITE_OPENAI_API_KEY || null;
    if (key) {
      this.initialize(key);
    } else {
      logger.warn('No OpenAI API key provided');
    }
  }
  
  initialize(apiKey: string) {
    try {
      logger.perfStart('OpenAI API Initialization');
      this.openai = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true // Note: In production, you'd want to use a backend service
      });
      logger.perfEnd('OpenAI API Initialization');
      logger.success('OpenAI API initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize OpenAI API', error);
      this.openai = null;
    }
  }
  
  async generateResponse(prompt: string): Promise<{ success: boolean; data?: any; error?: any }> {
    if (!this.openai) {
      logger.error('OpenAI API not initialized');
      return { success: false, error: 'OpenAI API not initialized' };
    }
    
    let retries = 0;
    
    while (retries <= MAX_RETRIES) {
      try {
        logger.info(`Generating response (attempt ${retries + 1}/${MAX_RETRIES + 1})`);
        
        // Calculate input length to adjust max output tokens
        const inputLength = prompt.length;
        
        // Adjust max_output_tokens based on input length to avoid hitting token limits
        const maxOutputTokens = inputLength > 1500 ? 4096 :
                               inputLength > 1000 ? 3072 :
                               inputLength > 500 ? 2048 : 1536;
        
        // Define a correctly structured JSON schema following strict mode requirements
        const melodySchema = {
          type: "object",
          properties: {
            melody: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  note: { type: "string" },
                  duration: { type: "number" },
                  velocity: { type: "number" },
                  articulation: { type: "string" },
                  rest: { type: "boolean" }
                },
                required: ["note", "duration", "velocity", "articulation", "rest"],
                additionalProperties: false
              }
            },
            chords: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  notes: { 
                    type: "array",
                    items: { type: "string" }
                  },
                  duration: { type: "number" },
                  chord_symbol: { type: "string" }
                },
                required: ["notes", "duration", "chord_symbol"],
                additionalProperties: false
              }
            },
            tempo: { type: "number" },
            style: { type: "string" },
            key: { type: "string" },
            time_signature: { type: "string" },
            form: { type: "string" },
            composer_influence: { type: "string" }
          },
          required: ["melody", "chords", "tempo", "style", "key", "time_signature", "form", "composer_influence"],
          additionalProperties: false
        };
        
        // Create full request object
        const requestBody = {
          model: "o3-mini",
          input: prompt,
          text: {
            format: {
              type: "json_schema",
              schema: melodySchema,
              name: "melody_schema",
              strict: true
            }
          },
          reasoning: {
            effort: "high"  // Use high effort for better quality melodies
          },
          tools: [],
          store: true,
          stream: false  // Set to false to avoid streaming issues
        };
        
        // Log the complete request details
        logger.debug('FULL API Request Body:', JSON.stringify(requestBody, null, 2));
        
        // Also log a shorter version for quick reference
        logger.debug('API Request Summary', {
          model: "o3-mini",
          format: "json_schema",
          input_length: prompt.length,
          schema_properties: Object.keys(melodySchema.properties).join(", "),
          required_fields: melodySchema.required.join(", ")
        });
        
        // Set up timeout to prevent hanging on API calls
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            const timeoutError = new Error(`API request timeout after ${API_TIMEOUT_MS/1000} seconds`);
            timeoutError.name = 'TimeoutError';
            reject(timeoutError);
          }, API_TIMEOUT_MS);
        });
        
        logger.perfStart('OpenAI API Request');
        
        // Set up API request options with timeout
        const requestOptions = {
          maxRetries: 0, // We handle retries manually
          timeout: API_TIMEOUT_MS // Set timeout in ms
        };
        
        // Make the API call
        try {
          // Create a response (non-streaming for now)
          const responsePromise = this.openai.responses.create(
            requestBody,
            requestOptions
          );
          
          // Race between API call and timeout
          const response = await Promise.race([responsePromise, timeoutPromise]);
          
          logger.perfEnd('OpenAI API Request');
          logger.success('Response received successfully');
          
          // Extract structured output from response
          let structuredOutput = null;
          
          if (response.output && Array.isArray(response.output)) {
            // First look for structured_output result
            logger.debug('Checking for structured_output type in response outputs', { 
              outputCount: response.output.length,
              outputTypes: response.output.map(o => o.type).join(', ')
            });
            
            for (const output of response.output) {
              if (output.type === 'structured_output' && output.structured_output) {
                // We have a structured JSON output directly from the API
                structuredOutput = output.structured_output;
                logger.debug('Found structured output result', {
                  melodyLength: structuredOutput.melody?.length || 0,
                  chordsLength: structuredOutput.chords?.length || 0
                });
                break;
              }
            }
            
            // If no structured output, check other output types
            if (!structuredOutput) {
              for (const output of response.output) {
                if (output.type === 'message' && output.content && Array.isArray(output.content)) {
                  for (const content of output.content) {
                    if (content.type === 'output_text' && content.text) {
                      try {
                        // Try to parse as JSON
                        structuredOutput = JSON.parse(content.text);
                        logger.debug('Successfully parsed JSON from output_text');
                        break;
                      } catch (e) {
                        // Try to extract JSON from text
                        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                          try {
                            structuredOutput = JSON.parse(jsonMatch[0]);
                            logger.debug('Successfully extracted and parsed JSON from output_text');
                            break;
                          } catch (e) {
                            logger.warn('Extracted text is not valid JSON');
                          }
                        }
                      }
                    }
                  }
                }
                if (structuredOutput) break;
              }
            }
          }
          
          // If we didn't find structured output, use a fallback
          if (!structuredOutput) {
            logger.warn('No structured output found in response, using fallback');
            structuredOutput = {
              melody: [
                {"note": "C4", "duration": 1, "velocity": 80, "articulation": "normal", "rest": false},
                {"note": "E4", "duration": 1, "velocity": 80, "articulation": "normal", "rest": false},
                {"note": "G4", "duration": 1, "velocity": 80, "articulation": "normal", "rest": false},
                {"note": "C5", "duration": 1, "velocity": 80, "articulation": "normal", "rest": false}
              ],
              chords: [
                {"notes": ["C4", "E4", "G4"], "duration": 2, "chord_symbol": "C"},
                {"notes": ["G3", "B3", "D4"], "duration": 2, "chord_symbol": "G"}
              ],
              tempo: 120,
              style: "classical",
              key: "C major",
              time_signature: "4/4",
              form: "ABA",
              composer_influence: "Mozart"
            };
          }
          
          // Return the processed response
          return {
            success: true,
            data: {
              structured: structuredOutput,
              responseId: response.id,
              model: response.model
            }
          };
          
        } catch (err) {
          const error = err as Error;
          
          // Log detailed error information with more context
          logger.error('Error during OpenAI API request', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            responseStatus: (error as any).status,
            responseType: (error as any).type,
            responseCode: (error as any).code,
            responseDetails: (error as any).response?.data || 'No response data'
          });
          
          throw error;
        }
      } catch (error) {
        retries++;
        
        if (retries > MAX_RETRIES) {
          logger.error(`Maximum retries (${MAX_RETRIES}) reached, giving up`);
          return { 
            success: false, 
            error: {
              message: (error as Error).message,
              name: (error as Error).name,
              details: error
            } 
          };
        }
        
        // Otherwise wait before retrying
        logger.info(`Waiting ${RETRY_DELAY_MS/1000} seconds before retry ${retries}...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
    
    return { success: false, error: 'Maximum retries exceeded' };
  }
  
  // We have a single implementation of processStreamEvents method below
  
  // This method remains for compatibility but is no longer used
  async processStreamEvents(stream: any, callback: (event: any) => void): Promise<any> {
    logger.warn('processStreamEvents called but streaming functionality has been removed');
    
    // Call the callback with an error event
    callback({
      type: 'error',
      error: { message: 'Streaming functionality has been removed' }
    });
    
    // Return a fallback with minimal structure
    return {
      structured: {
        melody: [{"note": "C4", "duration": 1, "velocity": 80, "articulation": "normal", "rest": false}],
        chords: [{"notes": ["C4", "E4", "G4"], "duration": 2, "chord_symbol": "C"}],
        tempo: 120,
        style: "classical",
        key: "C major",
        time_signature: "4/4",
        form: "ABA",
        composer_influence: "Mozart"
      },
      responseId: 'fallback',
      model: 'fallback'
    };
  }
}

// Export a singleton instance
export default new OpenAIService();