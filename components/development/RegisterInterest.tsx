import { EnquiryForm } from '@/components/enquiry/EnquiryForm'
import { brand } from '@/lib/brand'

export function RegisterInterest({ developmentId, projectName, idPrefix = 'ri' }: { developmentId?: string; projectName?: string; idPrefix?: string }) {
  return (
    <EnquiryForm
      target={{ type: 'hagerland_development', id: developmentId, recipientLabel: brand.divisions.developments }}
      intents={[
        {
          value: 'register_interest',
          label: 'Register interest',
          message: projectName ? `I'd like to hear about plans, prices and the payment plan for ${projectName}.` : "I'd like to hear first about HagerLand's projects: locations, plans and prices.",
        },
      ]}
      extraFields="register_interest"
      submitLabel="Register my interest"
      idPrefix={idPrefix}
      topic="HagerLand Developments"
    />
  )
}
