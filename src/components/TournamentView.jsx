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

export const TournamentBracket = ({ rounds, onMatchSelect, onReset, winner }) => {
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
                            {round.map((match, mIdx) => (
                                <div 
                                    key={match.id} 
                                    className={`bracket-match status-${match.status}`}
                                    onClick={() => onMatchSelect(rIdx, mIdx)}
                                >
                                    <div className={`p-box ${match.winner?.id === match.player1?.id ? 'is-winner' : ''}`}>
                                        {match.player1?.name || (rIdx === 0 ? '---' : 'TBD')}
                                    </div>
                                    <div className="match-vs">
                                        {match.status === 'DONE' && match.score ? (
                                            <span className="match-result-score">{match.score}</span>
                                        ) : 'vs'}
                                    </div>
                                    <div className={`p-box ${match.winner?.id === match.player2?.id ? 'is-winner' : ''}`}>
                                        {match.player2?.name || (rIdx === 0 ? '---' : 'TBD')}
                                    </div>
                                </div>
                            ))}
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
