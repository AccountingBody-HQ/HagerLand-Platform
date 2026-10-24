/**
 * "Google Maps" attribution for Places content shown without a Google map (admin only). Google's rules (Places API
 * policies, read 24 Oct 2026): the text "Google Maps", never translated or wrapped, sans-serif weight 400, 12–16 px,
 * gray #5E5E5E (Google's colour, not a HagerLand token), inside the same bordered box as the Google content.
 */
export function GoogleMapsAttribution() {
  return (
    <p translate="no" className="whitespace-nowrap font-sans text-[13px] font-normal text-[#5E5E5E]">
      Google Maps
    </p>
  )
}
