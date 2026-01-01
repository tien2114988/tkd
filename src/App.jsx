import { useState } from 'react';
import { useMatchLogic } from './hooks/useMatchLogic';
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
    resetTimer
  } = useMatchLogic();
  
  // Local state for setup form
  const [setupRed, setSetupRed] = useState('VĐV Đỏ');
  const [setupBlue, setSetupBlue] = useState('VĐV Xanh');
  const [setupTime, setSetupTime] = useState(60);
  const [showHistory, setShowHistory] = useState(false);

  // --- SETUP SCREEN ---
  if (state.status === 'SETUP') {
    return (
      <div className="app-container setup-mode">
        {showHistory ? (
           <HistoryView 
             history={state.matchHistory} 
             onClose={() => setShowHistory(false)} 
             onDelete={deleteHistoryItem}
           />
        ) : (
          <div className="setup-card animate-enter">
            <h1 className="title">Bảng Điểm Taekwondo</h1>
            
            <div className="input-group group-red">
              <label>VĐV Đỏ</label>
              <input 
                value={setupRed} 
                onChange={(e) => setSetupRed(e.target.value)} 
                className="input-field red-theme"
                placeholder="Tên VĐV"
              />
            </div>
            
            <div className="vs-divider">VS</div>
            
            <div className="input-group group-blue">
              <label>VĐV Xanh</label>
              <input 
                value={setupBlue} 
                onChange={(e) => setSetupBlue(e.target.value)} 
                className="input-field blue-theme"
                placeholder="Tên VĐV"
              />
            </div>

            <div className="input-group" style={{ marginTop: '0.5rem' }}>
              <label>Thời gian hiệp (s)</label>
              <input 
                type="number"
                value={setupTime} 
                onChange={(e) => setSetupTime(e.target.value)} 
                className="input-field"
                placeholder="60"
              />
            </div>
            
            <div className="setup-actions">
                <button onClick={() => startMatch(setupRed, setupBlue, setupTime)} className="btn-primary-large">
                  BẮT ĐẦU
                </button>
                <button onClick={() => setShowHistory(true)} className="btn-ghost">
                  Lịch sử ({state.matchHistory.length})
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
  const scoringDisabled = state.isPaused;

  return (
    <div className="app-container match-mode">
      
      {/* Header */}
      <header className="match-header animate-enter">
        <div className="header-info">
           <div className="round-badge">HIỆP {state.currentRound}</div>
           <button onClick={newMatch} className="btn-quit">Thoát</button>
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

      {/* Overlays / Modals */}
      {(isRoundEnd || isMatchEnd) && (
        <div className="overlay-backdrop">
          <div className="modal-content">
            {isMatchEnd ? (
               <>
                 <h2 className="winner-text">{state.winner.toUpperCase() === 'RED' ? 'ĐỎ' : 'XANH'} CHIẾN THẮNG!</h2>
                 <div className="setup-actions">
                    <button onClick={resetMatch} className="btn-primary-large">ĐẤU LẠI</button>
                    <button onClick={newMatch} className="btn-ghost">Trận mới</button>
                 </div>
               </>
            ) : (
                <>
                 <h2 className="winner-text" style={{ fontSize: '2rem' }}>
                    {state.roundWinner === 'draw' ? 'HÒA' : `${state.roundWinner.toUpperCase() === 'RED' ? 'ĐỎ' : 'XANH'} THẮNG HIỆP ${state.currentRound}`}
                 </h2>
                 <div className="setup-actions">
                    <button onClick={nextRound} className="btn-primary-large">HIỆP TIẾP THEO</button>
                 </div>
               </>
            )}
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

const HistoryView = ({ history, onClose, onDelete }) => {
    return (
        <div className="setup-card animate-enter">
            <h2 style={{ marginBottom: '1rem' }}>Lịch sử trận đấu</h2>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {history.length === 0 && <p style={{ opacity: 0.5 }}>Chưa có trận đấu nào được ghi lại.</p>}
                {history.map((h) => (
                    <div key={h.id} style={{ 
                        padding: '1rem', 
                        background: 'white', 
                        borderRadius: '0.75rem', 
                        border: '1px solid #e5e7eb',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div>
                            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                {new Date(h.date).toLocaleDateString()}
                            </div>
                            <div style={{ fontWeight: 600 }}>
                                <span style={{ color: h.winner === 'red' ? '#ef4444' : 'inherit' }}>{h.redPlayer}</span>
                                <span style={{ padding: '0 0.5rem', opacity: 0.5 }}>vs</span>
                                <span style={{ color: h.winner === 'blue' ? '#3b82f6' : 'inherit' }}>{h.bluePlayer}</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                             <span style={{ fontWeight: 900, fontSize: '1.25rem' }}>{h.score}</span>
                             {onDelete && (
                                <button onClick={() => onDelete(h.id)} style={{ color: '#ef4444', opacity: 0.7 }}>
                                    🗑
                                </button>
                             )}
                        </div>
                    </div>
                ))}
            </div>
            <button onClick={onClose} className="btn-ghost" style={{ marginTop: '1rem' }}>Quay lại</button>
        </div>
    )
}

export default App;
