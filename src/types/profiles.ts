
import { Json } from '@/integrations/supabase/types';

// Extended profile interface that includes the preference_chosen field
export interface ExtendedProfile {
  avatar_url: string | null;
  created_at: string;
  full_name: string | null;
  gender: string | null;
  has_personality_insights: boolean | null;
  id: string;
  onboarding_completed: boolean | null;
  personality_tiles: Json | null;
  updated_at: string;
  preference_chosen: boolean | null;
}

// Interface for profile updates that includes preference_chosen
export interface ProfileUpdate {
  avatar_url?: string | null;
  full_name?: string | null;
  gender?: string | null;
  has_personality_insights?: boolean | null;
  onboarding_completed?: boolean | null;
  personality_tiles?: Json | null;
  preference_chosen?: boolean | null;
}
