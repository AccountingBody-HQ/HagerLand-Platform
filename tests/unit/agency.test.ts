import { describe, expect, it } from 'vitest'
import { daysBetween, instructionFee, isHagerlandMarketed, STAGES_NEEDING_TERMS, STAGE_LABEL, INSTRUCTION_STAGES } from '@/lib/agency'
import { formatAppointment } from '@/lib/format'

describe('estate agency helpers (spec 26.5)', () => {
  it('fees: a percentage of the final price, or a fixed amount', () => {
    expect(instructionFee({ fee_type: 'percent', fee_percent: 2, fee_amount_etb: null }, 5_800_000)).toBe(116_000)
    expect(instructionFee({ fee_type: 'fixed', fee_percent: null, fee_amount_etb: 50_000 }, 5_800_000)).toBe(50_000)
    expect(instructionFee({ fee_type: null, fee_percent: null, fee_amount_etb: null }, 5_800_000)).toBeNull()
    expect(instructionFee({ fee_type: 'percent', fee_percent: 2, fee_amount_etb: null }, null)).toBeNull()
  })

  it('days on market and stage rules', () => {
    expect(daysBetween('2026-10-01T00:00:00Z', '2026-10-31T00:00:00Z')).toBe(30)
    expect(daysBetween('2026-10-31T00:00:00Z', '2026-10-01T00:00:00Z')).toBe(0)
    expect(STAGES_NEEDING_TERMS).toEqual(['instructed', 'live', 'under_offer', 'let_agreed', 'completed'])
    for (const s of INSTRUCTION_STAGES) expect(STAGE_LABEL[s]).toBeTruthy()
    expect(isHagerlandMarketed({ lister_type: 'hagerland' })).toBe(true)
    expect(isHagerlandMarketed({ lister_type: 'owner' })).toBe(false)
  })

  it('appointments are shown in Ethiopia time', () => {
    expect(formatAppointment('2026-11-02T07:30:00Z')).toBe('2 Nov 2026, 10:30 Ethiopia time')
    expect(formatAppointment(null)).toBe('')
  })
})
