import type { Metadata } from "next";
import { Theme } from '@radix-ui/themes'
import '@radix-ui/themes/styles.css'
import "./globals.css";
import SessionProvider from '@/components/providers/SessionProvider'
import FormToastProvider from '@/components/ui/FormToastProvider'

const removeInjectedFormAttributes = `
  (() => {
    const attribute = "fdprocessedid";

    const clean = (root) => {
      if (root.nodeType !== Node.ELEMENT_NODE) return;
      if (root.hasAttribute(attribute)) root.removeAttribute(attribute);
      root.querySelectorAll("[" + attribute + "]").forEach((element) => {
        element.removeAttribute(attribute);
      });
    };

    clean(document.documentElement);

    new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes") {
          mutation.target.removeAttribute(attribute);
          continue;
        }

        mutation.addedNodes.forEach(clean);
      }
    }).observe(document.documentElement, {
      attributes: true,
      attributeFilter: [attribute],
      childList: true,
      subtree: true,
    });
  })();
`;

export const metadata: Metadata = {
  title: "Yaku - Sistema de Riego Inteligente",
  description: "Sistema de riego inteligente para Lima, Perú",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className="h-full antialiased"
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: removeInjectedFormAttributes }} />
      </head>
      <body className="min-h-full flex flex-col">
        <SessionProvider>
          <Theme appearance="dark">
            {children}
            <FormToastProvider />
          </Theme>
        </SessionProvider>
      </body>
    </html>
  );
}
