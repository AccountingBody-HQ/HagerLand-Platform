// Jobs Phase 5: the text of the Jobs emails as catalogue keys, so it is on the native-speaker review sheet. The emails
// are still SENT in English (AB's decision): lib/email/templates.ts does not translate them. A unit test checks that each
// key, filled in, matches what the template sends, so the keys stay in step with the emails.

export const JOBS_EMAIL_KEYS: { email: string; keys: string[] }[] = [
  {
    email: 'jobDecisionEmail (job approved)',
    keys: ['Your job is live: {title}', 'Candidates can now see and apply for your vacancy.', 'Your job is live', 'Hello {name},', '"{title}" is now on the HagerLand job board.', 'It stays open until {date}.', 'See your job', 'You are receiving this because your organisation advertises jobs on HagerLand.'],
  },
  {
    email: 'jobDecisionEmail (changes needed)',
    keys: ['Changes needed: {title}', 'Your job advert needs a few changes before it can go live.', 'Your job advert needs some changes', 'We couldn\'t publish "{title}" yet. Here\'s what needs to change:', 'Edit and resubmit'],
  },
  {
    email: 'newApplicationEmail',
    keys: ['New application for {title} ({reference})', '{applicantName} applied for {title}.', 'You have a new application', 'Hello {orgName},', '{applicantName} applied for "{title}" by phone. Open the application to see how to contact them.', '{applicantName} applied for "{title}". Open the application to read the cover note and download the CV.', 'Reference', 'View the application'],
  },
  {
    email: 'applicationReceivedEmail',
    keys: ['Application sent: {title} ({reference})', "We've sent your application to {employer}.", 'Your application has been sent', 'We\'ve sent your application for "{title}" to {employer}. They will contact you directly if they want to take it further.', 'You can follow its progress, or withdraw it, from your account.', 'My applications', 'You are receiving this because you applied for a job on HagerLand.'],
  },
  {
    email: 'recruitmentIntroductionEmail',
    keys: ['Candidates introduced for request {reference}', 'We have introduced {count} candidate(s) for your request {reference}. Each of them agreed to be introduced to you. See their details on your request page.', 'See the candidates', 'Please use their details only for this request. Candidates must never be asked for money.'],
  },
  {
    email: 'jobPausedEmail',
    keys: ['Your job advert is paused while we check it', 'We have paused your job "{title}" while we check it. We will be in touch if we need anything from you.'],
  },
]
