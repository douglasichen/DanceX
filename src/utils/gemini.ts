import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
  Type,
} from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export async function getIntervals(fileInput: string | File, signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  let contentPart;

  if (typeof fileInput === "string") {
    // 1. Upload the file
    let myfile = await ai.files.upload({
      file: fileInput,
      config: { mimeType: "video/mp4" },
    });

    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    console.log(`Uploaded ${myfile.name}. Waiting for processing...`);

    // 2. POLL: Wait for the file to become ACTIVE
    while (myfile.state === "PROCESSING") {
      if (signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }
      // Wait 10 seconds
      await new Promise((resolve) => setTimeout(resolve, 10_000));
      
      // Refresh the file status
      myfile = await ai.files.get({ name: myfile.name });
      console.log(`Current state: ${myfile.state}`);
    }

    // 3. Validation
    if (myfile.state !== "ACTIVE") {
      throw new Error(`File processing failed. State: ${myfile.state}`);
    }

    console.log("File is active. Generating content...");
    contentPart = createPartFromUri(myfile.uri, myfile.mimeType);
  } else {
    // Handle File object (Browser)
    console.log("Processing uploaded file...");
    const base64Data = await fileToGenerativePart(fileInput);
    
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    contentPart = {
      inlineData: {
        data: base64Data,
        mimeType: fileInput.type,
      },
    };
  }

  // 4. Generate Content
  const generatePromise = ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: createUserContent([
      contentPart
    ]),
    config: {
      systemInstruction: [
        {
          text: `Given a dance video, chunk it into smaller sections that are easier to learn. Output the time intervals in milliseconds. Ensure the time intervals are precise. Ensure the chunk title are at most two words. First chunk start time should be 0. Last chunk end time should be the total video length. Section intervals should be at least 2000 ms long.`,
        },
      ],
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        required: ["intervals"],
        properties: {
          intervals: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ["start", "end", "chunk_title"],
              properties: {
                start: {
                  type: Type.INTEGER,
                },
                end: {
                  type: Type.INTEGER,
                },
                chunk_title: {
                  type: Type.STRING,
                },
              },
            },
          },
        },
      },
    }
  });

  let response;
  if (signal) {
    const abortPromise = new Promise<never>((_, reject) => {
        const onAbort = () => {
            signal.removeEventListener("abort", onAbort);
            reject(new DOMException("Aborted", "AbortError"));
        };
        if (signal.aborted) {
            onAbort();
        } else {
            signal.addEventListener("abort", onAbort);
        }
    });
    response = await Promise.race([generatePromise, abortPromise]);
  } else {
    response = await generatePromise;
  }
  
  const resultText = response.text;
  const intervals = JSON.parse(resultText);
  // Handle case where it might return { intervals: [...] } or just [...] depending on schema enforcement
  const list = intervals.intervals || intervals;
  return list;
}

function padIntervals(intervals: { start: number, end: number, chunk_title: string }[]) {
  return intervals.map((interval) => {
    return {
      ...interval,
      start: Math.max(0, interval.start - 1000), // Ensure start doesn't go below 0
      end: interval.end + 1000,
    };
  });
}

async function fileToGenerativePart(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
