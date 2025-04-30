# TunaTalk

A chat application built with Next.js, Clerk, and the Vercel AI SDK.

## Features

- Authentication with Clerk
- AI Chat powered by Vercel AI SDK
- Modern UI with Tailwind CSS and Radix UI components
- TypeScript support

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Clerk Authentication
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

# OpenAI (or your chosen AI provider)
OPENAI_API_KEY=your_openai_api_key

# Optional: Analytics, etc
```

## Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/tunatalk.git
cd tunatalk
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your values
```

4. Start the development server
```bash
npm run dev
```

Your app should now be running on [localhost:3000](http://localhost:3000/).

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run linting

## License

MIT
