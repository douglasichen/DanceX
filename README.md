# DanceCV

DanceCV is an interactive and hands-free dance education platform that leverages AI and computer vision to help users learn dance routines efficiently. By comparing your movements to a tutorial video in real-time, the application provides instant feedback, scoring, and personalized tips.

## Features

- **Real-time Pose Comparison**: Uses your webcam to capture your movements and compares your pose (skeleton) with the instructor's in the video using MediaPipe Pose.
- **AI-Powered Video Segmentation**: Automatically breaks down dance videos into smaller, learnable chunks using **Google Gemini Pro's Video Understanding Capabilities**.
- **Voice Control with Gemini Live**: Control the playback hands-free using voice commands (e.g., "restart", "next section") powered by the **Gemini Multimodal Live API**.
- **Scoring & Feedback**: Receive detailed scores for arm and leg movements, along with specific tips to improve your form.
- **Custom Video Upload**: Upload any dance video (`.mp4`) to practice with your favorite routines (link to video coming soon!).
- **Interactive UI**: Navigate through video sections easily with a generated video carousel.

## Tech Stack

- **Frontend**: React, Vite, TypeScript
- **Styling**: Tailwind CSS
- **AI & ML**: 
  - [Google Gemini API](https://ai.google.dev/) (Video analysis & Voice control)
  - [MediaPipe Pose](https://developers.google.com/mediapipe/solutions/vision/pose_landmarker) (Real-time pose detection)
- **UI Components**: Radix UI, Lucide React

## Prerequisites

- **Node.js**: v24.13.0
- **Google Gemini API Key**: You need a valid API key from Google AI Studio.

## Setup

1. **Clone the repository** 
  ```bash
  git clone https://github.com/douglasichen/DanceCV.git
  cd DanceCV
  ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure Environment Variables**

   Create a `.env` file in the root directory (or rename `.env.example` if available) and add your Gemini API key:

   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Run the Development Server**

   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5173`.

## Usage

1. **Upload or Select a Video**: The app loads a sample video by default. You can upload your own dance video using the "Upload Video" button.
2. **AI Analysis**: The video is automatically analyzed by Gemini to generate practice chunks.
3. **Start Practicing**: 
   - Allow camera access when prompted.
   - Mimic the moves in the video.
   - The app will track your joints and compare them to the video.
   - Adjust speed as needed.
   - Practice section by section
4. **Voice Commands**: Click "Gemini Live" to enable voice control.
   - Say **"Restart Section"** or **"Repeat Section"** to play the current section again.
   - Say **"Next Section"** to move to the next chunk.
   - Say **"Start"** to begin a section.
5. **View Score**: After the video or section ends, you'll see an overall score, arm movement score, and leg movement score, along with tips to improve your performance.

## Project Structure

- `src/app/`: Main application logic and layout.
  - `components/`: React components (CameraFeed, VideoPlayer, VideoCarousel, etc.).
- `src/utils/`: Utility functions.
  - `gemini_chunk.ts`: Handles video processing and segmentation using Gemini.
  - `gemini_commands.ts`: Manages the Gemini Live WebSocket connection for voice commands.
  - `pose.ts`: Helper functions for pose estimation calculations.
- `src/media/`: Assets and sample videos.

