'use server'

/** Admin area these actions belong to (owner only: the area is not in any staff role's list). */
const AREA = '/roodber8/supply/payment-methods'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { adminActor, assertAdmin, assertOwner, audit } from '@/lib/admin/guard'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { paymentMethodSchema } from '@/lib/supply/payment-methods'
import { listPaymentMethods } from '@/lib/supply/payment-methods-data'

type Msg = ActionResult<{ message: string }>

function refresh() {
  revalidatePath('/roodber8/supply/payment-methods')
  revalidatePath('/roodber8/supply/switches')
}

/** Owner: add a payment method (active, at the end of the list). */
export async function createPaymentMethodAction(input: { name: string; instructions: string }): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  const parsed = paymentMethodSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the payment method.')
  const methods = await listPaymentMethods()
  const sortOrder = methods.reduce((max, m) => Math.max(max, m.sortOrder), -1) + 1
  const { data, error } = await getAdminSupabase()
    .from('supply_payment_methods')
    .insert({ name: parsed.data.name, instructions: parsed.data.instructions, sort_order: sortOrder, created_by: (await adminActor()).slice(0, 120) })
    .select('id')
    .single()
  if (error || !data) return fail('Could not save the payment method.')
  await audit('supply.payment_method.created', { type: 'payment_method', id: data.id, label: parsed.data.name }, { name: parsed.data.name, instructions: parsed.data.instructions })
  refresh()
  return ok({ message: 'Payment method added.' })
}

/** Owner: change a method's name or instructions. */
export async function updatePaymentMethodAction(id: string, input: { name: string; instructions: string }): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  if (!z.uuid().safeParse(id).success) return fail('Payment method not found.')
  const parsed = paymentMethodSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the payment method.')
  const before = (await listPaymentMethods()).find((m) => m.id === id)
  if (!before) return fail('Payment method not found.')
  const { error } = await getAdminSupabase().from('supply_payment_methods').update({ name: parsed.data.name, instructions: parsed.data.instructions }).eq('id', id)
  if (error) return fail('Could not save the payment method.')
  await audit('supply.payment_method.updated', { type: 'payment_method', id, label: parsed.data.name }, { from: { name: before.name, instructions: before.instructions }, to: parsed.data })
  refresh()
  return ok({ message: 'Payment method saved.' })
}

/** Owner: show or hide a method for customers ("remove" = inactive; methods are never deleted). */
export async function setPaymentMethodActiveAction(id: string, active: boolean): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  if (!z.uuid().safeParse(id).success || typeof active !== 'boolean') return fail('Payment method not found.')
  const before = (await listPaymentMethods()).find((m) => m.id === id)
  if (!before) return fail('Payment method not found.')
  if (before.active === active) return ok({ message: active ? 'Already active.' : 'Already inactive.' })
  const { error } = await getAdminSupabase().from('supply_payment_methods').update({ active }).eq('id', id)
  if (error) return fail('Could not save the payment method.')
  await audit(active ? 'supply.payment_method.activated' : 'supply.payment_method.deactivated', { type: 'payment_method', id, label: before.name })
  refresh()
  return ok({ message: active ? 'Payment method is active.' : 'Payment method is no longer shown to customers.' })
}

/** Owner: move a method one place up or down (renumbers the whole list 0, 1, 2 …). */
export async function movePaymentMethodAction(id: string, direction: 'up' | 'down'): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  if (!z.uuid().safeParse(id).success || !['up', 'down'].includes(direction)) return fail('Payment method not found.')
  const methods = await listPaymentMethods()
  const i = methods.findIndex((m) => m.id === id)
  if (i < 0) return fail('Payment method not found.')
  const j = direction === 'up' ? i - 1 : i + 1
  if (j < 0 || j >= methods.length) return ok({ message: 'Already in place.' })
  const order = methods.map((m) => m.id)
  ;[order[i], order[j]] = [order[j], order[i]]
  const db = getAdminSupabase()
  for (const [index, mid] of order.entries()) {
    const current = methods.find((m) => m.id === mid)
    if (current && current.sortOrder === index) continue
    const { error } = await db.from('supply_payment_methods').update({ sort_order: index }).eq('id', mid)
    if (error) return fail('Could not save the order.')
  }
  await audit('supply.payment_method.reordered', { type: 'payment_method', id, label: methods[i].name }, { direction, order })
  refresh()
  return ok({ message: 'Order saved.' })
}
