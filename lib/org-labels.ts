export const ORG_KIND_LABEL: Record<string, string> = {
  agency: 'Estate agency',
  developer: 'Developer',
  supplier: 'Supplier',
  manufacturer: 'Manufacturer',
  contractor: 'Contractor',
  professional_firm: 'Professional firm',
  sole_trader: 'Tradesperson',
  hagerland: 'HagerLand',
}

export const VERIFICATION_INFO: Record<string, { label: string; explain: string }> = {
  listed: { label: 'Listed', explain: 'Listed: HagerLand added this business from public information. It has not been claimed by its owner yet.' },
  claimed: { label: 'Claimed', explain: "Claimed: the owner manages this profile. HagerLand confirmed they represent the business." },
  verified: { label: 'Verified', explain: "Verified: HagerLand checked this business's trade licence." },
}
