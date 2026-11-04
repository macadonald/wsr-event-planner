import { createClient } from '@/lib/supabase/server'
import GeneralSettings from '@/components/settings/general-settings'

export default async function GeneralSettingsPage() {
  const supabase = createClient()
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'recent_changes_hours')
    .single()

  const currentHours = parseInt(data?.value ?? '48', 10)

  return (
    <div>
      <p className="text-sm text-brown-400 mb-4">
        App-wide preferences.
      </p>
      <GeneralSettings currentHours={currentHours} />
    </div>
  )
}
