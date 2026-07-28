"use client"
import { useRouter, useSearchParams } from 'next/navigation'

export default function RateTypeToggle({ rateType }: { rateType: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function switchType(type: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('type', type)
    router.push('/birrbank/banking/fx-rates?' + params.toString(), { scroll: false })
  }

  return (
    <div className="flex items-center gap-2 mt-3">
      {['transactional', 'cash'].map(type => (
        <button
          key={type}
          onClick={() => switchType(type)}
          className="text-xs font-bold rounded-full transition-all"
          style={{
            width: 120,
            padding: '6px 0',
            textAlign: 'center',
            textTransform: 'capitalize',
            background: rateType === type ? '#1C7C4C' : '#f1f5f9',
            color: rateType === type ? '#fff' : '#5B6472',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {type}
        </button>
      ))}
    </div>
  )
}
