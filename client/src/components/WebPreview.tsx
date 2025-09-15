import React, { useEffect, useRef, useState } from 'react';
import { WebContainer } from '@webcontainer/api';

interface WebPreviewProps {
  // Props will be added later, e.g., files to load, command to run
}

const WebPreview: React.FC<WebPreviewProps> = (props) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [webContainerInstance, setWebContainerInstance] = useState<WebContainer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Effect to boot WebContainer on component mount (example)
  useEffect(() => {
    const bootWebContainer = async () => {
      setIsLoading(true);
      setError(null);
      try {
        console.log('Booting WebContainer...');
        // This is where we'll initialize WebContainer
        // const wc = await WebContainer.boot();
        // setWebContainerInstance(wc);
        // console.log('WebContainer booted.');

        // Example: Placeholder logic, replace with actual WC interaction
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate loading
        // setPreviewUrl('about:blank'); // Set initial URL

      } catch (err) {
        console.error('WebContainer boot error:', err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
      }
    };

    // Boot automatically for now, later trigger via button/prop
    // bootWebContainer();

    // Cleanup function
    return () => {
      console.log('Tearing down WebContainer...');
      webContainerInstance?.teardown();
      setWebContainerInstance(null);
    };
  }, []); // Empty dependency array means run once on mount

  // TODO: Add functions to:
  // - Mount files into the WebContainer
  // - Run `npm install`
  // - Run `npm run dev`
  // - Listen for server ready event and get the URL
  // - Update `previewUrl` state

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h3>Web Preview (WASM - WebContainer)</h3>
      {/* Add controls here later (Run, Stop, etc.) */}
      {isLoading && <p>Loading WebContainer...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      <div style={{ flexGrow: 1, border: '1px solid #ccc', position: 'relative' }}>
        {previewUrl ? (
          <iframe
            ref={iframeRef}
            src={previewUrl}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Web Preview"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms" // Adjust sandbox as needed
          />
        ) : (
          <p style={{ padding: '1rem' }}>Preview will appear here once the server is running.</p>
        )}
      </div>
      {/* Maybe add a terminal output view here later */}
    </div>
  );
};

export default WebPreview; 