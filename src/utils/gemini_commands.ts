import {
  GoogleGenAI,
  LiveServerMessage,
  Modality,
  Session,
} from '@google/genai';

export class GeminiCommandManager {
  private session: Session | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private processor: AudioWorkletNode | null = null;
  private stream: MediaStream | null = null;
  private isConnected: boolean = false;

  constructor(
    private onRestart: () => void,
    private onNext: () => void,
    private onStart: () => void
  ) {}

  async connect() {
    if (this.isConnected) return;

    try {
      console.log("Connecting to Gemini...");
      const ai = new GoogleGenAI({
        apiKey: import.meta.env.VITE_GEMINI_API_KEY,
      });

      // Configuration following test2.js
      const tools = [
        {
          functionDeclarations: [
            {
              name: 'restart',
              description: 'call this function if the user wants to restart or repeat the section',
            },
            // Keeping next_section functionality but adapting to the simple style of test2.js
            {
              name: 'next_section',
              description: 'call this function if the user wants to go to the next section',
            },
            {
              name: 'start',
              description: 'call this function if the user wants to start the song or section',
            }
          ],
        }
      ];

      const config = {
        responseModalities: [Modality.AUDIO],
        tools,
      };

      console.log("Gemini Config:", JSON.stringify(config, null, 2));

      this.session = await ai.live.connect({
        model: 'models/gemini-2.5-flash-native-audio-preview-09-2025',
        config,
        callbacks: {
          onopen: () => {
            console.log("✅ Connection established!");
            this.isConnected = true;
          },
          onmessage: (message: LiveServerMessage) => {
            this.handleServerMessage(message);
          },
          onclose: (event) => {
            console.log("Disconnected:", event);
            this.isConnected = false;
            this.connect();
          },
          onerror: (error) => {
            console.error("Error:", error);
          },
        }
      });

      await this.startAudioStream();

    } catch (error) {
      console.error("Failed to connect to Gemini:", error);
      throw error;
    }
  }

  // Adapted from test2.js handleServerMessage
  private handleServerMessage(message: LiveServerMessage) {
    const functionCalls = message?.toolCall?.functionCalls;

    if (functionCalls) {
      for (const functionCall of functionCalls) {
        if (functionCall.name === 'restart') {
          console.log('Restarting section');
          this.onRestart();
        } else if (functionCall.name === 'next_section') {
            console.log('Next section');
            this.onNext();
        } else if (functionCall.name === 'start') {
            console.log('Starting section');
            this.onStart();
        }
      }
    }
  }

  private async startAudioStream() {
    console.log("Starting Audio Stream...");
    this.audioContext = new AudioContext({
        sampleRate: 16000,
    });

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
      },
    });

    this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.stream);
    
    const processorName = `pcm-processor-${Date.now()}`;
    const workletCode = `
      class PCMProcessor extends AudioWorkletProcessor {
        process(inputs, outputs, parameters) {
          const input = inputs[0];
          if (input.length > 0) {
            const channelData = input[0];
            this.port.postMessage(channelData);
          }
          return true;
        }
      }
      registerProcessor('${processorName}', PCMProcessor);
    `;
    const blob = new Blob([workletCode], { type: "application/javascript" });
    const workletUrl = URL.createObjectURL(blob);

    await this.audioContext.audioWorklet.addModule(workletUrl);
    
    this.processor = new AudioWorkletNode(this.audioContext, processorName);
    
    // Using buffer logic to send chunks
    let audioBuffer: number[] = [];
    const BUFFER_THRESHOLD = 4096; 

    this.processor.port.onmessage = (e) => {
        if (!this.isConnected || !this.session) return;

        const inputData = e.data; // Float32Array
        
        for (let i = 0; i < inputData.length; i++) {
             audioBuffer.push(inputData[i]);
        }

        if (audioBuffer.length >= BUFFER_THRESHOLD) {
            this.sendAudioChunk(new Float32Array(audioBuffer));
            audioBuffer = []; 
        }
    };

    this.mediaStreamSource.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  private sendAudioChunk(float32Data: Float32Array) {
    const pcmData = new Int16Array(float32Data.length);
    for (let i = 0; i < float32Data.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Data[i]));
        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    const base64Audio = this.arrayBufferToBase64(pcmData.buffer);

    this.session?.sendRealtimeInput({
        audio: {
            mimeType: "audio/pcm;rate=16000",
            data: base64Audio
        }
    } as any);
}

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  async disconnect() {
    console.log("Disconnecting from Gemini...");
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.processor) {
        this.processor.disconnect();
        this.processor = null;
    }
    if (this.mediaStreamSource) {
        this.mediaStreamSource.disconnect();
        this.mediaStreamSource = null;
    }
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
    if (this.session) {
      this.session.close();
      this.session = null;
    }
    this.isConnected = false;
    console.log("Disconnected from Gemini");
  }
}
