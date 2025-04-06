
# CityScout Compass

A personalized city exploration assistant that helps you discover places aligned with your preferences and personality.

## Overview

CityScout Compass analyzes your preferences and location history to provide tailored recommendations for places to visit, eat, and explore. The application creates a personalized profile based on your preferences and uses this information to suggest destinations that match your lifestyle and interests.

## Features

- **User Authentication**: Secure login and registration with email/password or Google OAuth
- **Personalized Onboarding**: Multi-step preference selection to understand your interests
- **Place Discovery**: Find places that match your preferences and personality
- **Personality Insights**: AI-generated insights based on your activity data
- **Interactive Map**: Explore recommended locations visually
- **Profile Management**: Update your preferences and personal information

## Tech Stack

### Frontend
- **React**: UI library for building the user interface
- **TypeScript**: Type-safe JavaScript for better development experience
- **Vite**: Fast, modern frontend build tool
- **Tailwind CSS**: Utility-first CSS framework for styling
- **shadcn/ui**: High-quality UI components built with Radix UI and Tailwind
- **React Router**: Client-side routing
- **Tanstack Query**: Data fetching and state management
- **Mapbox GL**: Interactive maps and location visualization
- **lucide-react**: Icon library

### Backend
- **Supabase**: Backend-as-a-Service platform providing:
  - Authentication
  - PostgreSQL Database
  - Storage
  - Edge Functions
- **LLM (Mistral and OpenAI)**: AI capabilities for personality insights and recommendations
- **Google Drive API**: Integration for importing location data

## Getting Started

### Prerequisites
- Node.js & npm - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- Supabase account (for backend functionality)
- Google API credentials (for Google Drive integration)
- Google Places API
- Mapbox API key (for map functionality)
- OpenAI API key (for AI features)
- Mistral API

### Development Setup

1. Clone the repository
```sh
git clone <repository-url>
cd city-scout-compass
```

2. Install dependencies
```sh
npm install
```

3. Start the development server
```sh
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Backend Setup

The project uses Supabase for backend functionality. For local development with the complete backend:

1. Set up the FastAPI backend (optional, for enhanced data processing)
   - Follow the instructions in `src/docs/FastAPISetup.md`

2. Configure your environment variables by creating a `.env` file with:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token
```

## Deployment

The application can be deployed directly from Lovable by clicking the "Publish" button.

### Custom Domain

To connect your own domain:
1. Navigate to Project > Settings > Domains in Lovable
2. Click "Connect Domain" and follow the instructions

## Project Structure

```
/src
  /components       # UI components
    /ui             # Base UI components from shadcn
    /layout         # Layout components
    /onboarding     # Onboarding flow components
    /map            # Map-related components
  /context          # React context providers
  /hooks            # Custom React hooks
  /integrations     # Third-party integrations
  /lib              # Utility functions
  /pages            # Page components
  /services         # API service functions
  /types            # TypeScript type definitions
  /utils            # Utility functions
/supabase
  /functions        # Supabase Edge Functions
```

## Contributing

1. Create a branch for your feature
2. Make your changes
3. Submit a pull request

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Mapbox GL JS Documentation](https://docs.mapbox.com/mapbox-gl-js)

## License

This project is licensed under the MIT License.
