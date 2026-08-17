import type { AppProps } from 'next/app';
import { Geist } from 'next/font/google';
import '@/styles/globals.css';

const geist = Geist({ subsets: ['latin'] });

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={geist.className}>
      <Component {...pageProps} />
    </div>
  );
}
