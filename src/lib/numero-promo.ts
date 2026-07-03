import { createClient } from '@supabase/supabase-js'

export async function getNextNumeroPromo(supabaseUrl: string, supabaseKey: string) {
  const supabase = createClient(supabaseUrl, supabaseKey)
  const annee = '26'

  const { data: compteur, error: fetchError } = await supabase
    .from('compteurs')
    .select('dernier_numero')
    .eq('annee', annee)
    .single()

  if (fetchError) throw fetchError

  const prochainIndex = compteur.dernier_numero + 1
  const prochainIndexStr = String(prochainIndex).padStart(3, '0')
  const numero = `${annee}/${prochainIndexStr}`

  const { error: updateError } = await supabase
    .from('compteurs')
    .update({ dernier_numero: prochainIndex })
    .eq('annee', annee)

  if (updateError) throw updateError

  return numero
}
