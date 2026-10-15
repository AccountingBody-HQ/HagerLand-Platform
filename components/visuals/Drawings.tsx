import type { CSSProperties, ReactNode, SVGProps } from 'react'
import { cn } from '@/lib/cn'

/**
 * HagerLand's original line drawings ("drawn, not photographed", design round 2). Architectural elevations, plans and
 * sections drawn for HagerLand: no real building is copied. Lines use currentColor, so the colour comes from the
 * parent (gold on forest). All drawings are decorative (aria-hidden); the text next to them carries the meaning.
 * Elements with pathLength="1" draw themselves once in the hero (see .hl-draw in globals.css).
 */
function Svg({ viewBox, className, children, ...rest }: { viewBox: string; className?: string; children: ReactNode } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox={viewBox} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={cn('block h-auto w-full', className)} {...rest}>
      {children}
    </svg>
  )
}

/** A grid of window openings as one path: columns × rows of w×h rectangles from (x, y), with gaps. */
function windows(x: number, y: number, cols: number, rows: number, w: number, h: number, gx: number, gy: number): string {
  let d = ''
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) d += `M${x + c * (w + gx)} ${y + r * (h + gy)}h${w}v${h}h${-w}Z`
  return d
}

/** Hero: an imagined Addis Ababa skyline elevation on a ground line, the Entoto ridge behind, a crane at work. */
export function SkylineDrawing({ className, animate }: { className?: string; animate?: boolean }) {
  const p = { pathLength: 1 }
  return (
    <Svg viewBox="0 0 720 440" className={cn(animate && 'hl-draw', className)} strokeWidth={1.25}>
      {/* Ridge behind the city */}
      <path {...p} style={{ '--d': '0s' } as CSSProperties} opacity={0.45} d="M0 262c46-14 86-30 132-26s70 22 110 12 70-40 118-44 74 26 120 22 82-34 128-30 70 24 112 18" />
      {/* Slender tower with a crown and fins */}
      <g style={{ '--d': '0.15s' } as CSSProperties}>
        <path {...p} d="M72 404V132l40-24 40 24v272" />
        <path {...p} d="M112 108V70M104 82h16" />
        <path {...p} opacity={0.7} d="M84 150v246M98 140v256M112 136v260M126 140v256M140 150v246" />
        <path {...p} opacity={0.55} d={Array.from({ length: 12 }, (_, i) => `M72 ${172 + i * 20}h80`).join('')} />
      </g>
      {/* Mid-rise apartment block with balconies */}
      <g style={{ '--d': '0.35s' } as CSSProperties}>
        <path {...p} d="M172 404V214h168v190" />
        <path {...p} d="M166 214h180M172 226h168" />
        <path {...p} opacity={0.8} d={windows(186, 240, 5, 5, 18, 22, 12, 9)} />
        <path {...p} opacity={0.6} d={Array.from({ length: 5 }, (_, i) => `M182 ${264 + i * 31}h148`).join('')} />
        <path {...p} d="M240 404v-30h32v30" />
      </g>
      {/* Frame under construction */}
      <g style={{ '--d': '0.6s' } as CSSProperties}>
        <path {...p} d="M364 404V268M400 404V268M436 404V268M472 404V300" />
        <path {...p} d="M358 404h120M358 368h120M358 334h120M358 300h120M358 268h84" />
        <path {...p} opacity={0.6} d="M364 368l36-34M400 368l36-34M436 368l36-34M364 334l36-34M400 334l36-34" />
        <path {...p} opacity={0.8} d="M372 268v-10M392 268v-10M412 268v-10M432 268v-10" />
      </g>
      {/* Tower crane */}
      <g style={{ '--d': '0.8s' } as CSSProperties}>
        <path {...p} d="M506 404V108M520 404V108" />
        <path {...p} opacity={0.65} d={Array.from({ length: 13 }, (_, i) => `M506 ${404 - i * 22}l14-22`).join('') + Array.from({ length: 14 }, (_, i) => `M506 ${404 - i * 22}h14`).join('')} />
        <path {...p} d="M396 108h244M396 96h244M506 108l7-34 7 34" />
        <path {...p} opacity={0.65} d={Array.from({ length: 20 }, (_, i) => `M${400 + i * 12} 108l6-12`).join('')} />
        <path {...p} d="M612 108v18h22v-18" />
        <path {...p} d="M436 108v92M430 200h12l-6 8" />
      </g>
      {/* Villa with a pitched roof behind its compound wall */}
      <g style={{ '--d': '1s' } as CSSProperties}>
        <path {...p} d="M566 404v-64h118v64" />
        <path {...p} d="M556 344l69-46 69 46" />
        <path {...p} opacity={0.8} d="M582 356h22v20h-22zM646 356h22v20h-22zM614 404v-34h20v34" />
        <path {...p} opacity={0.7} d="M540 404v-26h170v26M600 378v-6M650 378v-6" />
      </g>
      {/* Eucalyptus trees */}
      <g style={{ '--d': '1.15s' } as CSSProperties} opacity={0.85}>
        <path {...p} d="M160 404v-46M160 372c-10-8-14-26-6-40s14-16 14-16 10 10 8 28-8 22-16 28" />
        <path {...p} d="M694 404v-40M694 376c-8-8-12-22-5-34s12-14 12-14 9 9 7 25-6 18-14 23" />
      </g>
      {/* Ground line, level marker and dimension line */}
      <g style={{ '--d': '0s' } as CSSProperties}>
        <path {...p} d="M0 404h720" />
        <path {...p} opacity={0.7} d="M72 424h268M72 418v12M340 418v12M172 418v12M84 424l-6 3m6-3-6-3M328 424l6 3m-6-3 6-3" />
        <path {...p} opacity={0.7} d="M30 132h30M38 124l8 8 8-8" />
      </g>
    </Svg>
  )
}

/** Buy, sell and rent: a two-bedroom apartment floor plan with door swings, furniture and dimension lines. */
export function FloorPlanDrawing({ className }: { className?: string }) {
  return (
    <Svg viewBox="0 0 520 400" className={className} strokeWidth={1.25}>
      {/* External walls (double line) with window openings */}
      <path d="M60 60h400v280H60zM68 68h384v264H68z" />
      <path opacity={0.8} d="M120 60v8M180 60v8M120 64h60M300 60v8M370 60v8M300 64h70M452 140h8M452 200h8M456 140v60M60 120h8M60 190h8M64 120v70M150 332v8M220 332v8M150 336h70M330 332v8M390 332v8M330 336h60" />
      {/* Internal walls with door openings */}
      <path d="M248 68v92M248 196v136M256 68v92M256 196v136" />
      <path d="M256 210h80M372 210h80M256 218h80M372 218h80" />
      <path d="M68 230h60M164 230h84M68 238h60M164 238h84" />
      {/* Door swings */}
      <path opacity={0.75} d="M248 160h-34M214 160a34 34 0 0 1 34 36" />
      <path opacity={0.75} d="M336 210v-34M336 176a34 34 0 0 1 36 34" />
      <path opacity={0.75} d="M128 230v34M128 264a36 36 0 0 0 36-34" />
      <path opacity={0.75} d="M232 340v-30M232 310a30 30 0 0 1 30 30" />
      {/* Living room: sofa, low table, rug */}
      <path opacity={0.7} d="M300 260h120v24H300zM300 260v56h14v-32h106M398 290h22v26h-22zM318 300h60v20h-60z" />
      {/* Kitchen counter, sink and hob */}
      <path opacity={0.7} d="M76 248h24v76H76zM76 248h88v20H76zM84 290a7 7 0 1 0 14 0 7 7 0 1 0-14 0M114 254h12v8h-12zM138 254h12v8h-12z" />
      {/* Dining table with four chairs */}
      <path opacity={0.7} d="M176 286h46v30h-46zM184 278h10v6h-10zM204 278h10v6h-10zM184 318h10v6h-10zM204 318h10v6h-10z" />
      {/* Bedrooms: beds with pillows, wardrobe */}
      <path opacity={0.7} d="M96 92h80v100H96zM104 100h28v16h-28zM140 100h28v16h-28zM96 128h80" />
      <path opacity={0.7} d="M330 84h74v96h-74zM338 92h58v14h-58zM330 120h74M424 84h20v96h-20z" />
      {/* Bathroom: bath and basin */}
      <path opacity={0.7} d="M196 78h44v30h-44zM202 84h32v18h-32zM200 200a12 9 0 1 0 24 0 12 9 0 1 0-24 0" />
      {/* Dimension lines */}
      <path opacity={0.65} d="M60 34h400M60 28v12M460 28v12M256 28v12M66 34l-6 3m6-3-6-3M454 34l6 3m-6-3 6-3" />
      <path opacity={0.65} d="M34 60v280M28 60h12M28 340h12M28 234h12M34 66l3-6m-3 6-3-6M34 334l3 6m-3-6-3 6" />
      {/* North arrow */}
      <path opacity={0.75} d="M486 372l8-28 8 28-8-6zM494 344v-8" />
    </Svg>
  )
}

