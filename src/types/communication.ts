import { User } from '../types';

export interface Communication {
  id: number;
  title: string;
  content: string;
  status: 'draft' | 'published' | 'archived';
  target_all: boolean;
  target_users?: User[];
  published_at?: string;
  scheduled_at?: string;
  created_by: number;
  creator: {
    id: number;
    name: string;
    email: string;
  };
  stats?: {
    total_recipients: number;
    viewed_count: number;
    unread_count: number;
    view_rate: number;
  };
  created_at: string;
  updated_at: string;
}

export interface CommunicationFeed {
  id: number;
  title: string;
  content: string;
  published_at: string;
  creator: {
    name: string;
  };
  is_viewed: boolean;
}

export interface CommunicationView {
  id: number;
  user: {
    id: number;
    name: string;
    email: string;
    profile_image_url?: string;
  };
  viewed_at: string;
}

export type CommunicationStatus = 'draft' | 'published' | 'archived';
