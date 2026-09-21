import { useEffect } from 'react';
import type { AppProps } from 'next/app';
import { Geist } from 'next/font/google';
import { applyTheme, getTheme } from '@/lib/storage';
import '@/styles/globals.css';

const geist = Geist({ subsets: ['latin'] });

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    void getTheme().then((theme) => {
      applyTheme(theme);
    });

    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      const listener = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
        if (area === 'local' && changes.theme) {
          applyTheme((changes.theme.newValue as 'system' | 'light' | 'dark') ?? 'system');
        }
      };
      chrome.storage.onChanged.addListener(listener);
      return () => {
        chrome.storage.onChanged.removeListener(listener);
      };
    }
  }, []);

  return (
    <div className={geist.className}>
      <Component {...pageProps} />
    </div>
  );
}
