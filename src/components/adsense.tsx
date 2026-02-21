'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    adsbygoogle: any;
  }
}

interface AdsenseProps {
  'data-ad-client': string;
  'data-ad-slot': string;
  'data-ad-layout'?: string;
  'data-ad-format'?: string;
  'data-full-width-responsive'?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * A component to display a Google AdSense ad unit.
 * IMPORTANT: This component relies on the main AdSense script being included in the <head> of your document.
 * 
 * @param props - The props to pass to the AdSense ad unit.
 *   - data-ad-client: Your AdSense publisher ID (e.g., "ca-pub-XXXXXXXXXXXXXXXX").
 *   - data-ad-slot: The ID of the ad unit to display.
 *   - className: Optional classes for the <ins> element.
 *   - style: Optional inline styles for the <ins> element.
 * 
 * @example
 * <Adsense
 *   data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
 *   data-ad-slot="1234567890"
 *   data-ad-format="auto"
 *   data-full-width-responsive="true"
 * />
 */
export function Adsense(props: AdsenseProps) {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error(err);
    }
  }, []);

  return (
    <ins
      className={props.className || "adsbygoogle"}
      style={props.style || { display: 'block' }}
      data-ad-client={props['data-ad-client']}
      data-ad-slot={props['data-ad-slot']}
      data-ad-layout={props['data-ad-layout']}
      data-ad-format={props['data-ad-format']}
      data-full-width-responsive={props['data-full-width-responsive']}
    ></ins>
  );
}