/** Build and improve: a section through a G+2 house under construction, with footings, stair, scaffold and crane hook. */
export function SectionDrawing({ className }: { className?: string }) {
  return (
    <Svg viewBox="0 0 520 400" className={className} strokeWidth={1.25}>
      {/* Ground and footings */}
      <path d="M20 330h480" />
      <path opacity={0.55} d="M30 342l12-12M60 342l12-12M90 342l12-12M330 342l12-12M370 342l12-12M410 342l12-12M450 342l12-12M480 342l12-12" />
      <path d="M118 330v28h-20v14h64v-14h-20v-28M258 330v28h-20v14h64v-14h-20v-28M398 330v28h-20v14h64v-14h-20v-28" />
      {/* Columns */}
      <path d="M122 330V110M138 330V110M262 330V110M278 330V110M402 330V178M418 330V178" />
      {/* Floor slabs (ground, first, second, roof under way) */}
      <path d="M100 254h340M100 262h340M100 178h340M100 186h340M100 102h196M100 110h196" />
      {/* Rebar waiting above the unfinished bay */}
      <path opacity={0.85} d="M406 178v-22M412 178v-22M418 178v-22M402 160h18" />
      {/* Stair between ground and first floor */}
      <path opacity={0.8} d="M300 330v-10h14v-10h14v-10h14v-10h14v-10h14v-10h14v-10h14v-12h16M300 330l124-68" />
      {/* Openings: door and windows */}
      <path opacity={0.8} d="M160 330v-52h34v52M174 304h6M310 230h40v-26h-40zM160 230h40v-26h-40zM160 154h40v-26h-40zM310 154h40v-26h-40z" />
      {/* Scaffold on the left with braces */}
      <path opacity={0.75} d="M60 330V96M84 330V96M60 330h24M60 262h24M60 186h24M60 110h24M60 330l24-68M60 262l24-76M60 186l24-76M84 330l-24-68M84 262l-24-76" />
      {/* Crane hook and load */}
      <path opacity={0.85} d="M350 20v60M342 80h16l-8 10zM330 98h40v14h-40z" />
      {/* Level marks */}
      <path opacity={0.7} d="M456 254h28M462 246l8 8 8-8M456 178h28M462 170l8 8 8-8M456 102h28M462 94l8 8 8-8" />
    </Svg>
  )
}

