import { useState, useEffect } from 'react';

const STORAGE_KEY = 'tkd_tournament_state_v1';

const INITIAL_STATE = {
    status: 'SETUP', // SETUP, BRACKET, MATCH_ACTIVE, FINISHED
    athletes: [],    // [{ id, name }]
    rounds: [],      // [[{ id, player1, player2, winner, status: 'PENDING' | 'DONE' }]]
    currentMatch: null, // { roundIdx, matchIdx }
    tournamentHistory: [] // [{ id, date, bracket, winner }]
};

export const useTournamentLogic = () => {
    const [tournament, setTournament] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return INITIAL_STATE;
        const parsed = JSON.parse(saved);
        return {
            ...INITIAL_STATE,
            ...parsed,
            tournamentHistory: parsed.tournamentHistory || []
        };
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tournament));
    }, [tournament]);

    const addAthlete = (name) => {
        setTournament(prev => ({
            ...prev,
            athletes: [...prev.athletes, { id: Date.now() + Math.random(), name }]
        }));
    };

    const removeAthlete = (id) => {
        setTournament(prev => ({
            ...prev,
            athletes: prev.athletes.filter(a => a.id !== id)
        }));
    };

    const generateBracket = () => {
        const athletes = [...tournament.athletes];
        if (athletes.length < 2) return;

        // Shuffle athletes for random seeding
        for (let i = athletes.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [athletes[i], athletes[j]] = [athletes[j], athletes[i]];
        }

        // Calculate bracket size (next power of 2)
        const powerOf2 = Math.pow(2, Math.ceil(Math.log2(athletes.length)));
        const numByes = powerOf2 - athletes.length;
        const numR1Matches = (athletes.length - numByes) / 2;

        const rounds = [];
        let firstRound = [];

        const numSlots = powerOf2 / 2;
        let athleteIdx = 0;
        let matchesPlaced = 0;
        let byesPlaced = 0;

        for (let i = 0; i < numSlots; i++) {
            // Decide if this slot should be a match or a bye
            // We interleave matches and byes if possible to balance the bracket halves
            const shouldBeBye = (byesPlaced < numByes) && (i % 2 === 1 || matchesPlaced >= numR1Matches);

            if (shouldBeBye) {
                firstRound.push({
                    id: `R0B${byesPlaced}`,
                    player1: athletes[athleteIdx++],
                    player2: null,
                    winner: athletes[athleteIdx - 1],
                    status: 'DONE',
                    score: 'BYE'
                });
                byesPlaced++;
            } else {
                firstRound.push({
                    id: `R0M${matchesPlaced}`,
                    player1: athletes[athleteIdx++],
                    player2: athletes[athleteIdx++],
                    winner: null,
                    status: 'PENDING',
                    score: null
                });
                matchesPlaced++;
            }
        }
        rounds.push(firstRound);

        // Build subsequent rounds (2, 4, 8... spots)
        let currentSpots = firstRound.length;
        while (currentSpots > 1) {
            currentSpots /= 2;
            const nextRoundIdx = rounds.length;
            const nextRound = Array.from({ length: currentSpots }, (_, i) => ({
                id: `R${nextRoundIdx}M${i}`,
                player1: null,
                player2: null,
                winner: null,
                status: 'PENDING',
                score: null
            }));
            
            // Advance byes from previous round to this round's players
            const prevRound = rounds[rounds.length - 1];
            for (let i = 0; i < prevRound.length; i++) {
                if (prevRound[i].status === 'DONE' && prevRound[i].winner) {
                    const matchIdxInNextRound = Math.floor(i / 2);
                    const isPlayer1 = i % 2 === 0;
                    if (isPlayer1) {
                        nextRound[matchIdxInNextRound].player1 = prevRound[i].winner;
                    } else {
                        nextRound[matchIdxInNextRound].player2 = prevRound[i].winner;
                    }
                }
            }
            rounds.push(nextRound);
        }

        setTournament(prev => ({
            ...prev,
            rounds,
            status: 'BRACKET'
        }));
    };

    const startMatch = (roundIdx, matchIdx) => {
        const match = tournament.rounds[roundIdx][matchIdx];
        if (match.status === 'DONE' || !match.player1 || !match.player2) return null;
        
        setTournament(prev => ({ ...prev, status: 'MATCH_ACTIVE', currentMatch: { roundIdx, matchIdx } }));
        return { red: match.player1.name, blue: match.player2.name };
    };

    const resolveMatch = (winnerName, score, roundScores = []) => {
        if (!tournament.currentMatch) return;
        const { roundIdx, matchIdx } = tournament.currentMatch;
        const winner = winnerName === 'red' ? tournament.rounds[roundIdx][matchIdx].player1 : tournament.rounds[roundIdx][matchIdx].player2;

        setTournament(prev => {
            const newRounds = [...prev.rounds];
            
            // 1. Mark current match as done
            newRounds[roundIdx] = [...newRounds[roundIdx]];
            newRounds[roundIdx][matchIdx] = {
                ...newRounds[roundIdx][matchIdx],
                winner,
                score,
                roundScores,
                status: 'DONE'
            };

            // 2. Advance winner to next round
            const nextRoundIdx = roundIdx + 1;
            if (nextRoundIdx < newRounds.length) {
                const nextMatchIdx = Math.floor(matchIdx / 2);
                newRounds[nextRoundIdx] = [...newRounds[nextRoundIdx]];
                newRounds[nextRoundIdx][nextMatchIdx] = { ...newRounds[nextRoundIdx][nextMatchIdx] };
                
                if (matchIdx % 2 === 0) {
                    newRounds[nextRoundIdx][nextMatchIdx].player1 = winner;
                } else {
                    newRounds[nextRoundIdx][nextMatchIdx].player2 = winner;
                }
            }

            // Check if tournament is finished
            const isLastMatch = roundIdx === newRounds.length - 1;
            
            return {
                ...prev,
                rounds: newRounds,
                status: isLastMatch ? 'FINISHED' : 'BRACKET',
                currentMatch: null,
                winner: isLastMatch ? winner : null,
                tournamentHistory: isLastMatch ? [
                    {
                        id: Date.now() + Math.random().toString(36).substr(2, 5),
                        date: new Date().toLocaleString(),
                        winner: winner,
                        rounds: newRounds
                    },
                    ...prev.tournamentHistory
                ] : prev.tournamentHistory
            };
        });
    };

    const deleteTournamentHistory = (id) => {
        setTournament(prev => ({
            ...prev,
            tournamentHistory: prev.tournamentHistory.filter(h => h.id !== id)
        }));
    };

    const resetTournament = () => {
        setTournament(prev => ({
            ...INITIAL_STATE,
            athletes: prev.athletes, // Keep athletes
            tournamentHistory: prev.tournamentHistory // Keep history
        }));
    };

    const backToBracket = () => {
        setTournament(prev => ({ ...prev, status: 'BRACKET' }));
    }

    return {
        tournament,
        addAthlete,
        removeAthlete,
        generateBracket,
        startMatch,
        resolveMatch,
        deleteTournamentHistory,
        resetTournament,
        backToBracket
    };
};
