export default function RewardModal({ showReward, handleClaimReward }) {
  if (!showReward) return null;
  
  return (
    <div className="modal-backdrop" onClick={handleClaimReward}>
      <div className="reward-modal" onClick={(e) => e.stopPropagation()}>
        <div className="reward-icon">🏆</div>
        <h2>Норма выполнена!</h2>
        <p>Ты выпил свою норму воды. Так держать!</p>
        
        <div className="reward-diamonds">
          <span>✦ +1 Алмаз</span>
          <span>🔥 Стрик продлен</span>
        </div>
        
        <button className="primary-action" onClick={handleClaimReward}>
          Забрать награду
        </button>
      </div>
    </div>
  )
}