/** Property Care: a two-storey villa elevation behind its compound wall and gate, with a key. */
export function VillaDrawing({ className }: { className?: string }) {
  return (
    <Svg viewBox="0 0 520 400" className={className} strokeWidth={1.25}>
      {/* Ground */}
      <path d="M20 340h480" />
      {/* Villa: two storeys, flat roof with parapet, balcony */}
      <path d="M116 300V120h268v180" />
      <path d="M108 120h284M108 112h284v8M116 210h268" />
      <path opacity={0.8} d={windows(140, 140, 4, 1, 36, 46, 26, 0)} />
      <path opacity={0.65} d="M140 163h36M202 163h36M264 163h36M326 163h36M158 140v46M220 140v46M282 140v46M344 140v46" />
      <path opacity={0.8} d="M232 210v-8h112v8M232 202v-10M260 202v-10M288 202v-10M316 202v-10M344 202v-10M232 192h112" />
      <path opacity={0.8} d="M140 236h46v42h-46zM314 236h46v42h-46zM228 300v-54a22 22 0 0 1 44 0v54" />
      {/* Compound wall and gate */}
      <path d="M40 340v-40h168v40M292 340v-40h168v40" />
      <path opacity={0.75} d="M208 340v-50h84v50M208 290h84M222 290v50M236 290v50M250 290v50M264 290v50M278 290v50" />
      <path opacity={0.55} d="M40 308h168M292 308h168" />
      {/* Tree beside the house */}
      <path opacity={0.8} d="M440 300v-58M440 262c-18-6-26-24-18-40s24-20 34-12 14 26 4 38-12 12-20 14" />
      {/* Key (looked after while you are away) */}
      <path opacity={0.9} d="M54 92a18 18 0 1 0 36 0 18 18 0 1 0-36 0M90 92h66v12M136 92v10M146 92v8" />
      <path opacity={0.6} d="M66 92a6 6 0 1 0 12 0 6 6 0 1 0-12 0" />
      {/* Sun */}
      <path opacity={0.55} d="M448 70a18 18 0 1 0 36 0 18 18 0 1 0-36 0M466 40v-10M466 110v-10M436 70h-10M506 70h-10M445 49l-7-7M487 49l7-7M445 91l-7 7M487 91l7 7" />
    </Svg>
  )
}

/** Living abroad: a globe with a dashed route home to a small house. */
export function GlobeRouteDrawing({ className }: { className?: string }) {
  return (
    <Svg viewBox="0 0 520 400" className={className} strokeWidth={1.25}>
      <circle cx="200" cy="200" r="150" />
      <path opacity={0.6} d="M200 50a60 150 0 0 0 0 300M200 50a60 150 0 0 1 0 300M200 50a118 150 0 0 0 0 300M200 50a118 150 0 0 1 0 300M200 50v300" />
      <path opacity={0.6} d="M50 200h300M63 140h274M63 260h274M98 92h204M98 308h204" />
      {/* Route from abroad to home */}
      <path strokeDasharray="5 7" d="M128 128c70-80 230-70 300 70" />
      <path d="M118 128a10 10 0 1 0 20 0 10 10 0 1 0-20 0" />
      <path d="M428 198l-6-12M428 198l12-6" />
      {/* Home */}
      <path d="M400 300v-56h56v56M392 248l36-28 36 28M420 300v-24h16v24" />
      <path d="M380 300h96" />
    </Svg>
  )
}

/**
 * The one Ethiopian touch: a band of stepped diamonds and fine rules inspired by tibeb woven borders, abstract and
 * geometric. Used twice at most (under the hero, at the top of the footer).
 */
export function TibebBand({ id, className }: { id: string; className?: string }) {
  const pid = `tibeb-${id}`
  return (
    <svg aria-hidden="true" focusable="false" className={cn('block h-4 w-full text-gold', className)} preserveAspectRatio="none">
      <defs>
        <pattern id={pid} width="28" height="16" patternUnits="userSpaceOnUse">
          <path d="M0 8l7-7 7 7-7 7zM14 8l7-7 7 7-7 7z" fill="none" stroke="currentColor" strokeWidth="1" />
          <path d="M5 8l2-2 2 2-2 2z" fill="currentColor" />
          <path d="M19 8l2-2 2 2-2 2z" fill="currentColor" opacity="0.55" />
        </pattern>
      </defs>
      <rect width="100%" height="1" y="0" fill="currentColor" opacity="0.7" />
      <rect width="100%" height="16" fill={`url(#${pid})`} />
      <rect width="100%" height="1" y="15" fill="currentColor" opacity="0.7" />
    </svg>
  )
}
