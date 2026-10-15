import { z } from 'zod'
import { emailSchema, nameSchema, passwordSchema, phoneSchema } from './common'

export const SIGNUP_INTENTS = ['looking', 'owner', 'agent', 'developer', 'professional', 'supplier'] as const
export type SignupIntent = (typeof SIGNUP_INTENTS)[number]

export const BUSINESS_INTENTS: SignupIntent[] = ['agent', 'developer', 'professional', 'supplier']

export const signupSchema = z.object({
  intent: z.enum(SIGNUP_INTENTS, { error: 'Choose what brings you to HagerLand' }),
  full_name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  terms: z.literal('on', { error: 'Please accept the Terms and Privacy Policy' }),
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password'),
})

export const magicLinkSchema = z.object({ email: emailSchema })

export const updatePasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: 'The passwords do not match', path: ['confirm'] })
