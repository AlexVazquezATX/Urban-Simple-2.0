// Seed script to create built-in checklist section types and items
// Run with: npx tsx scripts/seed-checklist-library.ts

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['error', 'warn'],
})

interface SectionTypeData {
  name: string
  nameEs: string
  code: string
  icon: string
  sortOrder: number
  items: Array<{
    text: string
    textEs: string
    frequency: 'daily' | 'weekly' | 'monthly'
    requiresPhoto: boolean
    priority: 'normal' | 'high'
  }>
}

const sectionTypes: SectionTypeData[] = [
  {
    name: 'Back of House (Kitchen)',
    nameEs: 'Cocina (Área de Preparación)',
    code: 'BOH',
    icon: 'ChefHat',
    sortOrder: 1,
    items: [
      {
        text: 'Sweep all floor areas including under equipment',
        textEs: 'Barrer todas las áreas del piso incluyendo debajo del equipo',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Mop floors with degreaser solution',
        textEs: 'Trapear pisos con solución desengrasante',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all food contact surfaces',
        textEs: 'Limpiar y sanitizar todas las superficies de contacto con alimentos',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'high',
      },
      {
        text: 'Sanitize prep tables and cutting boards',
        textEs: 'Sanitizar mesas de preparación y tablas de cortar',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'high',
      },
      {
        text: 'Wipe down all stainless steel surfaces',
        textEs: 'Limpiar todas las superficies de acero inoxidable',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize flat-top grill',
        textEs: 'Limpiar y sanitizar plancha',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'high',
      },
      {
        text: 'Clean inside and outside of ovens',
        textEs: 'Limpiar interior y exterior de hornos',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize dishwashing area',
        textEs: 'Limpiar y sanitizar área de lavado de platos',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean walk-in cooler shelves and floors',
        textEs: 'Limpiar estantes y pisos del refrigerador',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean mop sink and surrounding area',
        textEs: 'Limpiar fregadero de trapeador y área circundante',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Wipe down all kitchen equipment exteriors',
        textEs: 'Limpiar exteriores de todo el equipo de cocina',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean fryer baskets and filter oil',
        textEs: 'Limpiar canastas de freidora y filtrar aceite',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Remove and clean all equipment from prep stations',
        textEs: 'Retirar y limpiar todo el equipo de las estaciones de preparación',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and degrease exhaust hood and filters',
        textEs: 'Limpiar y desengrasar campana extractora y filtros',
        frequency: 'weekly',
        requiresPhoto: true,
        priority: 'high',
      },
      {
        text: 'Empty and sanitize grease traps',
        textEs: 'Vaciar y sanitizar trampas de grasa',
        frequency: 'weekly',
        requiresPhoto: false,
        priority: 'high',
      },
      {
        text: 'Clean and sanitize ice machine',
        textEs: 'Limpiar y sanitizar máquina de hielo',
        frequency: 'weekly',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all storage containers',
        textEs: 'Limpiar y sanitizar todos los contenedores de almacenamiento',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize garbage disposal',
        textEs: 'Limpiar y sanitizar triturador de basura',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all sinks',
        textEs: 'Limpiar y sanitizar todos los fregaderos',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Deep clean all kitchen equipment (monthly)',
        textEs: 'Limpieza profunda de todo el equipo de cocina (mensual)',
        frequency: 'monthly',
        requiresPhoto: true,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all kitchen walls',
        textEs: 'Limpiar y sanitizar todas las paredes de la cocina',
        frequency: 'weekly',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all kitchen ceilings',
        textEs: 'Limpiar y sanitizar todos los techos de la cocina',
        frequency: 'monthly',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all kitchen vents',
        textEs: 'Limpiar y sanitizar todas las rejillas de ventilación de la cocina',
        frequency: 'monthly',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all kitchen light fixtures',
        textEs: 'Limpiar y sanitizar todas las luminarias de la cocina',
        frequency: 'monthly',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all kitchen door handles',
        textEs: 'Limpiar y sanitizar todos los pomos de las puertas de la cocina',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
    ],
  },
  {
    name: 'Bathrooms',
    nameEs: 'Baños',
    code: 'BATHROOM',
    icon: 'Droplet',
    sortOrder: 2,
    items: [
      {
        text: 'Clean and sanitize all toilets',
        textEs: 'Limpiar y sanitizar todos los inodoros',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'high',
      },
      {
        text: 'Clean and sanitize all sinks and faucets',
        textEs: 'Limpiar y sanitizar todos los lavabos y grifos',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all mirrors',
        textEs: 'Limpiar y sanitizar todos los espejos',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Mop bathroom floors',
        textEs: 'Trapear pisos de baños',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all urinals',
        textEs: 'Limpiar y sanitizar todos los urinarios',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'high',
      },
      {
        text: 'Restock toilet paper',
        textEs: 'Reabastecer papel higiénico',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'high',
      },
      {
        text: 'Restock paper towels',
        textEs: 'Reabastecer toallas de papel',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'high',
      },
      {
        text: 'Restock soap dispensers',
        textEs: 'Reabastecer dispensadores de jabón',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'high',
      },
      {
        text: 'Clean and sanitize all door handles',
        textEs: 'Limpiar y sanitizar todos los pomos de las puertas',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all stall partitions',
        textEs: 'Limpiar y sanitizar todas las particiones de los cubículos',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all bathroom walls',
        textEs: 'Limpiar y sanitizar todas las paredes de los baños',
        frequency: 'weekly',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all bathroom ceilings',
        textEs: 'Limpiar y sanitizar todos los techos de los baños',
        frequency: 'monthly',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all bathroom vents',
        textEs: 'Limpiar y sanitizar todas las rejillas de ventilación de los baños',
        frequency: 'monthly',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all bathroom light fixtures',
        textEs: 'Limpiar y sanitizar todas las luminarias de los baños',
        frequency: 'monthly',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Empty and sanitize all trash receptacles',
        textEs: 'Vaciar y sanitizar todos los receptáculos de basura',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all baby changing stations',
        textEs: 'Limpiar y sanitizar todas las estaciones de cambio de pañales',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all hand dryers',
        textEs: 'Limpiar y sanitizar todos los secadores de manos',
        frequency: 'weekly',
        requiresPhoto: false,
        priority: 'normal',
      },
    ],
  },
  {
    name: 'Dining Room',
    nameEs: 'Comedor',
    code: 'DINING',
    icon: 'UtensilsCrossed',
    sortOrder: 3,
    items: [
      {
        text: 'Sweep all dining room floors',
        textEs: 'Barrer todos los pisos del comedor',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Mop all dining room floors',
        textEs: 'Trapear todos los pisos del comedor',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all tables',
        textEs: 'Limpiar y sanitizar todas las mesas',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'high',
      },
      {
        text: 'Clean and sanitize all chairs',
        textEs: 'Limpiar y sanitizar todas las sillas',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all booth seating',
        textEs: 'Limpiar y sanitizar todos los asientos de los reservados',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all windows and window sills',
        textEs: 'Limpiar y sanitizar todas las ventanas y alféizares',
        frequency: 'weekly',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all condiment stations',
        textEs: 'Limpiar y sanitizar todas las estaciones de condimentos',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all high chairs',
        textEs: 'Limpiar y sanitizar todas las sillas altas',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Empty and sanitize all trash receptacles',
        textEs: 'Vaciar y sanitizar todos los receptáculos de basura',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all dining room walls',
        textEs: 'Limpiar y sanitizar todas las paredes del comedor',
        frequency: 'weekly',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all dining room baseboards',
        textEs: 'Limpiar y sanitizar todos los zócalos del comedor',
        frequency: 'weekly',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all dining room light fixtures',
        textEs: 'Limpiar y sanitizar todas las luminarias del comedor',
        frequency: 'monthly',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all dining room ceiling fans',
        textEs: 'Limpiar y sanitizar todos los ventiladores de techo del comedor',
        frequency: 'monthly',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all dining room decorations',
        textEs: 'Limpiar y sanitizar todas las decoraciones del comedor',
        frequency: 'weekly',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all dining room door handles',
        textEs: 'Limpiar y sanitizar todos los pomos de las puertas del comedor',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all dining room railings',
        textEs: 'Limpiar y sanitizar todas las barandillas del comedor',
        frequency: 'weekly',
        requiresPhoto: false,
        priority: 'normal',
      },
    ],
  },
  {
    name: 'Patio / Outdoor',
    nameEs: 'Patio / Exterior',
    code: 'PATIO',
    icon: 'Sun',
    sortOrder: 4,
    items: [
      {
        text: 'Sweep all patio floors',
        textEs: 'Barrer todos los pisos del patio',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Mop all patio floors',
        textEs: 'Trapear todos los pisos del patio',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all outdoor tables',
        textEs: 'Limpiar y sanitizar todas las mesas al aire libre',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all outdoor chairs',
        textEs: 'Limpiar y sanitizar todas las sillas al aire libre',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all outdoor umbrellas',
        textEs: 'Limpiar y sanitizar todas las sombrillas al aire libre',
        frequency: 'weekly',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Empty and sanitize all outdoor trash receptacles',
        textEs: 'Vaciar y sanitizar todos los receptáculos de basura al aire libre',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all outdoor railings',
        textEs: 'Limpiar y sanitizar todas las barandillas al aire libre',
        frequency: 'weekly',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all outdoor light fixtures',
        textEs: 'Limpiar y sanitizar todas las luminarias al aire libre',
        frequency: 'monthly',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Remove debris from outdoor areas',
        textEs: 'Retirar escombros de las áreas al aire libre',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all outdoor planters',
        textEs: 'Limpiar y sanitizar todos los maceteros al aire libre',
        frequency: 'weekly',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all outdoor heaters',
        textEs: 'Limpiar y sanitizar todos los calentadores al aire libre',
        frequency: 'weekly',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all outdoor fans',
        textEs: 'Limpiar y sanitizar todos los ventiladores al aire libre',
        frequency: 'monthly',
        requiresPhoto: false,
        priority: 'normal',
      },
    ],
  },
  {
    name: 'Front of House',
    nameEs: 'Frente de la Casa',
    code: 'FOH',
    icon: 'Store',
    sortOrder: 5,
    items: [
      {
        text: 'Sweep entrance and lobby floors',
        textEs: 'Barrer pisos de entrada y vestíbulo',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Mop entrance and lobby floors',
        textEs: 'Trapear pisos de entrada y vestíbulo',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize front door and handles',
        textEs: 'Limpiar y sanitizar puerta principal y pomos',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all windows',
        textEs: 'Limpiar y sanitizar todas las ventanas',
        frequency: 'weekly',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize host stand',
        textEs: 'Limpiar y sanitizar puesto de anfitrión',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize waiting area seating',
        textEs: 'Limpiar y sanitizar asientos del área de espera',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Empty and sanitize all trash receptacles',
        textEs: 'Vaciar y sanitizar todos los receptáculos de basura',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all front of house walls',
        textEs: 'Limpiar y sanitizar todas las paredes del frente de la casa',
        frequency: 'weekly',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all front of house light fixtures',
        textEs: 'Limpiar y sanitizar todas las luminarias del frente de la casa',
        frequency: 'monthly',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all front of house decorations',
        textEs: 'Limpiar y sanitizar todas las decoraciones del frente de la casa',
        frequency: 'weekly',
        requiresPhoto: false,
        priority: 'normal',
      },
    ],
  },
  {
    name: 'Office / Break Room',
    nameEs: 'Oficina / Sala de Descanso',
    code: 'OFFICE',
    icon: 'Briefcase',
    sortOrder: 6,
    items: [
      {
        text: 'Sweep office and break room floors',
        textEs: 'Barrer pisos de oficina y sala de descanso',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Mop office and break room floors',
        textEs: 'Trapear pisos de oficina y sala de descanso',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all desks and work surfaces',
        textEs: 'Limpiar y sanitizar todos los escritorios y superficies de trabajo',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all office chairs',
        textEs: 'Limpiar y sanitizar todas las sillas de oficina',
        frequency: 'weekly',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize break room tables',
        textEs: 'Limpiar y sanitizar mesas de sala de descanso',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize break room chairs',
        textEs: 'Limpiar y sanitizar sillas de sala de descanso',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize microwave',
        textEs: 'Limpiar y sanitizar microondas',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize refrigerator',
        textEs: 'Limpiar y sanitizar refrigerador',
        frequency: 'weekly',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Empty and sanitize all trash receptacles',
        textEs: 'Vaciar y sanitizar todos los receptáculos de basura',
        frequency: 'daily',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all office windows',
        textEs: 'Limpiar y sanitizar todas las ventanas de la oficina',
        frequency: 'weekly',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all office walls',
        textEs: 'Limpiar y sanitizar todas las paredes de la oficina',
        frequency: 'weekly',
        requiresPhoto: false,
        priority: 'normal',
      },
      {
        text: 'Clean and sanitize all office light fixtures',
        textEs: 'Limpiar y sanitizar todas las luminarias de la oficina',
        frequency: 'monthly',
        requiresPhoto: false,
        priority: 'normal',
      },
    ],
  },
]

async function main() {
  console.log('🌱 Seeding checklist library (section types and items)...\n')

  try {
    // Check if section types already exist
    const existingTypes = await prisma.checklistSectionType.findMany({
      where: { isBuiltIn: true },
      include: {
        items: true,
      },
    })

    if (existingTypes.length > 0) {
      console.log(
        `⚠️  Found ${existingTypes.length} existing built-in section types.`
      )
      console.log('   Updating usageCount for existing items...\n')
      
      // Update existing items with proper usageCount
      for (const sectionType of existingTypes) {
        const sectionData = sectionTypes.find(st => st.code === sectionType.code)
        if (!sectionData) continue
        
        let itemIndex = 0
        for (const itemData of sectionData.items) {
          const existingItem = sectionType.items.find(
            item => item.text === itemData.text && item.isBuiltIn
          )
          
          if (existingItem) {
            let usageCount = 0
            
            // Check if it's sweeping or mopping
            const isSweepOrMop = itemData.text.toLowerCase().includes('sweep') || 
                                itemData.text.toLowerCase().includes('mop') ||
                                itemData.textEs.toLowerCase().includes('barrer') ||
                                itemData.textEs.toLowerCase().includes('trapear')
            
            if (isSweepOrMop) {
              usageCount = 1000 - (itemIndex * 10)
            } else {
              const frequencyMultiplier = {
                daily: 700,
                weekly: 500,
                monthly: 400,
              }[itemData.frequency] || 400
              
              const priorityBonus = itemData.priority === 'high' ? 200 : 0
              usageCount = frequencyMultiplier + priorityBonus - itemIndex
            }
            
            await prisma.checklistItemLibrary.update({
              where: { id: existingItem.id },
              data: { usageCount: Math.max(usageCount, 100) },
            })
            itemIndex++
          }
        }
      }
      
      console.log('✅ Updated usageCount for existing items!\n')
      return
    }

    let totalItems = 0

    for (const sectionData of sectionTypes) {
      console.log(`Creating section: ${sectionData.name}...`)

      const sectionType = await prisma.checklistSectionType.create({
        data: {
          name: sectionData.name,
          nameEs: sectionData.nameEs,
          code: sectionData.code,
          icon: sectionData.icon,
          sortOrder: sectionData.sortOrder,
          isBuiltIn: true,
          isActive: true,
          companyId: null, // Built-in items are not company-specific
        },
      })

      console.log(`  ✓ Created section type: ${sectionType.name}`)

      // Create items for this section
      // Calculate usageCount based on priority and frequency
      // Sweeping/mopping get highest priority (1000+)
      // Then: daily high priority (900+), daily normal (700+), weekly high (600+), weekly normal (500+), monthly (400+)
      let itemIndex = 0
      for (const itemData of sectionData.items) {
        let usageCount = 0
        
        // Check if it's sweeping or mopping (most common tasks)
        const isSweepOrMop = itemData.text.toLowerCase().includes('sweep') || 
                            itemData.text.toLowerCase().includes('mop') ||
                            itemData.textEs.toLowerCase().includes('barrer') ||
                            itemData.textEs.toLowerCase().includes('trapear')
        
        if (isSweepOrMop) {
          usageCount = 1000 - (itemIndex * 10) // Sweep/mop get 1000, 990, etc.
        } else {
          // Calculate based on frequency and priority
          const frequencyMultiplier = {
            daily: 700,
            weekly: 500,
            monthly: 400,
          }[itemData.frequency] || 400
          
          const priorityBonus = itemData.priority === 'high' ? 200 : 0
          
          usageCount = frequencyMultiplier + priorityBonus - itemIndex
        }
        
        await prisma.checklistItemLibrary.create({
          data: {
            sectionTypeId: sectionType.id,
            text: itemData.text,
            textEs: itemData.textEs,
            frequency: itemData.frequency,
            requiresPhoto: itemData.requiresPhoto,
            priority: itemData.priority,
            isBuiltIn: true,
            isActive: true,
            companyId: null, // Built-in items are not company-specific
            usageCount: Math.max(usageCount, 100), // Ensure minimum of 100
          },
        })
        totalItems++
        itemIndex++
      }

      console.log(`  ✓ Created ${sectionData.items.length} items`)
    }

    console.log(`\n✅ Successfully seeded ${sectionTypes.length} section types with ${totalItems} items!\n`)
  } catch (error) {
    console.error('❌ Error seeding checklist library:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })

