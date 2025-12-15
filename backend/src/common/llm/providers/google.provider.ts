import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import {
  LlmProviderService,
  LlmProvider,
  ChatMessage,
  ChatCompletionOptions,
  ChatCompletionResult,
  StreamChunk,
} from '../types/llm.types';

const DEFAULT_MODEL = 'gemini-2.5-flash';

@Injectable()
export class GoogleProvider implements LlmProviderService {
  readonly provider: LlmProvider = 'google';
  private readonly logger = new Logger(GoogleProvider.name);
  private readonly client: GoogleGenerativeAI | null;
  private readonly defaultModel: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GOOGLE_AI_API_KEY');

    if (!apiKey) {
      this.logger.warn('GOOGLE_AI_API_KEY not configured - Google AI provider disabled');
      this.client = null;
    } else {
      this.client = new GoogleGenerativeAI(apiKey);
      this.defaultModel = this.configService.get<string>('GOOGLE_AI_MODEL', DEFAULT_MODEL);
      this.logger.log(`Google AI provider initialized with model: ${this.defaultModel}`);
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  private getModel(modelName?: string): GenerativeModel {
    if (!this.client) {
      throw new Error('Google AI provider not configured');
    }
    return this.client.getGenerativeModel({ model: modelName ?? this.defaultModel });
  }

  private formatMessages(messages: ChatMessage[]): { role: string; parts: { text: string }[] }[] {
    const formatted: { role: string; parts: { text: string }[] }[] = [];
    let systemPrompt = '';

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemPrompt += msg.content + '\n';
      } else {
        const role = msg.role === 'assistant' ? 'model' : 'user';
        formatted.push({ role, parts: [{ text: msg.content }] });
      }
    }

    // Prepend system prompt to first user message if exists
    if (systemPrompt && formatted.length > 0 && formatted[0].role === 'user') {
      formatted[0].parts[0].text = `${systemPrompt}\n\n${formatted[0].parts[0].text}`;
    }

    return formatted;
  }

  async chat(messages: ChatMessage[], options?: ChatCompletionOptions): Promise<ChatCompletionResult> {
    const model = this.getModel(options?.model);
    const formattedMessages = this.formatMessages(messages);

    const chat = model.startChat({
      history: formattedMessages.slice(0, -1),
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? 4096,
        topP: options?.topP ?? 1,
      },
    });

    const lastMessage = formattedMessages[formattedMessages.length - 1];
    const result = await chat.sendMessage(lastMessage.parts[0].text);
    const response = result.response;
    const text = response.text();

    return {
      content: text,
      provider: this.provider,
      model: options?.model ?? this.defaultModel,
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
      },
      finishReason: response.candidates?.[0]?.finishReason ?? 'unknown',
    };
  }

  async *chatStream(
    messages: ChatMessage[],
    options?: ChatCompletionOptions,
  ): AsyncGenerator<StreamChunk> {
    const model = this.getModel(options?.model);
    const formattedMessages = this.formatMessages(messages);

    const chat = model.startChat({
      history: formattedMessages.slice(0, -1),
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? 4096,
        topP: options?.topP ?? 1,
      },
    });

    const lastMessage = formattedMessages[formattedMessages.length - 1];
    const result = await chat.sendMessageStream(lastMessage.parts[0].text);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      yield { content: text, isComplete: false };
    }

    yield { content: '', isComplete: true };
  }
}
