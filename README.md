# National Parks Planner

## Description

This is a Next.js application that helps users write Markdown format articles with the help of AI. The primary use case is planning trips to national parks in the US, but it can be used for any markdown-based writing project.

## Features

### AI-Powered Writing Assistant

- **Gemini 2.5 Pro Integration**: Uses Google's Gemini 2.5 Pro model for intelligent content generation
- **Configurable API Settings**: Built-in settings modal to configure API key and model type
- **Streaming Responses**: Real-time streaming of AI responses for immediate feedback
- **Context-Aware**: AI has access to all files in your project for comprehensive understanding

### Three-Column Layout

1. **Left Panel (256px)**: File management with tabs
   - Create new Markdown files
   - Rename files inline
   - Delete files
   - Toggle file inclusion in AI context (checkbox next to each file)
   - "Start Over" button to reset all files
   - Persistent storage using localStorage

2. **Middle Panel (50% of remaining width)**: Monaco Editor
   - Full-featured code editor with syntax highlighting
   - AI icons in the gutter for AI triggers (blue and purple sparkle design)
   - Real-time content updates during AI streaming
   - Automatic decoration updates when content changes

3. **Right Panel (50% of remaining width)**: Live Markdown Preview
   - Real-time preview with GitHub Flavored Markdown support
   - Custom styling for headers, lists, code blocks, and tables
   - Fixed width to prevent UI jumping during updates

### Settings Configuration

- **Settings Button**: Floating gear icon at bottom-right corner
- **Model Selection**: Choose between supported LLM models (currently Gemini Pro 2.5)
- **API Key Management**: Securely store API keys in browser's local storage
- **Persistent Settings**: Configuration persists across browser sessions

## AI Triggers

### 1. `ai-template` - Generate Writing Templates

Create a structured template for your topic:

````markdown
```ai-template
Create a 4-day trip plan for Yellowstone National Park
```
````

The AI will generate a comprehensive template with sections wrapped in `ai-write` blocks for further enrichment.

### 2. `ai-write` - Enrich Content Sections

Add detailed content to any section:

````markdown
```ai-write
Activities in Grand Canyon National Park
```
````

The AI will provide detailed information with links, durations, and difficulty levels.

## Setup Instructions

### Local Run Prerequisites

- Node.js 18+
- npm or yarn
- Gemini API Key from Google AI Studio

### Installation

1. Clone the repository:

```bash
git clone https://github.com/ZzzGin/national-parks-planner.git
cd national-parks-planner
```

2. Install dependencies:

