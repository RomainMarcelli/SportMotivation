import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

/**
 * Document HTML racine — **web uniquement** (Expo Router). Sert à :
 * - `viewport-fit=cover` : le contenu s'étend SOUS la notch/Dynamic Island (sinon le navigateur
 *   réserve cette zone en transparent → bande/« rectangle » au-dessus du header).
 * - fond `ink` full-bleed sur `html/body/#root` (zéro bande claire derrière la status bar).
 * - `ScrollViewStyleReset` : reset recommandé par Expo pour un scroll cohérent sur web.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: rootStyle }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const rootStyle = `
html, body, #root { background-color: #15100C; }
html, body { height: 100%; }
#root { display: flex; min-height: 100%; }
`;
