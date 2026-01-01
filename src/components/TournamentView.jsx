import React, { useState } from 'react';

export const TournamentSetup = ({ athletes, onAdd, onRemove }) => {
    const [name, setName] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (name.trim()) {
            onAdd(name.trim());
            setName('');
        }
    };

    return (
        <div className="setup-card animate-enter tournament-setup">
            <h2 className="title">Quản lý Vận động viên</h2>
            
            <form onSubmit={handleSubmit} className="athlete-input-row">
                <input 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="Nhập tên VĐV..." 
                    className="input-transparent"
                />
                <button type="submit" className="btn-add-athlete">XÁC NHẬN</button>
            </form>

            <p className="hint-text">Nhấn "Xác nhận" hoặc "Enter" sau mỗi tên VĐV.</p>

            <div className="athlete-list">
                {athletes.length === 0 && <p className="empty-text">Chưa có VĐV nào.</p>}
                {athletes.map(a => (
                    <div key={a.id} className="athlete-item">
                        <span>{a.name}</span>
                        <button onClick={() => onRemove(a.id)} className="btn-remove">✕</button>
                    </div>
                ))}
            </div>

            {/* Actions are handled in App.jsx to avoid duplication */}
        </div>
    );
};

export const TournamentBracket = ({ rounds, onMatchSelect, onReset, winner, onShowDetail }) => {
    return (
        <div className="setup-card animate-enter bracket-view">
            <h2 className="title">Sơ đồ thi đấu</h2>
            
            {winner && (
                <div className="tournament-winner-banner animate-bounce">
                    👑 Nhà vô địch: <strong>{winner.name}</strong> 👑
                </div>
            )}

            <div className="bracket-container">
                {rounds.map((round, rIdx) => (
                    <div key={rIdx} className="bracket-round">
                        <h3 className="round-header">Vòng {rIdx + 1}</h3>
                        <div className="round-matches">
                            {round.map((match, mIdx) => {
                                const isBye = match.score === 'BYE';
                                const isDone = match.status === 'DONE';

                                return (
                                    <div 
                                        key={match.id} 
                                        className={`bracket-match status-${match.status} ${isBye ? 'is-bye' : ''}`}
                                        onClick={() => {
                                            if (isDone) {
                                                if (!isBye && onShowDetail) onShowDetail(match);
                                            } else {
                                                onMatchSelect(rIdx, mIdx);
                                            }
                                        }}
                                    >
                                        <div className={`p-box ${match.winner?.id === match.player1?.id && isDone ? 'is-winner' : ''}`}>
                                            {match.player1?.name || (rIdx === 0 ? '---' : 'TBD')}
                                        </div>
                                        <div className="match-vs">
                                            {isDone && match.score ? (
                                                <span className="match-result-score">{match.score}</span>
                                            ) : 'vs'}
                                        </div>
                                        <div className={`p-box ${match.winner?.id === match.player2?.id && isDone ? 'is-winner' : ''}`}>
                                            {match.player2?.name || (rIdx === 0 ? '---' : 'TBD')}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <div className="setup-actions">
                <button onClick={onReset} className="btn-secondary">HỦY GIẢI ĐẤU</button>
            </div>
        </div>
    );
};

export const MatchDetailModal = ({ match, onClose }) => {
    if (!match) return null;

    return (
        <div className="overlay-backdrop">
            <div className="modal-content animate-enter match-detail-modal">
                <h2 className="modal-title">Chi tiết trận đấu</h2>
                
                <div className="detail-players-header">
                    <div className="detail-player red">
                        <span className="player-label">ĐỎ</span>
                        <span className="player-name">{match.player1?.name}</span>
                    </div>
                    <div className="detail-vs-score">
                        <div className="final-score-large">{match.score}</div>
                        <div className="vs-label">VS</div>
                    </div>
                    <div className="detail-player blue">
                        <span className="player-label">XANH</span>
                        <span className="player-name">{match.player2?.name}</span>
                    </div>
                </div>

                <div className="detail-rounds-list">
                    {match.roundScores && match.roundScores.length > 0 ? (
                        match.roundScores.map((r, idx) => (
                            <div key={idx} className="detail-round-row">
                                <div className="detail-round-badge">HIỆP {r.round}</div>
                                <div className="detail-round-score">
                                    <span className="score-num red">{r.red}</span>
                                    <span className="score-dash">-</span>
                                    <span className="score-num blue">{r.blue}</span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="no-detail-text">Không có dữ liệu chi tiết hiệp đấu.</p>
                    )}
                </div>

                <div className="setup-actions">
                    <button onClick={onClose} className="btn-primary-large">ĐÓNG</button>
                </div>
            </div>
        </div>
    );
};
