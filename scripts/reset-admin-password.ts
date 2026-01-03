// Script to reset admin password in Supabase
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config({ path: resolve(process.cwd(), '.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const adminEmail = 'alex@urbansimple.net'
const newPassword = 'UrbanSimple2024!' // Change this if you want a different password

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function resetPassword() {
  console.log('🔐 Resetting password for:', adminEmail)

  // Get the user
  const { data: users } = await supabase.auth.admin.listUsers()
  const user = users?.users.find(u => u.email === adminEmail)

  if (!user) {
    console.error('❌ User not found in Supabase auth')
    process.exit(1)
  }

  // Update password
  const { data, error } = await supabase.auth.admin.updateUserById(
    user.id,
    { password: newPassword }
  )

  if (error) {
    console.error('❌ Error updating password:', error.message)
    process.exit(1)
  }

  console.log('✅ Password reset successfully!')
  console.log('\n📧 Login credentials:')
  console.log('   Email:', adminEmail)
  console.log('   Password:', newPassword)
  console.log('\n⚠️  IMPORTANT: Change this password after first login!')
  console.log('\n🌐 Login at: http://localhost:3001/login')
}

resetPassword()
  .catch((e) => {
    console.error('❌ Failed:', e)
    process.exit(1)
  })
