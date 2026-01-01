import { useState, useEffect, useRef, useCallback } from 'react';

const STORAGE_KEY = 'tkd_match_state_v1';

const INITIAL_STATE = {
  status: 'SETUP', // SETUP, FIGHT, ROUND_END, MATCH_END
  redPlayer: 'VĐV Đỏ',
  bluePlayer: 'VĐV Xanh',
  currentRound: 1,
  
  // Timer Settings
  roundDuration: 60, // default 60s
  timeLeft: 60,
  isPaused: true,

  // Round specific scores
  redScore: 0,
  blueScore: 0,
  redFaults: 0,
  blueFaults: 0,
  
  // Undo Logic
  undoStack: [], // Array of snapshot objects { redScore, blueScore, redFaults, blueFaults } of current round

  // Match standing
  roundsWonRed: 0,
  roundsWonBlue: 0,
  
  roundScores: [], // Array of { round: 1, red: 5, blue: 3 }
  
  matchHistory: [], // Array of past match results
  matchId: null,    // Unique ID for current session to track resolution
  matchType: 'single' // 'single' or 'tournament'
};

export const useMatchLogic = () => {
  const [state, setState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : INITIAL_STATE;
    
    if (!parsed.matchHistory) parsed.matchHistory = [];
    
    // Backfill missing IDs in history to ensure stable keys
    if (parsed.matchHistory.length > 0) {
        parsed.matchHistory = parsed.matchHistory.map((item, index) => ({
            ...item,
            id: item.id || Date.now() + index,
            matchType: item.matchType || 'single'
        }));
    }
    
    return parsed;
  });

  const timeLeftRef = useRef(state.timeLeft);

  useEffect(() => {
    timeLeftRef.current = state.timeLeft;
  }, [state.timeLeft]);

  const timerInterval = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const endRoundCallback = useCallback((forcedWinner = null) => {
    setState(currentState => {
        // Guard 1: Only process if in a valid fighter/picker state
        if (currentState.status !== 'FIGHT' && currentState.status !== 'PICK_WINNER') return currentState;

        // Guard 2: Prevent double-processing of the same round (e.g. point gap + timer collisions)
        if (currentState.roundScores.length >= currentState.currentRound) return currentState;

        let roundWinner = forcedWinner;
    
        if (!roundWinner) {
          if (currentState.redScore > currentState.blueScore) roundWinner = 'red';
          else if (currentState.blueScore > currentState.redScore) roundWinner = 'blue';
        }
    
        if (!roundWinner) {
            return {
                ...currentState,
                status: 'PICK_WINNER',
                isPaused: true
            };
        }

        const nextRedWins = roundWinner === 'red' ? currentState.roundsWonRed + 1 : currentState.roundsWonRed;
        const nextBlueWins = roundWinner === 'blue' ? currentState.roundsWonBlue + 1 : currentState.roundsWonBlue;
    
        let matchWinner = null;
        if (nextRedWins >= 2) matchWinner = 'red';
        if (nextBlueWins >= 2) matchWinner = 'blue';
    
        const newState = {
          ...currentState,
          roundsWonRed: nextRedWins,
          roundsWonBlue: nextBlueWins,
          isPaused: true, 
          undoStack: [] 
        };
    
        if (matchWinner) {
            newState.status = 'MATCH_END';
            newState.winner = matchWinner;
            
            const finalRoundScore = { round: currentState.currentRound, red: currentState.redScore, blue: currentState.blueScore };
            const fullRoundScores = [...currentState.roundScores, finalRoundScore];
            newState.roundScores = fullRoundScores;

            const historyItem = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                date: new Date().toISOString(),
                redPlayer: currentState.redPlayer,
                bluePlayer: currentState.bluePlayer,
                winner: matchWinner,
                score: `${nextRedWins}-${nextBlueWins}`,
                roundScores: fullRoundScores,
                matchType: currentState.matchType || 'single'
            };
            newState.matchHistory = [historyItem, ...currentState.matchHistory];
        } else {
            newState.status = 'ROUND_END';
            newState.roundWinner = roundWinner;
            
            // Save this round's score
            newState.roundScores = [
                ...currentState.roundScores, 
                { round: currentState.currentRound, red: currentState.redScore, blue: currentState.blueScore }
            ];
        }
        
        return newState;
    });
  }, []);

  // Timer Logic
  useEffect(() => {
    if (state.status === 'FIGHT' && !state.isPaused && state.timeLeft > 0) {
      timerInterval.current = setInterval(() => {
        if (timeLeftRef.current <= 1) {
            clearInterval(timerInterval.current);
            // Time is up: Ensure visual matches and trigger round end
            setState(prev => ({ ...prev, timeLeft: 0 }));
            endRoundCallback();
        } else {
            setState(prev => ({ ...prev, timeLeft: prev.timeLeft - 1 }));
        }
      }, 1000);
    } else {
      clearInterval(timerInterval.current);
    }

    return () => clearInterval(timerInterval.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, state.isPaused, state.roundDuration, endRoundCallback]);

  // Point Gap Rule (20 points difference ends round)
  useEffect(() => {
    if (state.status === 'FIGHT') {
        const diff = Math.abs(state.redScore - state.blueScore);
        if (diff >= 20) {
            endRoundCallback();
        }
    }
  }, [state.redScore, state.blueScore, state.status, endRoundCallback]);

  const updateState = (updates) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const startMatch = (redName, blueName, duration = 60, matchType = 'single') => {
    updateState({
      status: 'FIGHT',
      matchId: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      redPlayer: redName || 'VĐV Đỏ',
      bluePlayer: blueName || 'VĐV Xanh',
      roundDuration: Number(duration),
      timeLeft: Number(duration),
      isPaused: true, 
      currentRound: 1,
      redScore: 0,
      blueScore: 0,
      redFaults: 0,
      blueFaults: 0,
      undoStack: [],
      roundsWonRed: 0,
      roundsWonBlue: 0,
      roundScores: [],
      matchType: matchType
    });
  };

  const setRoundDuration = (seconds) => {
    updateState({ roundDuration: seconds });
  };

  const toggleTimer = () => {
    updateState({ isPaused: !state.isPaused });
  };
  
  const resetTimer = () => {
    updateState({ 
        timeLeft: state.roundDuration,
        isPaused: true
    });
  };

  // Helper to push history
  const pushToUndoStack = (prevState) => {
      const snapshot = {
          redScore: prevState.redScore,
          blueScore: prevState.blueScore,
          redFaults: prevState.redFaults,
          blueFaults: prevState.blueFaults
      };
      // Keep only last 20 actions to prevent memory bloat
      const newStack = [...(prevState.undoStack || []), snapshot].slice(-20);
      return newStack;
  };

  const addPoints = (player, points) => {
    if (state.status !== 'FIGHT') return;

    setState(prev => {
        const newRedScore = player === 'red' ? prev.redScore + points : prev.redScore;
        const newBlueScore = player === 'blue' ? prev.blueScore + points : prev.blueScore;
        
        return {
            ...prev,
            undoStack: pushToUndoStack(prev),
            redScore: newRedScore,
            blueScore: newBlueScore
        };
    });
  };

  const addFault = (player) => {
    if (state.status !== 'FIGHT') return;
    
    // Check if fault causes end first
    if (player === 'red' && state.redFaults + 1 >= 5) {
        endRoundCallback('blue');
        return;
    }
    if (player === 'blue' && state.blueFaults + 1 >= 5) {
        endRoundCallback('red');
        return;
    }

    setState(prev => ({
        ...prev,
        undoStack: pushToUndoStack(prev),
        redFaults: player === 'red' ? prev.redFaults + 1 : prev.redFaults,
        blueScore: player === 'red' ? prev.blueScore + 1 : prev.blueScore,
        blueFaults: player === 'blue' ? prev.blueFaults + 1 : prev.blueFaults,
        redScore: player === 'blue' ? prev.redScore + 1 : prev.redScore,
    }));
  };

  const undoLastAction = () => {
      if (state.undoStack.length === 0) return;
      
      const lastSnapshot = state.undoStack[state.undoStack.length - 1];
      const newStack = state.undoStack.slice(0, -1);
      
      updateState({
          ...lastSnapshot,
          undoStack: newStack
      });
  };
  
  const deleteHistoryItem = (id) => {
      const newHistory = state.matchHistory.filter(h => h.id !== id);
      updateState({ matchHistory: newHistory });
  };

  const nextRound = () => {
    updateState({
      status: 'FIGHT',
      currentRound: state.currentRound + 1,
      timeLeft: state.roundDuration,
      isPaused: true,
      redScore: 0,
      blueScore: 0,
      redFaults: 0,
      blueFaults: 0,
      undoStack: []
    });
  };
  
  const resetMatch = () => {
      startMatch(state.redPlayer, state.bluePlayer, state.roundDuration, state.matchType);
  };
  
  const newMatch = () => {
      updateState({ status: 'SETUP', matchType: 'single' });
  }

  return {
    state,
    startMatch,
    setRoundDuration,
    toggleTimer,
    addPoints,
    addFault,
    undoLastAction,
    deleteHistoryItem,
    endRound: endRoundCallback,
    nextRound,
    resetMatch,
    newMatch,
    resetTimer,
    resolveDraw: (winner) => endRoundCallback(winner)
  };
};
