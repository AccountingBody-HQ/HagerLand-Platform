'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/Layout'

/** The map is loaded only when shown (spec 19.2: dynamic import for the map). */
export const DynamicMap = dynamic(() => import('./LeafletMap'), { ssr: false, loading: () => <Skeleton className="h-[420px] w-full rounded-lg lg:h-[560px]" /> })
