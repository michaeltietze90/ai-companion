import { useCallback, useRef } from 'react';
import { useQuizOverlayStore, type LeaderboardEntry } from '@/stores/quizOverlayStore';
import { useVisualOverlayStore } from '@/stores/visualOverlayStore';
import { useCountdownStore } from '@/stores/countdownStore';
import { useScoreOverlayStore } from '@/stores/scoreOverlayStore';
import { useSlideOverlayStore } from '@/stores/slideOverlayStore';
import type { StructuredAction, StructuredData } from '@/lib/structuredResponseParser';
import type { VisualCommand, VisualPosition, VisualType } from '@/lib/richResponseParser';

// Track currently active asset references for auto-hide behavior
let currentAssetRefs: Set<string> = new Set();

/**
 * Hook to handle structured actions from Agentforce JSON responses.
 * Maps action types to their corresponding UI effects.
 */
export function useStructuredActions() {
  const { 
    showNameEntry, 
    showLeaderboard, 
    hideOverlay, 
    setPrefillData,
    setScore,
    setLeaderboard,
    setUserRankData,
  } = useQuizOverlayStore();
  
  const { startVisuals } = useVisualOverlayStore();
  const { startCountdown, stopCountdown } = useCountdownStore();
  const { showScore, hideScore } = useScoreOverlayStore();
  const { showSlide, hideSlide } = useSlideOverlayStore();

  /**
   * Execute a single action
   */
  const executeAction = useCallback((action: StructuredAction) => {
    console.log('[StructuredActions] Executing action:', action.type, action.data);
    
    switch (action.type) {
      case 'showNameEntry': {
        const data = action.data as StructuredData | undefined;
        const score = data?.score ?? 0;
        showNameEntry(score, {
          firstName: data?.firstName,
          lastName: data?.lastName,
          country: data?.country,
          score: data?.score,
        });
        break;
      }
      
      case 'showLeaderboard': {
        showLeaderboard();
        break;
      }
      
      case 'hideOverlay': {
        hideOverlay();
        break;
      }
      
      case 'prefillData': {
        const data = action.data as StructuredData | undefined;
        if (data) {
          setPrefillData({
            firstName: data.firstName,
            lastName: data.lastName,
            country: data.country,
            score: data.score,
          });
        }
        break;
      }
      
      case 'setScore': {
        const data = action.data as { score?: number } | undefined;
        if (typeof data?.score === 'number') {
          setScore(data.score);
        }
        break;
      }
      
      case 'showVisual': {
        const data = action.data as {
          src?: string;
          type?: VisualType;
          position?: VisualPosition;
          duration?: number;
          alt?: string;
        } | undefined;
        
        if (data?.src) {
          const visual: VisualCommand = {
            id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: data.type || 'image',
            src: data.src,
            duration: data.duration || 5000,
            position: data.position || 'center',
            startOffset: 0,
            alt: data.alt,
          };
          startVisuals([visual]);
        }
        break;
      }
      
      case 'showAsset': {
        // Show asset by reference key - fetch from API
        const data = action.data as {
          ref?: string;
          duration?: number;  // Optional - if not provided, stays until next message
        } | undefined;
        
        const ref = data?.ref || (action as any).ref; // Support both action.data.ref and action.ref
        
        if (ref) {
          console.log('[StructuredActions] showAsset - ref:', ref, 'duration:', data?.duration || 'until next message');
          
          // Track this asset reference
          currentAssetRefs.add(ref);
          
          // Fetch asset info from API
          fetch(`/api/agent-config/asset/${ref}`)
            .then(res => {
              if (!res.ok) throw new Error('Asset not found');
              return res.json();
            })
            .then(asset => {
              console.log('[StructuredActions] Loaded asset:', asset.name, asset.url);
              
              // Duration: if not specified, use a very long duration (effectively "until dismissed")
              // The auto-hide logic in conversation hook will clear it when not referenced
              const duration = data?.duration ?? 999999;
              
              const visual: VisualCommand = {
                id: `asset_${ref}_${Date.now()}`,
                type: asset.assetType === 'video' ? 'video' : 'image',
                src: asset.url,
                duration: duration,
                position: 'center', // Position is stored in asset but we show centered for overlays
                startOffset: 0,
                alt: asset.name,
              };
              startVisuals([visual]);
            })
            .catch(err => {
              console.error('[StructuredActions] Failed to load asset:', ref, err);
            });
        }
        break;
      }
      
      case 'setLeaderboardData': {
        const data = action.data as {
          entries?: Array<{
            firstName: string;
            lastName: string;
            country: string;
            score: number;
          }>;
          userRank?: number;
          userEntry?: {
            firstName: string;
            lastName: string;
            country: string;
            score: number;
          };
        } | undefined;
        
        if (data?.entries && Array.isArray(data.entries)) {
          const entries: LeaderboardEntry[] = data.entries.map((e, idx) => ({
            id: `agent_${Date.now()}_${idx}`,
            firstName: e.firstName || '',
            lastName: e.lastName || '',
            country: e.country || '',
            score: e.score || 0,
            timestamp: Date.now(),
          }));
          setLeaderboard(entries);
          
          // If user rank/entry provided, set them separately
          if (data.userRank && data.userEntry) {
            const userEntry: LeaderboardEntry = {
              id: `user_${Date.now()}`,
              firstName: data.userEntry.firstName || '',
              lastName: data.userEntry.lastName || '',
              country: data.userEntry.country || '',
              score: data.userEntry.score || 0,
              timestamp: Date.now(),
            };
            setUserRankData(data.userRank, userEntry);
          }
        }
        break;
      }
      
      case 'countdown': {
        const data = action.data as { seconds?: number } | undefined;
        const seconds = data?.seconds ?? 60;
        startCountdown(seconds);
        break;
      }
      
      case 'stopCountdown': {
        stopCountdown();
        break;
      }
      
      case 'score': {
        const data = action.data as { value?: number } | undefined;
        const value = data?.value ?? 0;
        showScore(value);
        break;
      }
      
      case 'hideScore': {
        hideScore();
        break;
      }
      
      case 'slide': {
        const data = action.data as { page?: number } | undefined;
        const page = data?.page ?? 1;
        showSlide(page);
        break;
      }
      
      case 'hideSlide': {
        hideSlide();
        break;
      }
      
      default:
        console.warn('[StructuredActions] Unknown action type:', action.type);
    }
  }, [showNameEntry, showLeaderboard, hideOverlay, setPrefillData, setScore, startVisuals, setLeaderboard, setUserRankData, startCountdown, stopCountdown, showScore, hideScore, showSlide, hideSlide]);

  /**
   * Execute multiple actions in sequence
   */
  const executeActions = useCallback((actions: StructuredAction[]) => {
    if (!actions || actions.length === 0) return;
    
    console.log('[StructuredActions] Executing', actions.length, 'actions');
    actions.forEach(executeAction);
  }, [executeAction]);

  /**
   * Apply structured data as prefill
   */
  const applyData = useCallback((data: StructuredData | null) => {
    if (!data) return;
    
    console.log('[StructuredActions] Applying prefill data:', data);
    setPrefillData({
      firstName: data.firstName,
      lastName: data.lastName,
      country: data.country,
      score: data.score,
    });
  }, [setPrefillData]);

  /**
   * Get current asset references being shown
   */
  const getCurrentAssetRefs = useCallback(() => {
    return new Set(currentAssetRefs);
  }, []);

  /**
   * Clear asset refs that are not in the new set
   * Called when a new message comes in - clears assets not referenced in new message
   */
  const clearUnreferencedAssets = useCallback((newRefs: Set<string>) => {
    const toRemove = Array.from(currentAssetRefs).filter(ref => !newRefs.has(ref));
    if (toRemove.length > 0) {
      console.log('[StructuredActions] Clearing unreferenced assets:', toRemove);
      // Clear visuals if we had assets that are no longer referenced
      // The startVisuals with empty array or clearVisuals would hide them
      currentAssetRefs = newRefs;
    } else {
      currentAssetRefs = newRefs;
    }
  }, []);

  /**
   * Clear all tracked asset refs
   */
  const clearAllAssetRefs = useCallback(() => {
    console.log('[StructuredActions] Clearing all asset refs');
    currentAssetRefs.clear();
  }, []);

  return {
    executeAction,
    executeActions,
    applyData,
    getCurrentAssetRefs,
    clearUnreferencedAssets,
    clearAllAssetRefs,
  };
}
