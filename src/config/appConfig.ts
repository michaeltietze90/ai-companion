/**
 * App Configuration
 * Controls branding and which routes/features are shown.
 * Set VITE_APP_MODE at build time (Heroku config).
 */

export type AppMode = 'full' | 'frank-keynote' | 'frank-chat';

const appMode = (import.meta.env.VITE_APP_MODE as AppMode | undefined) || 'full';

export interface AppConfig {
  appMode: AppMode;
  /** App title (home page) */
  title: string;
  /** Show only Keynote */
  keynoteOnly: boolean;
  /** Show only Chat */
  chatOnly: boolean;
  /** Show Proto M link (hidden for Frank apps) */
  showProtoM: boolean;
  /** Keynote branding */
  keynoteTitle: string;
  keynoteSubtitle: string;
  /** Chat branding */
  chatTitle: string;
  chatSubtitle: string;
}

function getConfig(): AppConfig {
  switch (appMode) {
    case 'frank-keynote':
      return {
        appMode: 'frank-keynote',
        title: 'Australia Frank Hologram',
        keynoteOnly: true,
        chatOnly: false,
        showProtoM: false,
        keynoteTitle: 'Frank Keynote',
        keynoteSubtitle: 'Australia Frank Hologram - Keynote',
        chatTitle: 'Chat to Frank',
        chatSubtitle: 'Conversational chat with Frank',
      };
    case 'frank-chat':
      return {
        appMode: 'frank-chat',
        title: 'Chat to Frank',
        keynoteOnly: false,
        chatOnly: true,
        showProtoM: false,
        keynoteTitle: 'Frank Keynote',
        keynoteSubtitle: 'Australia Frank Hologram - Keynote',
        chatTitle: 'Chat to Frank',
        chatSubtitle: 'Conversational chat with Frank',
      };
    default:
      return {
        appMode: 'full',
        title: 'Miguel Avatar Platform',
        keynoteOnly: false,
        chatOnly: false,
        showProtoM: true,
        keynoteTitle: 'Miguel Keynote Avatar',
        keynoteSubtitle: 'CKO Keynote Agent',
        chatTitle: 'Pitch Agent Script',
        chatSubtitle: 'Scripted pitch conversation agent',
      };
  }
}

export const appConfig = getConfig();
