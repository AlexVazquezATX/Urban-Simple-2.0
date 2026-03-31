// ============================================
// CONTACT INFO
// ============================================

export const CONTACT = {
  phone: '(800) 513-4157',
  phoneHref: 'tel:+18005134157',
  email: 'info@urbansimple.net',
  emailHref: 'mailto:info@urbansimple.net',
  address: '1413 West 6th Street, Austin, TX 78703',
  addressLine1: '1413 West 6th Street',
  addressLine2: 'Austin, TX 78703',
}

export const SOCIAL_LINKS = [
  { name: 'Facebook', href: '#', icon: 'facebook' },
  { name: 'Instagram', href: '#', icon: 'instagram' },
  { name: 'LinkedIn', href: '#', icon: 'linkedin' },
  { name: 'YouTube', href: '#', icon: 'youtube' },
  { name: 'X', href: '#', icon: 'x' },
] as const

// ============================================
// STATS
// ============================================

export const stats = [
  { value: '575+', label: 'Hospitality Clients', suffix: '' },
  { value: '10', label: 'Years Experience', suffix: '+' },
  { value: '98', label: 'Client Retention', suffix: '%' },
  { value: '24/7', label: 'Service Available', suffix: '' },
]

// ============================================
// TESTIMONIALS (real clients)
// ============================================

export const testimonials = [
  {
    quote: "I can't say enough good things about their responsiveness and willingness to collaborate with our team to find solutions. They are a true partner in our operation.",
    author: 'Zach Adams',
    role: 'General Manager',
    company: 'Kitchen United',
    rating: 5,
  },
  {
    quote: 'Since Urban Simple took over our cleaning, we achieved a 99 health inspection score. Their team is thorough, professional, and understands what food service facilities need.',
    author: 'Matt Luther',
    role: 'Facilities Manager',
    company: 'Facebook (Meta)',
    rating: 5,
  },
  {
    quote: "I'd give them a 10 out of 10. They are reliable, consistent, and their crew takes genuine pride in their work. I'd recommend them to anyone in the industry.",
    author: 'Mike Pottorff',
    role: 'Owner',
    company: 'Iron Cactus',
    rating: 5,
  },
  {
    quote: "Very accommodating and easy to work with. I would give them a 10 out of 10. They've been a great partner for our restaurant.",
    author: 'CK Chin',
    role: 'Owner',
    company: 'Wu Chow',
    rating: 5,
  },
]

// ============================================
// FAQ
// ============================================

export const faqItems = [
  {
    question: 'What should I look for when hiring a commercial cleaning company?',
    answer: 'Look for experience in your specific industry, proper insurance and certifications, references from similar businesses, and a willingness to customize their approach to your needs. A reputable company should be transparent about their processes, use safe and approved cleaning products, and provide documentation of their work.',
  },
  {
    question: 'What areas of my restaurant or hotel do you clean?',
    answer: 'We specialize in commercial kitchen deep cleaning, including hood systems, equipment degreasing, and floor care. We also service dining rooms, bathrooms, lobbies, common areas, and provide pressure washing and carpet cleaning services. Our programs are customized to cover exactly what your facility needs.',
  },
  {
    question: 'Do you work around our business hours?',
    answer: 'Absolutely. Most of our crews work overnight or during off-peak hours so there is zero disruption to your guests or operations. We coordinate closely with your management team to find the schedule that works best for your business.',
  },
  {
    question: 'Are your cleaning products safe for food service environments?',
    answer: 'Yes. We use EPA-approved, guest-safe, green cleaning products that meet all food service safety requirements. Our solutions are effective without harsh chemicals, protecting your guests, your staff, and the environment.',
  },
  {
    question: 'How quickly can you start service?',
    answer: 'After an initial walkthrough and custom proposal, most new clients are up and running within 5 to 7 business days. We take the time to understand your facility and standards before we start so we get it right from day one.',
  },
  {
    question: 'Do you provide documentation and quality reports?',
    answer: 'Yes. Every service includes digital checklists, photo documentation, and detailed reports. You will always know exactly what was done and to what standard. Our quality assurance process ensures consistency across every visit.',
  },
]

// ============================================
// CERTIFICATIONS
// ============================================

export const certifications = [
  { name: 'Inc. 5000 (2020)', image: '' },
  { name: 'Inc. 5000 (2022)', image: '' },
  { name: 'Inc. 5000 (2024)', image: '' },
  { name: 'BOMA Austin', image: '' },
  { name: 'Austin Business Journal', image: '' },
  { name: 'SAM.gov', image: '' },
  { name: 'Entrepreneurs Organization', image: '' },
]

// ============================================
// VALUE PROPOSITIONS (Why Us)
// ============================================

export const valueProps = [
  {
    title: 'Custom Cleaning Programs',
    description: 'Every facility is different. We design cleaning programs tailored to your space, your schedule, and your standards.',
    color: 'ocean' as const,
    metric: '500+',
    metricLabel: 'Properties customized',
  },
  {
    title: 'Green & Guest-Safe Products',
    description: 'EPA-approved cleaning solutions that protect your guests, your staff, and the environment. No harsh chemicals, no compromises.',
    color: 'sage' as const,
    metric: '100%',
    metricLabel: 'EPA-approved products',
  },
  {
    title: 'Uncompromising Quality Assurance',
    description: 'Digital checklists, photo documentation, and post-service reports. We measure what matters so you never have to wonder.',
    color: 'bronze' as const,
    metric: '99.8%',
    metricLabel: 'Client retention rate',
  },
  {
    title: 'Scale Without Worry',
    description: 'We handle the cleaning so you can scale your business. From one location to fifty, our systems grow with you.',
    color: 'terracotta' as const,
    metric: '1–50+',
    metricLabel: 'Locations supported',
  },
]
