// Tidy T-2 (T2-8): the staffing request texts that live in the database (service_categories, seeded by migration
// 0019), so they are on the native-speaker review sheet and can be imported. The staffing pages already show them
// through the Jobs translator, keyed by their English text. If the staffing questions are changed in admin → Request
// questions, the new English is shown in English until it is added here and reviewed. A unit test keeps this list
// equal to the 0019 seed. The hidden overseas question (Jobs decision 3) is left out: it is never shown.
export const STAFFING_DB_PLACE = 'database: service_categories (staffing)'

export const STAFFING_DB_KEYS: readonly string[] = [
  // The service and its group (the staffing service itself has no description in the seed).
  'Staffing requirement',
  'Recruitment',
  // The form's questions and choices.
  'Which roles do you need to fill?',
  'How many people?',
  'Type of contract',
  'Permanent',
  'Fixed-term contract',
  'Temporary or day labour',
  'Not sure',
  'When should they start?',
]
