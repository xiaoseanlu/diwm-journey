import { useEffect, useState, type ReactNode } from "react";
import { Home } from "./Home";
import { HubBackButton } from "./HubBackButton";
import { prototypes } from "./prototypes";

function getHash(): string {
  return window.location.hash.replace(/^#\/?/, "");
}

function App() {
  const [hash, setHash] = useState<string>(getHash());

  useEffect(() => {
    const onHash = () => setHash(getHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  if (!hash) {
    return <Home />;
  }

  let bestMatch: { render: () => ReactNode; route: string } | null = null;

  for (const proto of prototypes) {
    for (const platform of Object.values(proto.platforms)) {
      if (!platform) continue;
      const route = platform.route;
      const matches =
        hash === route ||
        (route === "diwm-journey/mweb" && hash.startsWith(`${route}/`));
      if (matches && (!bestMatch || route.length > bestMatch.route.length)) {
        bestMatch = { render: platform.render, route };
      }
    }
  }

  if (bestMatch) {
    return (
      <>
        {bestMatch.render()}
        <HubBackButton />
      </>
    );
  }

  return <Home />;
}

export default App;
