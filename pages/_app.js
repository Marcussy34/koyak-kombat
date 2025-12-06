import "@/styles/globals.css";
import "tldraw/tldraw.css";
import BackgroundMusic from "@/components/BackgroundMusic";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <BackgroundMusic />
    </>
  );
}
