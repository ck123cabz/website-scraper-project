export interface UserPreferences {
  id: string;
  userId: string;
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  defaultView: 'cards' | 'table';
  createdAt: Date;
  updatedAt: Date;
}

export type CreatePreferencesDto = Omit<UserPreferences, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdatePreferencesDto = Partial<Omit<UserPreferences, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>;
