import { addBusiness } from './actions'

const inputStyle = {
  width: '100%',
  padding: 8,
  border: '1px solid #ccc',
  borderRadius: 4,
  marginTop: 4,
}

export default function AddBusinessPage({
  searchParams,
}: {
  searchParams: { success?: string }
}) {
  return (
    <div style={{ maxWidth: 500, margin: '40px auto', padding: 20, fontFamily: 'sans-serif' }}>
      <h1>Add a Business</h1>

      {searchParams.success && (
        <p style={{ color: 'green', fontWeight: 'bold' }}>
          Business added successfully!
        </p>
      )}

      <form action={addBusiness} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <label>
          Business Name *
          <input name="company_name" required style={inputStyle} />
        </label>

        <label>
          City
          <input name="trading_address_city" style={inputStyle} />
        </label>

        <label>
          Phone
          <input name="phone" style={inputStyle} />
        </label>

        <label>
          Website
          <input name="website" style={inputStyle} />
        </label>

        <label>
          Category / Industry
          <input name="sic_description" placeholder="e.g. Ethiopian Restaurant" style={inputStyle} />
        </label>

        <button
          type="submit"
          style={{
            padding: 10,
            marginTop: 10,
            background: '#000',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Save Business
        </button>
      </form>
    </div>
  )
}
