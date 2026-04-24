import Image from 'next/image'
import { CONTACT } from '@/components/landing/landing-data'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-cream-200 bg-cream-50 pb-24 pt-10 md:pb-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <Image
            src="/images/Urban Simple Logos/Urban Simple Icon.png"
            alt="Urban Simple"
            width={40}
            height={40}
            className="h-10 w-10"
          />
          <div className="text-sm text-charcoal-600">
            <p className="font-semibold text-charcoal-900">Urban Simple LLC</p>
            <p>{CONTACT.addressLine1}, {CONTACT.addressLine2}</p>
          </div>
        </div>

        <div className="flex flex-col gap-1 text-sm text-charcoal-600 md:items-end">
          <a href={CONTACT.phoneHref} className="font-medium text-charcoal-900 hover:text-bronze-600">
            {CONTACT.phone}
          </a>
          <a href={CONTACT.emailHref} className="hover:text-bronze-600">
            {CONTACT.email}
          </a>
          <a href="https://urbansimple.net" className="hover:text-bronze-600">
            urbansimple.net
          </a>
        </div>
      </div>
      <div className="mx-auto mt-6 max-w-7xl px-4 text-xs text-charcoal-500 sm:px-6 lg:px-8">
        &copy; {year} Urban Simple LLC. All rights reserved.
      </div>
    </footer>
  )
}
