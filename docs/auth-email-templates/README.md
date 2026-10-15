# Supabase Auth email templates

Paste each file into **Supabase → Authentication → Emails → Templates** (one template per tab):

| Supabase template | File | Suggested subject |
|---|---|---|
| Confirm signup | `confirm-signup.html` | Confirm your HagerLand account |
| Magic Link | `magic-link.html` | Your HagerLand sign-in link |
| Reset Password | `reset-password.html` | Reset your HagerLand password |
| Change Email Address | `change-email.html` | Confirm your new HagerLand email |

The links use `{{ .RedirectTo }}`, which the site always sets to `<site>/auth/callback?next=…`,
so they work on previews and production alike.

Also in Supabase → Authentication:
- **URL Configuration**: Site URL `https://www.hagerland.com`; Redirect URLs `https://www.hagerland.com/**`
  and your Vercel preview pattern, e.g. `https://*-<team>.vercel.app/**`.
- **SMTP Settings**: use Resend (host `smtp.resend.com`, port 465, user `resend`, password = Resend API key,
  sender `hello@hagerland.com`) once hagerland.com is verified in Resend.
- **Email**: keep "Confirm email" switched on. Minimum password length: 10.
