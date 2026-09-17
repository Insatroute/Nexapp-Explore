import './global.css';
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import { Provider } from './provider';

const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
});

// Plex Mono rather than the stack default: it is drawn as the same family as the
// body face, so a method name inside a sentence keeps the page's texture instead
// of switching to whatever monospace the machine happens to have.
const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
});

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} ${sans.className}`}
      suppressHydrationWarning
    >
      <body className="flex flex-col min-h-screen">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
