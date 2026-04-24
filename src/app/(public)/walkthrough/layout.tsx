import Script from 'next/script'
import type { Metadata } from 'next'

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID
const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID

export const metadata: Metadata = {
  title: 'Commercial Cleaning for Austin Restaurants and Hotels | Urban Simple',
  description:
    "Urban Simple handles overnight and turn-day cleaning for Austin's food and beverage and hospitality venues. Inc. 5000 three times. Book a free walkthrough.",
  alternates: {
    canonical: 'https://urbansimple.net/walkthrough',
  },
  openGraph: {
    type: 'website',
    url: 'https://urbansimple.net/walkthrough',
    title: 'Commercial Cleaning for Austin Restaurants and Hotels | Urban Simple',
    description:
      "Urban Simple handles overnight and turn-day cleaning for Austin's food and beverage and hospitality venues. Inc. 5000 three times. Book a free walkthrough.",
    siteName: 'Urban Simple',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Commercial Cleaning for Austin Restaurants and Hotels | Urban Simple',
    description:
      "Urban Simple handles overnight and turn-day cleaning for Austin's food and beverage and hospitality venues. Inc. 5000 three times. Book a free walkthrough.",
  },
  robots: { index: true, follow: true },
}

export default function WalkthroughLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {META_PIXEL_ID && (
        <>
          <Script
            id="meta-pixel"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${META_PIXEL_ID}');
                fbq('track', 'PageView');
              `,
            }}
          />
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              alt=""
              src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
            />
          </noscript>
        </>
      )}

      {GA4_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
            strategy="afterInteractive"
          />
          <Script
            id="ga4-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA4_ID}');
              `,
            }}
          />
        </>
      )}

      {children}
    </>
  )
}