```bash
npm install
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

5. Configure your API key:

   - Click the settings button (gear icon) at the bottom-right corner
   - Select "Gemini Pro 2.5" as the model type
   - Enter your Gemini API key
   - Click "Save Settings"

   **Note**: API key configuration is required. The app will display a warning banner until you configure your API key.

## How to Use

### Basic Workflow

1. **Create or Select a File**: Use the left panel to manage your Markdown files
2. **Write Content**: Use the middle editor to write and edit your content
3. **Add AI Triggers**: Insert `ai-template` or `ai-write` code blocks where you want AI assistance
4. **Process AI**: Click the AI icon in the gutter next to any AI trigger
5. **Preview**: See your formatted content in real-time in the right panel

### Example: Planning a National Park Trip

1. Create a new file called "Yellowstone Trip"

2. Add an AI template trigger:

````markdown
```ai-template
Create a 5-day family trip to Yellowstone National Park in summer
```
````

3. Click the AI icon to generate a template

4. The AI will create sections like:
   - Activities You Might be Interested
   - Trip Itinerary (Day 1-5)
   - Checklist Before You Go

5. Edit the generated template as needed

6. Enrich specific sections by adding `ai-write` blocks and clicking their AI icons

### Tips for Best Results

- **Provide Context**: The AI uses content from all your files, so related information helps
- **Manage Context**: Use the checkbox next to each file to include/exclude it from AI context
- **Be Specific**: Detailed prompts in AI triggers yield better results
- **Edit and Refine**: AI output is a starting point - customize it to your needs
- **Multiple Files**: Create separate files for research, itinerary, and packing lists
- **Context Optimization**: Uncheck files not relevant to current task to improve AI focus

## Technical Details

### Backend API

- **Endpoint**: `/api/ai`
- **Method**: POST
- **Parameters**:
  - `systemInstruction`: System prompt for the AI
  - `userPrompt`: User's content/context
  - `modelType`: LLM model selection (currently supports 'gemini-pro-2.5')
  - `apiKey`: Required API key from user settings
- **Streaming**: Server-sent events for real-time response streaming
- **Model**: Gemini 2.5 Pro with 65,536 max output tokens
- **Temperature**: 0.7 for balanced creativity and consistency

### Frontend Architecture

- **React 19.1.0** with Next.js 15.5.2
- **Monaco Editor** for code editing
- **React Markdown** with remark-gfm for preview
- **Tailwind CSS** for styling
- **TypeScript** for type safety

### Key Features Implementation

#### Streaming with Proper UTF-8 Handling

- Uses `TextDecoder` with `stream: true` flag to handle multi-byte characters
- Batched updates every 3 chunks to reduce re-renders
- Final sync ensures complete content display

#### Dynamic Line Number Tracking

- Gutter decorations update automatically when content changes
- Click detection uses fresh content for accurate line numbers
- Handles manual edits with 300ms debounced updates

#### Context Gathering

- Includes content from files marked for inclusion (checked in file list)
- Files can be toggled on/off for context inclusion via checkbox
- Current file content is always fresh from the editor
- Clear separation between files for AI understanding
- Excluded files (unchecked) are not sent to the AI, reducing token usage

#### Settings Management

- **Local Storage**: API keys and settings stored securely in browser
- **Settings Modal**: Clean UI for configuring LLM options
- **Dynamic Configuration**: API calls automatically use stored settings
- **Required Configuration**: API key must be configured through settings modal
- **Visual Feedback**: Warning banner displays when API key is not configured

## Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Dependencies

### Core

- `next`: 15.5.2
- `react`: 19.1.0
- `react-dom`: 19.1.0

### AI & Editor

- `@google/generative-ai`: For Gemini API integration
- `@monaco-editor/react`: Full-featured code editor
- `react-markdown`: Markdown rendering
- `remark-gfm`: GitHub Flavored Markdown support

### UI

- `lucide-react`: Icon library
- `@tailwindcss/typography`: Beautiful typographic defaults
- `tailwindcss`: Utility-first CSS framework

## Troubleshooting

### AI Responses Cut Off

- Check your Gemini API quota
- Ensure proper API key configuration
- Monitor browser console for errors

### Editor Not Updating

- Refresh the page if decorations don't appear
- Check browser console for Monaco Editor errors
- Ensure JavaScript is enabled

### Files Not Persisting

- Check browser localStorage limits
- Clear cache if experiencing issues
- Files are stored locally in the browser

## Future Enhancements

- [x] Configurable API settings via UI modal
- [ ] Concurrent AI trigger processing (currently limited to one at a time)
- [ ] Export to various formats (PDF, DOCX)
- [ ] Collaborative editing
- [ ] More AI models support (OpenAI, Anthropic)
- [ ] Cloud storage integration
- [ ] Mobile responsive design
- [ ] Dark mode support
- [ ] Version history
- [ ] Custom AI prompts configuration

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Deployment to Google Cloud

### Google Cloud Deployment Prerequisites

- Google Cloud account with billing enabled
- Google Cloud CLI installed and authenticated
- Docker installed (for manual deployment)

### Initial Deployment

#### Option 1: Cloud Run (Recommended)

1. **Setup Google Cloud CLI and authenticate:**

   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Enable required APIs:**

   ```bash
   gcloud services enable cloudbuild.googleapis.com run.googleapis.com
   ```

3. **Deploy using Cloud Build:**

   ```bash
   gcloud builds submit --config cloudbuild.yaml
   ```

#### Option 2: App Engine

1. **Deploy to App Engine:**

   ```bash
   gcloud app deploy
   ```

#### Option 3: Manual Docker Deployment

1. **Build and push to Container Registry:**

   ```bash
   docker build -t gcr.io/YOUR_PROJECT_ID/national-parks-planner .
   docker push gcr.io/YOUR_PROJECT_ID/national-parks-planner
   ```

2. **Deploy to Cloud Run:**

   ```bash
   gcloud run deploy national-parks-planner \
     --image gcr.io/YOUR_PROJECT_ID/national-parks-planner \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated
   ```

### Updating Deployed App

After making changes to your code:

#### For Cloud Run (using Cloud Build)

```bash
gcloud builds submit --config cloudbuild.yaml
```

#### For App Engine

```bash
gcloud app deploy
```

#### For Manual Docker

```bash
docker build -t gcr.io/YOUR_PROJECT_ID/national-parks-planner .
docker push gcr.io/YOUR_PROJECT_ID/national-parks-planner
gcloud run deploy national-parks-planner \
  --image gcr.io/YOUR_PROJECT_ID/national-parks-planner \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Deployment Files

The following files have been created for deployment:

- `Dockerfile` - Multi-stage build for optimized container
- `.dockerignore` - Excludes unnecessary files from Docker context  
- `cloudbuild.yaml` - Automated CI/CD pipeline for Cloud Run
- `app.yaml` - App Engine configuration (max 2 instances)
- `next.config.ts` - Updated with standalone output for Docker

**Note**: Replace `YOUR_PROJECT_ID` with your actual Google Cloud project ID in all commands.

## Support

For issues or questions, please open an issue on GitHub.
