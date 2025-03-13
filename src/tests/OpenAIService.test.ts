import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import OpenAIService from '../services/OpenAIService';

// Mock OpenAI API
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      responses = {
        create: vi.fn(),
        retrieve: vi.fn()
      };
      
      constructor() {
        // Mock constructor
      }
    }
  };
});

// Mock Logger
vi.mock('../utils/Logger', () => {
  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    music: vi.fn(),
    piano: vi.fn(),
    api: vi.fn(),
    perfStart: vi.fn(),
    perfEnd: vi.fn(),
  };
  
  return {
    default: class Logger {
      constructor() {
        return mockLogger;
      }
    }
  };
});

describe('OpenAIService', () => {
  beforeEach(() => {
    // Clear mocks before each test
    vi.clearAllMocks();
    
    // Reset the OpenAIService for each test
    (OpenAIService as any).openai = null;
  });
  
  test('should generate a response successfully', async () => {
    // Create a mock successful response
    const mockResponse = {
      id: 'resp_123456',
      model: 'gpt-4o',
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: '{"melody": [], "chords": []}'
            }
          ]
        }
      ],
      usage: {
        input_tokens: 100,
        output_tokens: 200,
        total_tokens: 300
      }
    };
    
    // Create OpenAI instance first
    (OpenAIService as any).openai = {
      responses: {
        create: vi.fn().mockResolvedValue(mockResponse),
        retrieve: vi.fn()
      }
    };
    
    // Call generateResponse
    const result = await OpenAIService.generateResponse('Test prompt');
    
    // Assertions
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.text).toBe('{"melody": [], "chords": []}');
    expect(result.data.responseId).toBe('resp_123456');
    expect(result.data.model).toBe('gpt-4o');
  }, 10000);
  
  test('should handle timeout errors', async () => {
    // Set up the mock to simulate a timeout
    const timeoutError = new Error('Request timed out');
    timeoutError.name = 'TimeoutError';
    
    // Create OpenAI instance first
    (OpenAIService as any).openai = {
      responses: {
        create: vi.fn().mockRejectedValue(timeoutError),
        retrieve: vi.fn()
      }
    };
    
    // Call generateResponse
    const result = await OpenAIService.generateResponse('Test prompt');
    
    // Assertions
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect((result.error as any).name).toBe('TimeoutError');
  }, 10000);
  
  test('should retrieve a response by ID', async () => {
    // Create a mock successful response
    const mockResponse = {
      id: 'resp_123456',
      model: 'gpt-4o',
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: '{"melody": [], "chords": []}'
            }
          ]
        }
      ]
    };
    
    // Create OpenAI instance first
    (OpenAIService as any).openai = {
      responses: {
        create: vi.fn(),
        retrieve: vi.fn().mockResolvedValue(mockResponse)
      }
    };
    
    // Call retrieveResponse
    const result = await OpenAIService.retrieveResponse('resp_123456');
    
    // Assertions
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.text).toBe('{"melody": [], "chords": []}');
    expect(result.data.responseId).toBe('resp_123456');
  }, 10000);
  
  test('should handle API errors', async () => {
    // Mock API error response
    const apiError = new Error('Invalid API key');
    (apiError as any).status = 401;
    (apiError as any).type = 'authentication_error';
    
    // Create OpenAI instance first
    (OpenAIService as any).openai = {
      responses: {
        create: vi.fn().mockRejectedValue(apiError),
        retrieve: vi.fn()
      }
    };
    
    // Call generateResponse
    const result = await OpenAIService.generateResponse('Test prompt');
    
    // Assertions
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect((result.error as any).message).toBe('Invalid API key');
  }, 10000);
}); 