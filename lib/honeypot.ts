// The spam check's hidden field, shared by the form component and the server (QC-1a).
// The name looks like nothing a browser or password manager fills in (no name, email, phone or website words);
// forms opened before QC-1a still post the old name, so both count.
export const HONEYPOT_FIELD = 'hl_zq9'
export const LEGACY_HONEYPOT_FIELD = 'hl_extra_field'
