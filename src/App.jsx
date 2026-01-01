import { useState, useEffect, useRef } from 'react';
import { useMatchLogic } from './hooks/useMatchLogic';
import { useTournamentLogic } from './hooks/useTournamentLogic';
import { TournamentSetup, TournamentBracket, MatchDetailModal } from './components/TournamentView';
import './styles/index.css';
import './styles/App.css';
import './styles/timer.css';

function App() {
  const { 
    state, 
    startMatch, 
    toggleTimer, 
    addPoints, 
    addFault, 
    undoLastAction,
    deleteHistoryItem,
    endRound, 
    nextRound, 
    resetMatch, 
    newMatch, 
    resetTimer,
    resolveDraw
  } = useMatchLogic();
  
  // Local state for setup form
  const [mode, setMode] = useState('single'); // 'single' or 'tournament'
  const [setupRed, setSetupRed] = useState('');
  const [setupBlue, setSetupBlue] = useState('');
  const [setupTime, setSetupTime] = useState(60);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedMatchDetail, setSelectedMatchDetail] = useState(null);

  const {
      tournament,
      addAthlete,
      removeAthlete,
      generateBracket,
      startMatch: startTournamentMatch,
      resolveMatch,
      resetTournament,
      backToBracket,
      deleteTournamentHistory
  } = useTournamentLogic();

  const [showTournamentHistory, setShowTournamentHistory] = useState(false);

  const lastResolvedMatchId = useRef(null);

  // Robust Coordination: Watch match status and resolve tournament match
  useEffect(() => {
      if (state.status === 'MATCH_END' && state.matchType === 'tournament' && state.matchId && state.matchId !== lastResolvedMatchId.current) {
          lastResolvedMatchId.current = state.matchId;
          const score = `${state.roundsWonRed}-${state.roundsWonBlue}`;
          const roundScores = state.roundScores || [];
          
          // Resolve in tournament logic
          resolveMatch(state.winner, score, roundScores);
          
          // Show bracket after a short delay for celebration
          setTimeout(() => {
              newMatch();
          }, 2000);
      }
  }, [state.status, state.matchType, state.matchId, state.winner, state.roundsWonRed, state.roundsWonBlue, state.roundScores, resolveMatch, newMatch]);

  const handleTournamentMatchSelect = (rIdx, mIdx) => {
      const matchData = startTournamentMatch(rIdx, mIdx);
      if (matchData) {
          // Reset match logic state completely before starting
          newMatch(); 
          startMatch(matchData.red, matchData.blue, setupTime, 'tournament');
      }
  };

  const handleClearCache = () => {
      if (window.confirm('CẢNH BÁO: Hành động này sẽ xóa toàn bộ lịch sử trận đấu, sơ đồ giải đấu và các thiết lập hiện tại. Bạn có chắc chắn muốn xóa tất cả?')) {
          localStorage.clear();
          window.location.reload();
      }
  };

  // --- TOURNAMENT BRACKET SCREEN ---
  // Priority: If a tournament is active (bracket or finish), show it.
  if (tournament.status === 'BRACKET' || tournament.status === 'FINISHED' || tournament.status === 'MATCH_ACTIVE') {
      if (state.status !== 'SETUP') {
          // If a match is actually FIGHTING, we fall through to the match screen below
      } else {
          return (
              <div className="app-container setup-mode">
                  <TournamentBracket 
                    rounds={tournament.rounds}
                    onMatchSelect={handleTournamentMatchSelect}
                    onReset={resetTournament}
                    winner={tournament.winner}
                    onShowDetail={(match) => setSelectedMatchDetail(match)}
                  />
                  {selectedMatchDetail && (
                      <MatchDetailModal 
                        match={selectedMatchDetail} 
                        onClose={() => setSelectedMatchDetail(null)} 
                      />
                  )}
              </div>
          );
      }
  }

  // --- SETUP SCREEN ---
  if (state.status === 'SETUP') {
    return (
      <div className="app-container setup-mode">
        {showHistory ? (
           <HistoryView 
             history={state.matchHistory.filter(m => m.matchType === 'single')} 
             onClose={() => setShowHistory(false)} 
             onDelete={deleteHistoryItem}
           />
        ) : showTournamentHistory ? (
            <TournamentHistoryView 
                history={tournament.tournamentHistory}
                onClose={() => setShowTournamentHistory(false)}
                onDelete={deleteTournamentHistory}
            />
        ) : (
          <div className="setup-card animate-enter">
            <h1 className="title">Bảng Điểm Taekwondo</h1>

            <div className="mode-toggle">
                <button 
                    className={`btn-mode-tab ${mode === 'single' ? 'active' : ''}`}
                    onClick={() => setMode('single')}
                >
                    TRẬN ĐƠN
                </button>
                <button 
                    className={`btn-mode-tab ${mode === 'tournament' ? 'active' : ''}`}
                    onClick={() => setMode('tournament')}
                >
                    GIẢI ĐẤU
                </button>
            </div>
            
            {mode === 'single' ? (
                <>
                    <div className="setup-content-grid">
                        <div className="setup-fighter-card card-red">
                            <div className="card-icon">🔴</div>
                            <label>VĐV Đỏ</label>
                            <input 
                                value={setupRed} 
                                onChange={(e) => setSetupRed(e.target.value)} 
                                className="input-transparent"
                                placeholder="VĐV Đỏ"
                            />
                        </div>

                        <div className="vs-badge-large">VS</div>

                        <div className="setup-fighter-card card-blue">
                            <div className="card-icon">🔵</div>
                            <label>VĐV Xanh</label>
                            <input 
                                value={setupBlue} 
                                onChange={(e) => setSetupBlue(e.target.value)} 
                                className="input-transparent"
                                placeholder="VĐV Xanh"
                            />
                        </div>
                    </div>

                </>
            ) : (
                <TournamentSetup 
                    athletes={tournament.athletes}
                    onAdd={addAthlete}
                    onRemove={removeAthlete}
                />
            )}

            <div className="time-setup-row">
                <label>Thời gian hiệp (s)</label>
                <input 
                    type="number"
                    value={setupTime} 
                    onChange={(e) => setSetupTime(e.target.value)} 
                    className="input-time"
                    placeholder="60"
                />
            </div>

            <div className="setup-actions">
                {mode === 'single' ? (
                    <>
                        <button onClick={() => startMatch(setupRed, setupBlue, setupTime, 'single')} className="btn-primary-large">
                            BẮT ĐẦU
                        </button>
                        <button onClick={() => setShowHistory(true)} className="btn-secondary">
                            Lịch sử Trận đơn ({state.matchHistory?.filter(m => m.matchType === 'single').length || 0})
                        </button>
                    </>
                ) : (
                    <>
                        <button 
                            onClick={generateBracket} 
                            disabled={tournament.athletes.length < 2} 
                            className="btn-primary-large"
                        >
                            TẠO SƠ ĐỒ ĐẤU
                        </button>
                        <div className="setup-actions-row">
                            <button onClick={() => setShowTournamentHistory(true)} className="btn-secondary">
                                Lịch sử Giải đấu ({tournament.tournamentHistory?.length || 0})
                            </button>
                            <button onClick={() => setMode('single')} className="btn-secondary">
                                QUAY LẠI
                            </button>
                        </div>
                    </>
                )}
            </div>

            <div className="setup-footer-extra">
                <button onClick={handleClearCache} className="btn-clear-cache">
                    XÓA TẤT CẢ DỮ LIỆU
                </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- MATCH SCREEN ---
  const isRoundEnd = state.status === 'ROUND_END';
  const isMatchEnd = state.status === 'MATCH_END';
  // Allow scoring even when paused, as long as we are in FIGHT mode
  const scoringDisabled = state.status !== 'FIGHT';

  return (
    <div className="app-container match-mode">
      
      {/* Header */}
      <header className="match-header animate-enter">
        <div className="header-info">
           <div className="round-badge">HIỆP {state.currentRound}</div>
           <button 
            onClick={tournament.status === 'MATCH_ACTIVE' ? backToBracket : newMatch} 
            className="btn-quit"
           >
             Thoát
           </button>
        </div>
        
        {/* Timer */}
        <div className={`timer-display ${state.timeLeft <= 10 ? 'timer-warning' : ''}`}>
            {formatTime(state.timeLeft)}
            <div className="timer-controls">
                <button onClick={toggleTimer} className={`btn-timer-control ${state.isPaused ? 'paused' : 'running'}`}>
                    {state.isPaused ? '▶' : '⏸'}
                </button>
                <button onClick={resetTimer} className="btn-timer-reset" title="Đặt lại thời gian">
                    ↺
                </button>
            </div>
        </div>

        <div className="wins-tracker">
            <span className="wins-red">Đỏ: {state.roundsWonRed}</span>
            <span className="divider">|</span>
            <span className="wins-blue">Xanh: {state.roundsWonBlue}</span>
        </div>
      </header>

      {/* Main Fight Area */}
      <main className={`fight-area ${scoringDisabled ? 'matches-paused' : ''} animate-enter`}>
        
        {/* RED CARD */}
        <section className="fighter-card red">
          <div className="fighter-name">{state.redPlayer}</div>
          <div className="score-display">{state.redScore}</div>
          <div className="fault-tag">
             Gam-jeom: <strong>{state.redFaults}</strong>/5
          </div>
          
          <div className="controls-area">
            {[1, 2, 3, 4, 5].map(pts => (
              <button 
                key={pts} 
                onClick={() => addPoints('red', pts)} 
                disabled={scoringDisabled}
                className="btn-score"
              >
                +{pts}
              </button>
            ))}
            <button onClick={() => addFault('red')} disabled={scoringDisabled} className="btn-fault">
                Lỗi
            </button>
          </div>
        </section>

        {/* BLUE CARD */}
        <section className="fighter-card blue">
          <div className="fighter-name">{state.bluePlayer}</div>
          <div className="score-display">{state.blueScore}</div>
          <div className="fault-tag">
             Gam-jeom: <strong>{state.blueFaults}</strong>/5
          </div>
          
          <div className="controls-area">
            {[1, 2, 3, 4, 5].map(pts => (
              <button 
                key={pts} 
                onClick={() => addPoints('blue', pts)} 
                disabled={scoringDisabled}
                className="btn-score"
              >
                +{pts}
              </button>
            ))}
            <button onClick={() => addFault('blue')} disabled={scoringDisabled} className="btn-fault">
                Lỗi
            </button>
          </div>
        </section>
      </main>
      
      {/* Footer */}
      <footer className="match-footer animate-enter">
          <button 
            onClick={undoLastAction} 
            disabled={(!state.undoStack || state.undoStack.length === 0)} 
            className="btn-footer btn-undo"
          >
            ↩ Hoàn tác
          </button>
          <button onClick={() => endRound()} className="btn-footer btn-end">
            Kết thúc hiệp
          </button>
      </footer>

      {/* End Match Modal */}
      {isMatchEnd && (
         <div className="overlay-backdrop">
           <div className="modal-content">
              <h2 className="winner-text">{state.winner.toUpperCase() === 'RED' ? 'ĐỎ' : 'XANH'} CHIẾN THẮNG!</h2>
              <div className="setup-actions">
                 <button onClick={newMatch} className="btn-primary-large">TRẬN MỚI</button>
                 <button onClick={resetMatch} className="btn-secondary">Đấu lại</button>
              </div>
           </div>
         </div>
      )}

      {/* Draw Resolution Modal */}
      {state.status === 'PICK_WINNER' && (
          <DrawResolutionModal onSelect={resolveDraw} />
      )}

      {/* Round End Modal (only if NOT picking winner) */}
      {isRoundEnd && (
        <div className="overlay-backdrop">
          <div className="modal-content">
             <h2 className="winner-text" style={{ fontSize: '2rem' }}>
                {state.roundWinner === 'draw' ? 'HÒA' : `${state.roundWinner.toUpperCase() === 'RED' ? 'ĐỎ' : 'XANH'} THẮNG HIỆP ${state.currentRound}`}
             </h2>
             <div className="setup-actions">
                <button onClick={nextRound} className="btn-primary-large">HIỆP TIẾP THEO</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

const DrawResolutionModal = ({ onSelect }) => {
    return (
        <div className="overlay-backdrop">
            <div className="modal-content animate-enter">
                <h2 className="modal-title">Kết quả hòa</h2>
                <p className="modal-subtitle">Trọng tài vui lòng chọn người thắng hiệp này:</p>
                <div className="draw-actions">
                    <button className="btn-resolve card-red" onClick={() => onSelect('red')}>VĐV ĐỎ</button>
                    <button className="btn-resolve card-blue" onClick={() => onSelect('blue')}>VĐV XANH</button>
                </div>
            </div>
        </div>
    )
}

const HistoryView = ({ history, onClose, onDelete }) => {
    return (
        <div className="setup-card animate-enter">
            <h2 className="history-title">Lịch sử trận đấu</h2>
            <div className="history-list">
                {history.length === 0 && <p className="history-empty">Chưa có trận đấu nào được ghi lại.</p>}
                {history.map((h) => (
                    <div key={h.id} className={`history-item winner-${h.winner}`}>
                        <div className="history-main-row">
                            <div className="history-info">
                                <div className="history-date">
                                    {new Date(h.date).toLocaleDateString('vi-VN')}
                                </div>
                                <div className="history-players">
                                    <span className="text-red">{h.redPlayer}</span>
                                    <span className="vs-badge">vs</span>
                                    <span className="text-blue">{h.bluePlayer}</span>
                                </div>
                            </div>
                            <div className="history-result-group">
                                 <span className="history-score-large">{h.score}</span>
                                 {onDelete && (
                                    <button onClick={() => onDelete(h.id)} className="btn-delete-history">
                                        🗑
                                    </button>
                                 )}
                            </div>
                        </div>
                        
                        {h.roundScores && h.roundScores.length > 0 && (
                            <div className="history-rounds-grid">
                                {h.roundScores.map((r, idx) => (
                                    <div key={idx} className="round-stat-card">
                                        <div className="round-label">H{r.round}</div>
                                        <div className="round-score-nums">
                                            <span className="text-red">{r.red}</span>
                                            <span className="score-divider">-</span>
                                            <span className="text-blue">{r.blue}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <button onClick={onClose} className="btn-back">Quay lại</button>
        </div>
    )
}

const TournamentHistoryView = ({ history, onClose, onDelete }) => {
    return (
        <div className="setup-card animate-enter">
            <h2 className="title">Lịch sử Giải đấu</h2>
            <div className="history-list">
                {history.length === 0 && <p className="empty-text">Chưa có giải đấu nào được lưu.</p>}
                {history.map(item => (
                    <div key={item.id} className="history-item tournament-record">
                        <div className="history-header">
                            <span className="history-date">{item.date}</span>
                            <button onClick={() => onDelete(item.id)} className="btn-delete-history">Xóa</button>
                        </div>
                        <div className="tournament-result">
                            👑 Nhà vô địch: <strong>{item.winner?.name}</strong>
                        </div>
                        <div className="bracket-summary">
                            Sơ đồ đã lưu ({item.rounds?.length || 0} vòng)
                        </div>
                    </div>
                ))}
            </div>
            <button onClick={onClose} className="btn-back">QUAY LẠI</button>
        </div>
    );
};

export default App;
