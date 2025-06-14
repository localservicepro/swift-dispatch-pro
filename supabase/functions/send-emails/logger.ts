
export async function logEmail({
  supabase,
  type,
  toEmail,
  subject,
  status,
  externalId,
  errorMessage,
}: {
  supabase: any
  type: string
  toEmail: string
  subject: string
  status: string
  externalId?: string
  errorMessage?: string
}) {
  const { error } = await supabase.from('email_logs').insert({
    email_type: type,
    recipient_email: toEmail,
    subject,
    status,
    external_id: externalId,
    error_message: errorMessage,
    sent_at: new Date().toISOString(),
  })
  return error
}
