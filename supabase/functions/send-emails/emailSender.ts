
interface SendEmailParams {
  from: string
  to: string
  subject: string
  html: string
  resend: any
}

export async function sendEmail({ from, to, subject, html, resend }: SendEmailParams) {
  const { data, error } = await resend.emails.send({
    from,
    to: [to],
    subject,
    html,
  })
  return { data, error }
}
