import "./home.css";
import { prototypes } from "./prototypes";
import type { Platform } from "./prototypes/registry";

const PLATFORM_LABELS: Record<Platform, string> = {
  web: "Web",
  mweb: "mWeb",
  ios: "iOS",
  android: "Android",
};

const PLATFORM_ORDER: Platform[] = ["web", "mweb", "ios", "android"];

export function Home() {
  const hasPrototypes = prototypes.length > 0;

  return (
    <div className="home">
      <div className="home__inner">
        <header className="home__header">
          <div className="home__brand">
            <span className="home__brand-dot" aria-hidden />
            <span className="home__brand-name">TurboTax Prototypes</span>
          </div>
          <span className="home__sku">Consumer Group · PM sandbox · build {__BUILD_SHA__}</span>
        </header>

        <section className="home__hero">
          <h1 className="home__title">TurboTax prototype library</h1>
          <p className="home__subtitle">
            Design-accurate prototypes built with CGDS tokens and components. Pick a flow to open.
          </p>
        </section>

        {hasPrototypes ? (
          <div className="home__grid">
            {prototypes.map((proto) => (
              <div key={proto.slug} className="home__card home__card--multi">
                <div className="home__card-label">{proto.section}</div>
                <h2 className="home__card-title">{proto.title}</h2>
                <p className="home__card-copy">{proto.description}</p>
                <div className="home__platform-row">
                  {PLATFORM_ORDER.map((platform) => {
                    const entry = proto.platforms[platform];
                    if (!entry) return null;
                    return (
                      <a
                        key={platform}
                        className="home__platform-btn"
                        href={`#/${entry.route}`}
                      >
                        {PLATFORM_LABELS[platform]}
                      </a>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="home__empty">
            <h2 className="home__empty-title">No prototypes yet</h2>
            <p className="home__empty-copy">
              Open this folder in Claude Code and run{" "}
              <code>/prototype</code> to build your first flow. The skill will
              scaffold a platform shell (Web, mWeb, iOS, or Android) pulled
              live from the CGDS Figma library, register the route, and add a
              card here.
            </p>
            <p className="home__empty-copy home__empty-copy--dim">
              New to the repo? Start with <code>README.md</code>. Skill docs
              live in <code>.claude/skills/prototype/SKILL.md</code>.
            </p>
          </div>
        )}

        <footer className="home__footer">
          Tokens and components sourced from{" "}
          <a href="./docs/cgds-catalog.md">docs/cgds-catalog.md</a>. Start a new prototype with{" "}
          <code>/prototype</code> in Claude Code (skill in{" "}
          <code>.claude/skills/prototype/</code>).
        </footer>
      </div>
    </div>
  );
}
