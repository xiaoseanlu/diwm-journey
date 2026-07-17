import "./refer-friend.css";

const ASSETS = {
  email: "images/refer-friend/email.svg",
  facebook: "images/refer-friend/facebook.svg",
  linkedin: "images/refer-friend/linkedin.svg",
  star: "images/refer-friend/star.svg",
} as const;

const TOP_EARNERS = [
  { name: "Cecilia", referrals: "10 friends referred", amount: "$500" },
  { name: "Trac", referrals: "9 friends referred", amount: "$450" },
  { name: "Grace", referrals: "8 friends referred", amount: "$400" },
] as const;

const SHARE_ACTIONS = [
  { id: "email", label: "Email", icon: ASSETS.email },
  { id: "facebook", label: "Facebook", icon: ASSETS.facebook },
  { id: "linkedin", label: "LinkedIn", icon: ASSETS.linkedin },
  { id: "star", label: "Share", icon: ASSETS.star },
] as const;

/** Refer a friend — Figma 1646:29558. */
export function ReferFriendScreen() {
  return (
    <div className="refer-friend etrade-flow--fade-in">
      <section className="refer-friend__hero" aria-label="Referral program">
        <h1 className="refer-friend__title">Chloe, earn $50 for every friend you refer</h1>

        <div className="refer-friend__stats">
          <p className="refer-friend__stats-label">Earned so far</p>
          <p className="refer-friend__stats-amount">$100</p>
          <p className="refer-friend__stats-note">From 2 friends who filed</p>
        </div>

        <div className="refer-friend__actions">
          <button type="button" className="refer-friend__btn refer-friend__btn--primary">
            Copy link
          </button>
          <button type="button" className="refer-friend__btn refer-friend__btn--secondary">
            Add to Apple Wallet
          </button>
        </div>

        <div className="refer-friend__share" role="group" aria-label="Share referral link">
          {SHARE_ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              className="refer-friend__share-btn"
              aria-label={action.label}
            >
              <img
                src={action.icon}
                alt=""
                className={`refer-friend__share-icon refer-friend__share-icon--${action.id}`}
              />
            </button>
          ))}
        </div>
      </section>

      <section className="refer-friend__leaderboard" aria-label="Top earners">
        <h2 className="refer-friend__leaderboard-title">Top earners</h2>
        <ul className="refer-friend__leaderboard-list">
          {TOP_EARNERS.map((earner) => (
            <li key={earner.name} className="refer-friend__earner">
              <div className="refer-friend__earner-copy">
                <p className="refer-friend__earner-name">{earner.name}</p>
                <p className="refer-friend__earner-meta">{earner.referrals}</p>
              </div>
              <span className="refer-friend__earner-badge">{earner.amount}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
