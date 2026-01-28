import { useCallback } from 'react';
import { useQuizOverlayStore } from '@/stores/quizOverlayStore';
import { useVisualOverlayStore } from '@/stores/visualOverlayStore';
import type { StructuredAction, StructuredData } from '@/lib/structuredResponseParser';
import type { VisualCommand, VisualPosition, VisualType } from '@/lib/richResponseParser';

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
  } = useQuizOverlayStore();
  
  const { startVisuals } = useVisualOverlayStore();

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
      
      default:
        console.warn('[StructuredActions] Unknown action type:', action.type);
    }
  }, [showNameEntry, showLeaderboard, hideOverlay, setPrefillData, setScore, startVisuals]);

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

  return {
    executeAction,
    executeActions,
    applyData,
  };
}
