'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Member {
  id?: number
  name: string
  company: string
  chapter?: string
  sponsor_type?: 'TITLE_SPONSORS' | 'ASSOCIATE_SPONSORS' | 'CO_SPONSORS' | 'BNI_MEMBERS' | ''
  sponsor_type_display?: string
  ticket_limit?: number
  registration_count?: number
  remaining_tickets?: number
  isRegistered?: boolean
}

interface BulkMember {
  id: number
  name: string
  mobile?: string
  age?: number
}

export default function BNITicket() {
  const router = useRouter()
  const [category, setCategory] = useState('')
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)
  const [registeredCount, setRegisteredCount] = useState(0)
  const [ticketLimit, setTicketLimit] = useState(0)
  const [mobileNumber, setMobileNumber] = useState('')
  const [emailAddress, setEmailAddress] = useState('')
  const [sponsorType, setSponsorType] = useState('')
  const [manualName, setManualName] = useState('')
  const [ticketLimits, setTicketLimits] = useState<{ [key: string]: number }>({})
  const [manualCompany, setManualCompany] = useState('')
  const [bulkMembers, setBulkMembers] = useState<BulkMember[]>([])
  const [nextBulkId, setNextBulkId] = useState(1)
  const [memberTicketLimit, setMemberTicketLimit] = useState(0)
  const [memberRegisteredCount, setMemberRegisteredCount] = useState(0)
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false)
  const [existingRegistration, setExistingRegistration] = useState<any>(null)
  const [allRegistrations, setAllRegistrations] = useState<any[]>([])
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successData, setSuccessData] = useState<any>(null)
  const [showPartialModal, setShowPartialModal] = useState(false)
  const [partialData, setPartialData] = useState<any>(null)
  const [loadingMembers, setLoadingMembers] = useState(false)

  const categories = [
    { value: 'BNI_CHETTINAD', label: 'BNI CHETTINAD' },
    { value: 'BNI_THALAIVAS', label: 'BNI THALAIVAS' },
    { value: 'BNI_MADURAI', label: 'BNI MADURAI' },
  ]

  const sponsorTypes = [
    { value: 'TITLE_SPONSORS', label: 'Title Sponsors' },
    { value: 'ASSOCIATE_SPONSORS', label: 'Associate Sponsors' },
    { value: 'CO_SPONSORS', label: 'Co Sponsors' },
    { value: 'BNI_MEMBERS', label: 'BNI Members' },
  ]

  // Fetch ticket limits from backend API on mount
  useEffect(() => {
    const fetchTicketLimits = async () => {
      try {
        const response = await fetch('https://api.bnievent.rfidpro.in/api/sponsor-ticket-limits/all_limits/')
        if (response.ok) {
          const data = await response.json()
          setTicketLimits(data.limits)
          console.log('✓ Ticket limits loaded from backend:', data.limits)
        } else {
          console.error('Failed to fetch ticket limits from backend')
          // Fallback to default limits if API fails
          setTicketLimits({
            'TITLE_SPONSORS': 10,
            'ASSOCIATE_SPONSORS': 6,
            'CO_SPONSORS': 4,
            'BNI_MEMBERS': 2
          })
        }
      } catch (error) {
        console.error('Error fetching ticket limits:', error)
        // Fallback to default limits if API fails
        setTicketLimits({
          'TITLE_SPONSORS': 10,
          'ASSOCIATE_SPONSORS': 6,
          'CO_SPONSORS': 4,
          'BNI_MEMBERS': 2
        })
      }
    }

    fetchTicketLimits()
  }, [])

  // Fetch members from backend API when category changes
  useEffect(() => {
    const fetchMembers = async () => {
      if (!category) {
        setMembers([])
        setSelectedMember(null)
        setTicketLimit(0)
        return
      }

      setLoadingMembers(true)
      try {
        const response = await fetch(
          `https://api.bnievent.rfidpro.in/api/bni-members/by_chapter/?chapter=${category}`
        )
        if (response.ok) {
          const data = await response.json()
          setMembers(data.members || [])
          console.log(`✓ Loaded ${data.count} members from ${category}`)
        } else {
          console.error('Failed to fetch members from backend')
          setMembers([])
        }
      } catch (error) {
        console.error('Error fetching members:', error)
        setMembers([])
      } finally {
        setLoadingMembers(false)
      }

      // Fetch current registration count for this category
      fetchRegistrationCount(category)
    }

    fetchMembers()
  }, [category])

  // Auto-fill sponsor type and ticket limit when member is selected
  useEffect(() => {
    if (selectedMember && category) {
      // Use sponsor type from backend data
      const effectiveSponsorType = selectedMember.sponsor_type || 'BNI_MEMBERS'
      setSponsorType(effectiveSponsorType)

      // Use ticket limit and registration count from backend response
      if (selectedMember.ticket_limit) {
        setMemberTicketLimit(selectedMember.ticket_limit)
      }
      if (selectedMember.registration_count !== undefined) {
        setMemberRegisteredCount(selectedMember.registration_count)
      }

      // Clear mobile number - user needs to enter it
      setMobileNumber('')
    } else {
      setMobileNumber('')
      setSponsorType('')
      setMemberTicketLimit(0)
      setMemberRegisteredCount(0)
    }
  }, [selectedMember, category])

  // Fetch member ticket limit and registration status when member is selected
  useEffect(() => {
    if (selectedMember && category) {
      const effectiveSponsorType = sponsorType || 'BNI_MEMBERS'

      // Fetch ticket limit by name
      fetchMemberTicketLimitByName(selectedMember.name, category, effectiveSponsorType)

      // Check existing registration by name only
      checkExistingRegistrationByName(selectedMember.name, category)
    } else {
      setMemberTicketLimit(0)
      setMemberRegisteredCount(0)
      setIsAlreadyRegistered(false)
      setExistingRegistration(null)
      setAllRegistrations([])
    }
  }, [selectedMember, category, sponsorType])

  // Fetch member ticket limit for BNI_MADURAI manual input
  useEffect(() => {
    if (category === 'BNI_MADURAI' && manualName && manualName.trim().length > 0) {
      const effectiveSponsorType = sponsorType || 'BNI_MEMBERS'

      // Fetch ticket limit by name
      fetchMemberTicketLimitByName(manualName.trim(), category, effectiveSponsorType)

      // Check existing registration by name
      checkExistingRegistrationByName(manualName.trim(), category)
    } else if (category === 'BNI_MADURAI' && (!manualName || manualName.trim().length === 0)) {
      // Reset when name is cleared
      setMemberTicketLimit(0)
      setMemberRegisteredCount(0)
      setIsAlreadyRegistered(false)
      setExistingRegistration(null)
      setAllRegistrations([])
    }
  }, [manualName, category, sponsorType])

  const fetchRegistrationCount = async (cat: string) => {
    try {
      const response = await fetch('https://api.bnievent.rfidpro.in/api/registrations/')
      if (response.ok) {
        const data = await response.json()
        const count = data.filter((reg: any) => reg.registration_for === cat).length
        setRegisteredCount(count)
      }
    } catch (error) {
      console.error('Error fetching registration count:', error)
    }
  }

  const fetchMemberTicketLimitByName = async (memberName: string, chapter: string, sponsorTypeValue: string) => {
    try {
      const effectiveSponsorType = sponsorTypeValue || 'BNI_MEMBERS'
      const response = await fetch(
        `https://api.bnievent.rfidpro.in/api/registrations/member-limit/?name=${encodeURIComponent(memberName)}&chapter=${chapter}&sponsor_type=${effectiveSponsorType}`
      )
      if (response.ok) {
        const data = await response.json()
        setMemberTicketLimit(data.limit)
        setMemberRegisteredCount(data.registered)
      }
    } catch (error) {
      console.error('Error fetching member ticket limit by name:', error)
    }
  }

  const fetchMemberTicketLimit = async (mobile: string, sponsorTypeValue: string) => {
    try {
      const effectiveSponsorType = sponsorTypeValue || 'BNI_MEMBERS'
      const response = await fetch(
        `https://api.bnievent.rfidpro.in/api/registrations/sponsor-limit/?mobile=${mobile}&sponsor_type=${effectiveSponsorType}`
      )
      if (response.ok) {
        const data = await response.json()
        setMemberTicketLimit(data.limit)
        setMemberRegisteredCount(data.registered)
      }
    } catch (error) {
      console.error('Error fetching member ticket limit:', error)
    }
  }

  const checkExistingRegistrationByName = async (name: string, chapter: string) => {
    try {
      const response = await fetch(
        `https://api.bnievent.rfidpro.in/api/registrations/check-registration-by-name/?name=${encodeURIComponent(name)}&chapter=${chapter}`
      )
      if (response.ok) {
        const data = await response.json()
        if (data.is_registered) {
          setIsAlreadyRegistered(true)
          setExistingRegistration(data.primary_registration)
          setAllRegistrations(data.registrations || [])
        } else {
          setIsAlreadyRegistered(false)
          setExistingRegistration(null)
          setAllRegistrations([])
        }
      }
    } catch (error) {
      console.error('Error checking existing registration:', error)
      setIsAlreadyRegistered(false)
      setExistingRegistration(null)
      setAllRegistrations([])
    }
  }


  const addBulkMember = () => {
    setBulkMembers([...bulkMembers, { id: nextBulkId, name: '', mobile: '' }])
    setNextBulkId(nextBulkId + 1)
  }

  const removeBulkMember = (id: number) => {
    setBulkMembers(bulkMembers.filter(bm => bm.id !== id))
  }

  const areBulkMembersValid = () => {
    if (bulkMembers.length === 0) return true
    return bulkMembers.every(bm => bm.name.trim() !== '' && bm.mobile && bm.mobile.trim() !== '' && bm.mobile.length === 10)
  }

  const updateBulkMemberName = (id: number, name: string) => {
    const updated = bulkMembers.map(bm => {
      if (bm.id === id) {
        return { ...bm, name }
      }
      return bm
    })
    setBulkMembers(updated)
  }

  const updateBulkMemberMobile = (id: number, mobile: string) => {
    const updated = bulkMembers.map(bm => {
      if (bm.id === id) {
        return { ...bm, mobile }
      }
      return bm
    })
    setBulkMembers(updated)
  }

  const updateBulkMemberAge = (id: number, age: string) => {
    const updated = bulkMembers.map(bm => {
      if (bm.id === id) {
        return { ...bm, age: age ? parseInt(age) : undefined }
      }
      return bm
    })
    setBulkMembers(updated)
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation for BNI_MADURAI (manual input)
    if (category === 'BNI_MADURAI') {
      if (!manualName || manualName.trim() === '') {
        alert('Please enter your name')
        return
      }
      if (!mobileNumber || mobileNumber.length < 10) {
        alert('Please enter a valid mobile number (at least 10 digits)')
        return
      }
      if (!emailAddress || emailAddress.trim() === '') {
        alert('Please enter your email address')
        return
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(emailAddress)) {
        alert('Please enter a valid email address')
        return
      }
      if (!manualCompany || manualCompany.trim() === '') {
        alert('Please enter your company name')
        return
      }
    } else {
      // Validation for BNI_CHETTINAD & BNI_THALAIVAS (dropdown selection)
      if (!category || !selectedMember) {
        alert('Please select both Category and Name')
        return
      }
      // Only require mobile number if NOT already registered as primary
      if (!isAlreadyRegistered && (!mobileNumber || mobileNumber.length < 10)) {
        alert('Please enter a valid mobile number (at least 10 digits)')
        return
      }
    }

    // If already registered as primary, require at least 1 additional member
    if (isAlreadyRegistered && bulkMembers.length === 0) {
      alert('You are already registered as primary. Please add at least one additional member or cancel.')
      return
    }

    // Validate bulk members - both name and mobile are required
    for (let i = 0; i < bulkMembers.length; i++) {
      const bm = bulkMembers[i]
      if (!bm.name || bm.name.trim() === '') {
        alert(`Please enter name for Additional Member`)
        return
      }
      // Mobile is mandatory
      if (!bm.mobile || bm.mobile.trim() === '') {
        alert(`Please enter mobile number for ${bm.name}`)
        return
      }
      if (bm.mobile.length < 10) {
        alert(`Please enter a valid mobile number (10 digits) for ${bm.name}`)
        return
      }
    }

    // Calculate total members: if already registered, only count additional members
    const totalMembers = isAlreadyRegistered ? bulkMembers.length : (1 + bulkMembers.length)

    // Check sponsor-based ticket limit for BNI members
    if (category === 'BNI_CHETTINAD' || category === 'BNI_THALAIVAS' || category === 'BNI_MADURAI') {
      const memberRemaining = memberTicketLimit - memberRegisteredCount
      if (totalMembers > memberRemaining) {
        const effectiveSponsorType = sponsorType || 'BNI_MEMBERS'
        const sponsorName = effectiveSponsorType.replace(/_/g, ' ')
        alert(`✗ Ticket Limit Exceeded\n\nSorry! ${sponsorName} can register maximum ${memberTicketLimit} ticket(s).\n\nYou have already registered: ${memberRegisteredCount}\nRemaining: ${memberRemaining}\nRequesting: ${totalMembers}\n\nPlease reduce the number of additional members.`)
        return
      }
    }

    // Check ticket limit for sponsor categories
    if (ticketLimit > 0 && registeredCount + totalMembers > ticketLimit) {
      alert(`✗ Not Enough Seats\n\nSorry! Only ${ticketLimit - registeredCount} seat(s) remaining for ${category.replace('_', ' ')} category.\n\nYou are trying to register ${totalMembers} member(s).\n\nRegistered: ${registeredCount}/${ticketLimit}`)
      return
    }

    setLoading(true)

    try {
      // Register main member
      const registrationResults = []
      const failedRegistrations = []

      // Prepare registration data based on category
      const memberName = category === 'BNI_MADURAI' ? manualName : (selectedMember?.name || '')
      const companyName = category === 'BNI_MADURAI' ? manualCompany : (selectedMember?.company || '')

      // Use existing booking group ID if already registered, otherwise generate a new one
      const bookingGroupId = isAlreadyRegistered && existingRegistration?.booking_group_id
        ? existingRegistration.booking_group_id
        : `BG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Register the main member only if NOT already registered
      let mainRegistrationData = null
      if (!isAlreadyRegistered) {
        mainRegistrationData = {
        name: memberName,
        mobile_number: mobileNumber,
        email: emailAddress || 'member@bnievent.rfidpro.in', // Use provided email or placeholder
        age: 30, // Default age for main member
        location: 'Karaikudi', // Placeholder
        company_name: companyName,
        registration_for: category,
        amount: 0, // Free for BNI members
        sponsor_type: sponsorType || null, // Include sponsor type if selected
        is_primary_booker: true,
        booking_group_id: bookingGroupId,
        primary_booker_name: memberName,
        primary_booker_email: emailAddress || 'member@bnievent.rfidpro.in',
        primary_booker_mobile: mobileNumber,
      }

        try {
          const response = await fetch('https://api.bnievent.rfidpro.in/api/registrations/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(mainRegistrationData),
          })

          const data = await response.json()

          if (response.ok) {
            registrationResults.push({ success: true, name: memberName, ticketNo: data.ticket_no, mobile: mobileNumber })
        } else {
          // Extract error message from different possible error formats
          let errorMessage = 'Registration failed'
          if (data.error) {
            errorMessage = data.error
          } else if (data.registration_for) {
            if (Array.isArray(data.registration_for)) {
              errorMessage = data.registration_for[0]
            } else {
              errorMessage = data.registration_for
            }
          } else if (data.detail) {
            errorMessage = data.detail
          } else if (data.message) {
            errorMessage = data.message
          } else if (data.name) {
            if (Array.isArray(data.name)) {
              errorMessage = data.name[0]
            } else {
              errorMessage = data.name
            }
          } else if (data.mobile_number) {
            if (Array.isArray(data.mobile_number)) {
              errorMessage = data.mobile_number[0]
            } else {
              errorMessage = data.mobile_number
            }
          } else if (data.company_name) {
            if (Array.isArray(data.company_name)) {
              errorMessage = data.company_name[0]
            } else {
              errorMessage = data.company_name
            }
          } else if (data.email) {
            if (Array.isArray(data.email)) {
              errorMessage = data.email[0]
            } else {
              errorMessage = data.email
            }
          } else if (data.location) {
            if (Array.isArray(data.location)) {
              errorMessage = data.location[0]
            } else {
              errorMessage = data.location
            }
          }

          console.log(`Registration failed for ${memberName}:`, data)
          failedRegistrations.push({ name: memberName, error: errorMessage })
          registrationResults.push({ success: false, name: memberName, error: errorMessage })
        }
        } catch (error) {
          console.error(`Registration error for ${memberName}:`, error)
          failedRegistrations.push({ name: memberName, error: 'Connection error' })
          registrationResults.push({ success: false, name: memberName, error: 'Connection error' })
        }
      } // End of if (!isAlreadyRegistered)

      // Register bulk members
      for (const bm of bulkMembers) {
        // Get primary booker info - use existing registration if already registered
        const primaryBookerName = isAlreadyRegistered && existingRegistration ? existingRegistration.name : memberName
        const primaryBookerEmail = isAlreadyRegistered && existingRegistration ? existingRegistration.email : (emailAddress || 'member@bnievent.rfidpro.in')
        const primaryBookerMobile = isAlreadyRegistered && existingRegistration ? existingRegistration.mobile : mobileNumber

        const registrationData = {
          name: bm.name,
          mobile_number: bm.mobile || null, // Mobile is optional
          email: null, // Email not required for additional members
          age: bm.age || null, // Age is optional for additional members
          location: 'Karaikudi', // Placeholder
          company_name: companyName, // Use same company as primary member
          registration_for: category, // Use same BNI chapter as primary member
          amount: 0, // Free for BNI members
          sponsor_type: sponsorType || null, // Include sponsor type same as primary
          is_primary_booker: false,
          booking_group_id: bookingGroupId,
          primary_booker_name: primaryBookerName,
          primary_booker_email: primaryBookerEmail,
          primary_booker_mobile: primaryBookerMobile,
        }

        try {
          const response = await fetch('https://api.bnievent.rfidpro.in/api/registrations/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(registrationData),
          })

          const data = await response.json()

          if (response.ok) {
            registrationResults.push({ success: true, name: bm.name, ticketNo: data.ticket_no, mobile: bm.mobile })
          } else {
            // Extract error message from different possible error formats
            let errorMessage = 'Registration failed'
            if (data.error) {
              errorMessage = data.error
            } else if (data.registration_for) {
              if (Array.isArray(data.registration_for)) {
                errorMessage = data.registration_for[0]
              } else {
                errorMessage = data.registration_for
              }
            } else if (data.detail) {
              errorMessage = data.detail
            } else if (data.message) {
              errorMessage = data.message
            } else if (data.name) {
              if (Array.isArray(data.name)) {
                errorMessage = data.name[0]
              } else {
                errorMessage = data.name
              }
            } else if (data.mobile_number) {
              if (Array.isArray(data.mobile_number)) {
                errorMessage = data.mobile_number[0]
              } else {
                errorMessage = data.mobile_number
              }
            } else if (data.age) {
              if (Array.isArray(data.age)) {
                errorMessage = data.age[0]
              } else {
                errorMessage = data.age
              }
            } else if (data.company_name) {
              if (Array.isArray(data.company_name)) {
                errorMessage = data.company_name[0]
              } else {
                errorMessage = data.company_name
              }
            } else if (data.email) {
              if (Array.isArray(data.email)) {
                errorMessage = data.email[0]
              } else {
                errorMessage = data.email
              }
            } else if (data.location) {
              if (Array.isArray(data.location)) {
                errorMessage = data.location[0]
              } else {
                errorMessage = data.location
              }
            }

            console.log(`Registration failed for ${bm.name}:`, data)
            failedRegistrations.push({ name: bm.name, error: errorMessage })
            registrationResults.push({ success: false, name: bm.name, error: errorMessage })
          }
        } catch (error) {
          console.error(`Registration error for ${bm.name}:`, error)
          failedRegistrations.push({ name: bm.name, error: 'Connection error' })
          registrationResults.push({ success: false, name: bm.name, error: 'Connection error' })
        }
      }

      // Refresh registration count
      await fetchRegistrationCount(category)

      // Show results
      const successCount = registrationResults.filter(r => r.success).length
      const failCount = failedRegistrations.length

      if (failCount === 0) {
        // All successful - Show custom modal
        const remainingTickets = ticketLimit > 0 ? ticketLimit - registeredCount - successCount : 'Unlimited'
        setSuccessData({
          successCount,
          registrationResults: registrationResults.filter(r => r.success),
          remainingTickets: ticketLimit > 0 ? remainingTickets : null
        })
        setShowSuccessModal(true)

        // Reset form
        setCategory('')
        setSelectedMember(null)
        setMembers([])
        setRegisteredCount(0)
        setTicketLimit(0)
        setMobileNumber('')
        setEmailAddress('')
        setBulkMembers([])
      } else if (successCount === 0) {
        // All failed
        let message = `✗ Registration Failed\n\nAll registrations failed:\n\n`
        failedRegistrations.forEach(f => {
          message += `• ${f.name}: ${f.error}\n`
        })
        alert(message)
      } else {
        // Partial success - Show custom modal
        setPartialData({
          successCount,
          failCount,
          successfulRegistrations: registrationResults.filter(r => r.success),
          failedRegistrations
        })
        setShowPartialModal(true)

        // Reset form
        setCategory('')
        setSelectedMember(null)
        setMembers([])
        setRegisteredCount(0)
        setTicketLimit(0)
        setMobileNumber('')
        setEmailAddress('')
        setBulkMembers([])
      }
    } catch (error) {
      console.error('Registration error:', error)
      alert('✗ Error connecting to server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Header Bar with Logo */}
      <div className="header-bar">
        <div className="header-content">
          <a href="/" className="header-logo-link">
            <img
              src="/ez.gif"
              alt="BNI Event"
              className="header-logo"
            />
          </a>
          <h1 className="header-title">
            <span className="bni-text">BNI</span> <span className="chettinad-text">CHETTINAD</span>
          </h1>
        </div>
      </div>

      <div className="container">
        <h1 className="page-title">
          BNI Ticket Registration
        </h1>

        <div className="form-card">
          <form onSubmit={handleSubmit}>
            {/* Category Dropdown */}
            <div style={{ marginBottom: '25px' }}>
              <label style={{
                display: 'block',
                fontSize: '1rem',
                fontWeight: '600',
                color: '#333',
                marginBottom: '10px'
              }}>
                Category <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value)
                  setSelectedMember(null)
                  setMobileNumber('')
                }}
                required
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '1rem',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                  transition: 'border-color 0.3s ease'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#dc3545'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#ddd'}
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Name Field - Dropdown for CHETTINAD/THALAIVAS, Input for MADURAI */}
            {category && category !== 'BNI_MADURAI' && (
              <div style={{ marginBottom: '25px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#333',
                  marginBottom: '10px'
                }}>
                  Name <span style={{ color: '#dc3545' }}>*</span>
                </label>
                {members.length > 0 ? (
                  <select
                    value={selectedMember?.name || ''}
                    onChange={(e) => {
                      const member = members.find(m => m.name === e.target.value)
                      setSelectedMember(member || null)
                    }}
                    required
                    style={{
                      width: '100%',
                      padding: '14px',
                      fontSize: '1rem',
                      border: '2px solid #ddd',
                      borderRadius: '8px',
                      backgroundColor: '#fff',
                      cursor: 'pointer',
                      transition: 'border-color 0.3s ease'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#dc3545'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#ddd'}
                  >
                    <option value="">Select Member</option>
                    {members.map((member) => (
                      <option key={member.name} value={member.name}>
                        {member.name} - {member.company}{member.isRegistered ? ' ✓ [Already Registered as Primary Member]' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{
                    padding: '20px',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    border: '2px dashed #ffc107',
                    textAlign: 'center'
                  }}>
                    <p style={{ fontSize: '0.95rem', color: '#666', margin: 0 }}>
                      Member directory for this category will be available soon.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Manual Input Fields for BNI MADURAI */}
            {category === 'BNI_MADURAI' && (
              <>
                {/* Name Input */}
                <div style={{ marginBottom: '25px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#333',
                    marginBottom: '10px'
                  }}>
                    Name <span style={{ color: '#dc3545' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    required
                    placeholder="Enter your name"
                    style={{
                      width: '100%',
                      padding: '14px',
                      fontSize: '1rem',
                      border: '2px solid #ddd',
                      borderRadius: '8px',
                      backgroundColor: '#fff',
                      transition: 'border-color 0.3s ease',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#dc3545'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#ddd'}
                  />
                </div>

                {/* Mobile Number Input */}
                <div style={{ marginBottom: '25px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#333',
                    marginBottom: '10px'
                  }}>
                    Mobile Number <span style={{ color: '#dc3545' }}>*</span>
                  </label>
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    required
                    maxLength={10}
                    pattern="[0-9]{10}"
                    placeholder="Enter 10-digit mobile number"
                    style={{
                      width: '100%',
                      padding: '14px',
                      fontSize: '1rem',
                      border: '2px solid #ddd',
                      borderRadius: '8px',
                      backgroundColor: '#fff',
                      transition: 'border-color 0.3s ease',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#dc3545'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#ddd'}
                  />
                  {mobileNumber && (
                    <p style={{
                      fontSize: '0.85rem',
                      color: mobileNumber.length === 10 ? '#28a745' : '#dc3545',
                      marginTop: '5px',
                      marginBottom: 0
                    }}>
                      {mobileNumber.length === 10 ? '✓ Valid mobile number' : `Enter ${10 - mobileNumber.length} more digit(s)`}
                    </p>
                  )}
                </div>

                {/* Email Input */}
                <div style={{ marginBottom: '25px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#333',
                    marginBottom: '10px'
                  }}>
                    Email ID <span style={{ color: '#dc3545' }}>*</span>
                  </label>
                  <input
                    type="email"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    required
                    placeholder="Enter email address"
                    style={{
                      width: '100%',
                      padding: '14px',
                      fontSize: '1rem',
                      border: '2px solid #ddd',
                      borderRadius: '8px',
                      backgroundColor: '#fff',
                      transition: 'border-color 0.3s ease',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#dc3545'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#ddd'}
                  />
                  {emailAddress && (
                    <p style={{
                      fontSize: '0.85rem',
                      color: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress) ? '#28a745' : '#dc3545',
                      marginTop: '5px',
                      marginBottom: 0
                    }}>
                      {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress) ? '✓ Valid email address' : 'Please enter a valid email address'}
                    </p>
                  )}
                </div>

                {/* Company Name Input */}
                <div style={{ marginBottom: '25px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#333',
                    marginBottom: '10px'
                  }}>
                    Company Name <span style={{ color: '#dc3545' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={manualCompany}
                    onChange={(e) => setManualCompany(e.target.value)}
                    required
                    placeholder="Enter company name"
                    style={{
                      width: '100%',
                      padding: '14px',
                      fontSize: '1rem',
                      border: '2px solid #ddd',
                      borderRadius: '8px',
                      backgroundColor: '#fff',
                      transition: 'border-color 0.3s ease',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#dc3545'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#ddd'}
                  />
                </div>
              </>
            )}

            {/* Member Ticket Limit - Show after member selection */}
            {selectedMember && memberTicketLimit > 0 && (
              <>
                <div style={{
                  marginBottom: '25px',
                  padding: '18px',
                  background: (memberRegisteredCount + (isAlreadyRegistered ? bulkMembers.length : (1 + bulkMembers.length))) > memberTicketLimit
                    ? 'linear-gradient(135deg, #fff0f0 0%, #ffe6e6 100%)'
                    : 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                  borderRadius: '10px',
                  border: `3px solid ${(memberRegisteredCount + (isAlreadyRegistered ? bulkMembers.length : (1 + bulkMembers.length))) > memberTicketLimit ? '#dc3545' : '#28a745'}`,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  <p style={{ fontSize: '1rem', color: '#333', marginBottom: '12px', fontWeight: '700' }}>
                    📊 Your Ticket Allocation
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.9rem', color: '#666', margin: '0 0 6px 0' }}>
                        <strong>Limit:</strong> {memberTicketLimit} ticket(s)
                      </p>
                      <p style={{ fontSize: '0.9rem', color: '#666', margin: '0 0 6px 0' }}>
                        <strong>Already Registered:</strong> {memberRegisteredCount} ticket(s)
                      </p>
                      <p style={{ fontSize: '0.9rem', color: '#ff9800', margin: '0 0 6px 0', fontWeight: '600' }}>
                        <strong>Registering Now:</strong> {isAlreadyRegistered ? bulkMembers.length : (1 + bulkMembers.length)} ticket(s) {isAlreadyRegistered ? `(${bulkMembers.length} additional)` : `(You + ${bulkMembers.length} additional)`}
                      </p>
                      <p style={{
                        fontSize: '1.1rem',
                        color: (memberRegisteredCount + (isAlreadyRegistered ? bulkMembers.length : (1 + bulkMembers.length))) > memberTicketLimit ? '#dc3545' : '#28a745',
                        margin: 0,
                        fontWeight: '700'
                      }}>
                        <strong>Will Remain After:</strong> {Math.max(0, memberTicketLimit - memberRegisteredCount - (isAlreadyRegistered ? bulkMembers.length : (1 + bulkMembers.length)))} ticket(s)
                      </p>
                    </div>
                    <div style={{
                      fontSize: '3rem',
                      color: (memberRegisteredCount + (isAlreadyRegistered ? bulkMembers.length : (1 + bulkMembers.length))) > memberTicketLimit ? '#dc3545' : '#28a745',
                      fontWeight: '700'
                    }}>
                      {(memberRegisteredCount + (isAlreadyRegistered ? bulkMembers.length : (1 + bulkMembers.length))) > memberTicketLimit ? '✗' : '✓'}
                    </div>
                  </div>
                </div>

                {/* Real-time validation warning */}
                {(memberRegisteredCount + (isAlreadyRegistered ? bulkMembers.length : (1 + bulkMembers.length))) > memberTicketLimit && (
                  <div style={{
                    marginBottom: '25px',
                    padding: '15px',
                    background: 'linear-gradient(135deg, #fff3cd 0%, #ffe8a1 100%)',
                    border: '2px solid #ffc107',
                    borderRadius: '8px',
                    boxShadow: '0 3px 10px rgba(255, 193, 7, 0.3)'
                  }}>
                    <p style={{ color: '#856404', margin: 0, fontSize: '0.95rem', fontWeight: '600', lineHeight: '1.5' }}>
                      ⚠️ <strong>Ticket Limit Exceeded!</strong><br />
                      You're trying to {isAlreadyRegistered ? 'add' : 'register'} <strong>{isAlreadyRegistered ? bulkMembers.length : (1 + bulkMembers.length)} ticket(s)</strong>, but you only have <strong>{Math.max(0, memberTicketLimit - memberRegisteredCount)} ticket(s)</strong> remaining.<br />
                      Please remove <strong>{(isAlreadyRegistered ? bulkMembers.length : (1 + bulkMembers.length)) - (memberTicketLimit - memberRegisteredCount)} member(s)</strong> before submitting.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Mobile Number Field - Show when member is selected and NOT already registered */}
            {selectedMember && !isAlreadyRegistered && (
              <div style={{ marginBottom: '25px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#333',
                  marginBottom: '10px'
                }}>
                  Mobile Number <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  required
                  maxLength={10}
                  pattern="[0-9]{10}"
                  placeholder="Enter 10-digit mobile number"
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: '1rem',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    backgroundColor: '#fff',
                    transition: 'border-color 0.3s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#dc3545'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#ddd'}
                />
                {mobileNumber && (
                  <p style={{
                    fontSize: '0.85rem',
                    color: mobileNumber.length === 10 ? '#28a745' : '#dc3545',
                    marginTop: '5px',
                    marginBottom: 0
                  }}>
                    {mobileNumber.length === 10 ? '✓ Valid mobile number' : `Enter ${10 - mobileNumber.length} more digit(s)`}
                  </p>
                )}
              </div>
            )}

            {/* Email Address Field - Show when member is selected */}
            {selectedMember && (
              <div style={{ marginBottom: '25px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#333',
                  marginBottom: '10px'
                }}>
                  Email ID
                </label>
                <input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="Enter email address (optional)"
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: '1rem',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    backgroundColor: '#fff',
                    transition: 'border-color 0.3s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#dc3545'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#ddd'}
                />
                {emailAddress && (
                  <p style={{
                    fontSize: '0.85rem',
                    color: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress) ? '#28a745' : '#dc3545',
                    marginTop: '5px',
                    marginBottom: 0
                  }}>
                    {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress) ? '✓ Valid email address' : 'Please enter a valid email address'}
                  </p>
                )}
              </div>
            )}

            {/* Sponsor Type Field - Show when member is selected (Read-only) */}
            {selectedMember && sponsorType && (
              <div style={{ marginBottom: '25px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#333',
                  marginBottom: '10px'
                }}>
                  Sponsor Type
                </label>
                <div style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '1rem',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  backgroundColor: '#f8f9fa',
                  color: '#495057',
                  fontWeight: '600',
                  boxSizing: 'border-box'
                }}>
                  {sponsorTypes.find(t => t.value === sponsorType)?.label || sponsorType.replace(/_/g, ' ')}
                </div>
                <p style={{
                  fontSize: '0.85rem',
                  color: '#6c757d',
                  marginTop: '5px',
                  marginBottom: 0,
                  fontStyle: 'italic'
                }}>
                  * Sponsor type is auto-filled from admin settings and cannot be changed
                </p>
              </div>
            )}

            {/* Already Registered Warning - Show when member is already registered as primary */}
            {selectedMember && isAlreadyRegistered && existingRegistration && (
              <div style={{
                marginBottom: '25px',
                padding: '20px',
                background: 'linear-gradient(135deg, #fff3cd 0%, #ffe8a1 100%)',
                borderRadius: '10px',
                border: '3px solid #ffc107',
                boxShadow: '0 4px 12px rgba(255, 193, 7, 0.3)',
                animation: 'warningPulse 2s ease-in-out infinite'
              }}>
                <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                  <div style={{ fontSize: '2rem', color: '#ff6b00', flexShrink: 0 }}>
                    ⚠️
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#ff6b00', margin: '0 0 10px 0' }}>
                      Already Registered as Primary Member
                    </h3>
                    <p style={{ fontSize: '0.95rem', color: '#856404', margin: '0 0 12px 0', lineHeight: '1.5' }}>
                      <strong>{selectedMember.name}</strong> is already registered as a primary member with the details below:
                    </p>

                    {/* Registration Details Card */}
                    <div style={{
                      background: '#fff',
                      padding: '14px',
                      borderRadius: '8px',
                      border: '1px solid #ffecb5',
                      marginBottom: '12px'
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                        <div>
                          <span style={{ fontSize: '0.85rem', color: '#856404', fontWeight: '600' }}>Ticket No:</span>
                          <span style={{ fontSize: '0.95rem', color: '#333', fontWeight: '700', marginLeft: '8px' }}>{existingRegistration.ticket_no}</span>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.85rem', color: '#856404', fontWeight: '600' }}>Email:</span>
                          <span style={{ fontSize: '0.85rem', color: '#333', marginLeft: '8px' }}>{existingRegistration.email}</span>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.85rem', color: '#856404', fontWeight: '600' }}>Company:</span>
                          <span style={{ fontSize: '0.85rem', color: '#333', marginLeft: '8px' }}>{existingRegistration.company}</span>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.85rem', color: '#856404', fontWeight: '600' }}>Category:</span>
                          <span style={{ fontSize: '0.85rem', color: '#333', marginLeft: '8px' }}>{existingRegistration.registration_for?.replace(/_/g, ' ')}</span>
                        </div>
                        {existingRegistration.sponsor_type && (
                          <div>
                            <span style={{ fontSize: '0.85rem', color: '#856404', fontWeight: '600' }}>Sponsor Type:</span>
                            <span style={{ fontSize: '0.85rem', color: '#333', marginLeft: '8px' }}>{existingRegistration.sponsor_type.replace(/_/g, ' ')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Registration History */}
                    {allRegistrations && allRegistrations.length > 0 && (
                      <div style={{
                        background: '#fff',
                        padding: '14px',
                        borderRadius: '8px',
                        border: '1px solid #ffecb5',
                        marginBottom: '12px'
                      }}>
                        <p style={{ fontSize: '0.9rem', color: '#856404', fontWeight: '700', margin: '0 0 10px 0' }}>
                          📋 All Registrations ({allRegistrations.length} total):
                        </p>
                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                          {[...allRegistrations].reverse().map((reg, index) => (
                            <div key={index} style={{
                              fontSize: '0.85rem',
                              color: '#333',
                              padding: '8px',
                              marginBottom: '6px',
                              background: reg.is_primary_booker ? '#e8f5e9' : '#f5f5f5',
                              borderRadius: '6px',
                              border: reg.is_primary_booker ? '2px solid #4caf50' : '1px solid #ddd'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: '700',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: reg.is_primary_booker ? '#4caf50' : '#9e9e9e',
                                  color: '#fff'
                                }}>
                                  {reg.is_primary_booker ? '👤 PRIMARY' : '➕ ADDITIONAL'}
                                </span>
                                <strong>{reg.ticket_no}</strong> - {reg.name}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#666', marginLeft: '8px' }}>
                                📱 {reg.mobile_number} | 📧 {reg.email}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#999', marginLeft: '8px', marginTop: '2px' }}>
                                📅 {new Date(reg.created_at).toLocaleDateString('en-IN')} {new Date(reg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Guidance Message */}
                    <div style={{
                      background: '#fff5e6',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '2px solid #ff6b00'
                    }}>
                      <p style={{ fontSize: '0.95rem', color: '#ff6b00', margin: 0, fontWeight: '700', lineHeight: '1.6' }}>
                        ℹ️ <strong>Important:</strong> You are already registered as a primary member.
                        {memberTicketLimit > 0 && memberRegisteredCount < memberTicketLimit ? (
                          <span> You can add <strong>{memberTicketLimit - memberRegisteredCount - 1}</strong> more additional member(s) using the form below. <strong>Do NOT register yourself again.</strong></span>
                        ) : (
                          <span> You have reached your ticket limit and cannot register additional members.</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Display ticket availability for sponsor categories */}
            {category && ticketLimit > 0 && (
              <div style={{
                marginBottom: '25px',
                padding: '15px',
                background: registeredCount >= ticketLimit
                  ? 'linear-gradient(135deg, #fff0f0 0%, #ffe6e6 100%)'
                  : 'linear-gradient(135deg, #f0fff4 0%, #e6ffe8 100%)',
                borderRadius: '8px',
                border: `2px solid ${registeredCount >= ticketLimit ? '#dc3545' : '#28a745'}`
              }}>
                <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '8px' }}>
                  <strong>Ticket Availability:</strong>
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: '1.1rem', color: '#333', fontWeight: '700', margin: 0 }}>
                      {registeredCount >= ticketLimit ? 'FULL' : `${ticketLimit - registeredCount} Remaining`}
                    </p>
                    <p style={{ fontSize: '0.85rem', color: '#666', margin: '4px 0 0 0' }}>
                      Registered: {registeredCount}/{ticketLimit}
                    </p>
                  </div>
                  <div style={{
                    fontSize: '2rem',
                    color: registeredCount >= ticketLimit ? '#dc3545' : '#28a745',
                    fontWeight: '700'
                  }}>
                    {registeredCount >= ticketLimit ? '✗' : '✓'}
                  </div>
                </div>
              </div>
            )}

            {/* Display selected member company */}
            {selectedMember && (
              <div style={{
                marginBottom: '25px',
                padding: '15px',
                background: 'linear-gradient(135deg, #f0f8ff 0%, #e6f2ff 100%)',
                borderRadius: '8px',
                border: '2px solid #0066cc'
              }}>
                <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '5px' }}>
                  <strong>Company:</strong>
                </p>
                <p style={{ fontSize: '1.05rem', color: '#333', fontWeight: '600', margin: 0 }}>
                  {selectedMember.company}
                </p>
              </div>
            )}

            {/* Bulk Member Registration Section */}
            {selectedMember && (
              <div style={{
                marginBottom: '25px',
                padding: '20px',
                background: 'linear-gradient(135deg, #fff8f0 0%, #ffe8d6 100%)',
                borderRadius: '8px',
                border: '2px solid #ff6600'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ff6600', margin: 0 }}>
                    Add Additional Members (Optional)
                  </h3>
                  <button
                    type="button"
                    onClick={addBulkMember}
                    disabled={memberTicketLimit > 0 && ((isAlreadyRegistered ? bulkMembers.length : (1 + bulkMembers.length)) >= (memberTicketLimit - memberRegisteredCount))}
                    style={{
                      background: (memberTicketLimit > 0 && ((isAlreadyRegistered ? bulkMembers.length : (1 + bulkMembers.length)) >= (memberTicketLimit - memberRegisteredCount)))
                        ? '#e0e0e0'
                        : 'linear-gradient(135deg, #28a745 0%, #218838 100%)',
                      color: (memberTicketLimit > 0 && ((isAlreadyRegistered ? bulkMembers.length : (1 + bulkMembers.length)) >= (memberTicketLimit - memberRegisteredCount)))
                        ? '#999'
                        : '#ffffff',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      cursor: (memberTicketLimit > 0 && ((isAlreadyRegistered ? bulkMembers.length : (1 + bulkMembers.length)) >= (memberTicketLimit - memberRegisteredCount)))
                        ? 'not-allowed'
                        : 'pointer',
                      boxShadow: (memberTicketLimit > 0 && ((isAlreadyRegistered ? bulkMembers.length : (1 + bulkMembers.length)) >= (memberTicketLimit - memberRegisteredCount)))
                        ? 'none'
                        : '0 2px 8px rgba(40, 167, 69, 0.3)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      if (!(memberTicketLimit > 0 && ((isAlreadyRegistered ? bulkMembers.length : (1 + bulkMembers.length)) >= (memberTicketLimit - memberRegisteredCount)))) {
                        e.currentTarget.style.transform = 'translateY(-1px)'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.4)'
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!(memberTicketLimit > 0 && ((isAlreadyRegistered ? bulkMembers.length : (1 + bulkMembers.length)) >= (memberTicketLimit - memberRegisteredCount)))) {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(40, 167, 69, 0.3)'
                      }
                    }}
                  >
                    + Add Member
                  </button>
                </div>

                {bulkMembers.length === 0 && memberTicketLimit > 0 && (
                  <p style={{ fontSize: '0.9rem', color: '#666', textAlign: 'center', margin: 0 }}>
                    You can add up to {memberTicketLimit - memberRegisteredCount - 1} additional member(s)
                  </p>
                )}

                {bulkMembers.map((bulkMember, index) => (
                  <div key={bulkMember.id} style={{
                    marginBottom: '15px',
                    padding: '15px',
                    background: '#ffffff',
                    borderRadius: '6px',
                    border: '1px solid #e0e0e0'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#333', margin: 0 }}>
                        Additional Member
                      </h4>
                      <button
                        type="button"
                        onClick={() => removeBulkMember(bulkMember.id)}
                        style={{
                          background: '#dc3545',
                          color: '#ffffff',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          border: 'none',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#c82333'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#dc3545'}
                      >
                        Remove
                      </button>
                    </div>

                    {/* Member Name Input */}
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        color: '#333',
                        marginBottom: '6px'
                      }}>
                        Name <span style={{ color: '#dc3545' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={bulkMember.name}
                        onChange={(e) => updateBulkMemberName(bulkMember.id, e.target.value)}
                        placeholder="Enter name"
                        style={{
                          width: '100%',
                          padding: '10px',
                          fontSize: '0.9rem',
                          border: '2px solid #ddd',
                          borderRadius: '6px',
                          backgroundColor: '#fff',
                          transition: 'border-color 0.3s ease',
                          boxSizing: 'border-box'
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = '#ff6600'}
                        onBlur={(e) => e.currentTarget.style.borderColor = '#ddd'}
                      />
                    </div>

                    {/* Mobile Number Input (Mandatory) */}
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        color: '#333',
                        marginBottom: '6px'
                      }}>
                        Mobile Number <span style={{ color: '#dc3545' }}>*</span>
                      </label>
                      <input
                        type="tel"
                        value={bulkMember.mobile || ''}
                        onChange={(e) => updateBulkMemberMobile(bulkMember.id, e.target.value)}
                        maxLength={10}
                        placeholder="Enter 10-digit mobile number"
                        required
                        style={{
                          width: '100%',
                          padding: '10px',
                          fontSize: '0.9rem',
                          border: '2px solid #ddd',
                          borderRadius: '6px',
                          backgroundColor: '#fff',
                          transition: 'border-color 0.3s ease',
                          boxSizing: 'border-box'
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = '#ff6600'}
                        onBlur={(e) => e.currentTarget.style.borderColor = '#ddd'}
                      />
                      {bulkMember.mobile && bulkMember.mobile.length > 0 && (
                        <p style={{
                          fontSize: '0.8rem',
                          color: bulkMember.mobile.length === 10 ? '#28a745' : '#dc3545',
                          marginTop: '4px',
                          marginBottom: 0
                        }}>
                          {bulkMember.mobile.length === 10 ? '✓ Valid' : `${10 - bulkMember.mobile.length} more digit(s)`}
                        </p>
                      )}
                    </div>

                    {/* Age Input (Optional) */}
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        color: '#333',
                        marginBottom: '6px'
                      }}>
                        Age <span style={{ fontSize: '0.8rem', color: '#666', fontWeight: '400' }}>(Optional)</span>
                      </label>
                      <input
                        type="number"
                        value={bulkMember.age || ''}
                        onChange={(e) => updateBulkMemberAge(bulkMember.id, e.target.value)}
                        min="1"
                        max="120"
                        placeholder="Enter age"
                        style={{
                          width: '100%',
                          padding: '10px',
                          fontSize: '0.9rem',
                          border: '2px solid #ddd',
                          borderRadius: '6px',
                          backgroundColor: '#fff',
                          transition: 'border-color 0.3s ease',
                          boxSizing: 'border-box'
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = '#ff6600'}
                        onBlur={(e) => e.currentTarget.style.borderColor = '#ddd'}
                      />
                    </div>
                  </div>
                ))}

                {bulkMembers.length > 0 && (
                  <div style={{
                    marginTop: '12px',
                    padding: '10px',
                    background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                    borderRadius: '6px',
                    border: '1px solid #81c784',
                    textAlign: 'center'
                  }}>
                    <p style={{ fontSize: '0.9rem', color: '#2e7d32', fontWeight: '600', margin: 0 }}>
                      Total: {1 + bulkMembers.length} member(s) selected for registration
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <div style={{ marginTop: '30px', display: 'flex', gap: '15px' }}>
              <button
                type="submit"
                disabled={
                  !category ||
                  (isAlreadyRegistered ? (bulkMembers.length === 0 || !areBulkMembersValid()) : (category === 'BNI_MADURAI' ? (!manualName || !mobileNumber || mobileNumber.length !== 10 || !emailAddress || !manualCompany) : (!selectedMember || !mobileNumber || mobileNumber.length !== 10))) ||
                  loading ||
                  (ticketLimit > 0 && registeredCount >= ticketLimit)
                }
                style={{
                  flex: 1,
                  background: category &&
                    (isAlreadyRegistered ? (bulkMembers.length > 0 && areBulkMembersValid()) : (category === 'BNI_MADURAI' ? (manualName && mobileNumber.length === 10 && emailAddress && manualCompany) : (selectedMember && mobileNumber.length === 10))) &&
                    !loading &&
                    !(ticketLimit > 0 && registeredCount >= ticketLimit)
                    ? 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)'
                    : '#e0e0e0',
                  color: category &&
                    (isAlreadyRegistered ? (bulkMembers.length > 0 && areBulkMembersValid()) : (category === 'BNI_MADURAI' ? (manualName && mobileNumber.length === 10 && emailAddress && manualCompany) : (selectedMember && mobileNumber.length === 10))) &&
                    !loading &&
                    !(ticketLimit > 0 && registeredCount >= ticketLimit) ? '#ffffff' : '#999',
                  padding: '14px 30px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '1.05rem',
                  fontWeight: '600',
                  cursor: category &&
                    (isAlreadyRegistered ? (bulkMembers.length > 0 && areBulkMembersValid()) : (category === 'BNI_MADURAI' ? (manualName && mobileNumber.length === 10 && emailAddress && manualCompany) : (selectedMember && mobileNumber.length === 10))) &&
                    !loading &&
                    !(ticketLimit > 0 && registeredCount >= ticketLimit) ? 'pointer' : 'not-allowed',
                  boxShadow: category &&
                    (isAlreadyRegistered ? (bulkMembers.length > 0 && areBulkMembersValid()) : (category === 'BNI_MADURAI' ? (manualName && mobileNumber.length === 10 && emailAddress && manualCompany) : (selectedMember && mobileNumber.length === 10))) &&
                    !loading &&
                    !(ticketLimit > 0 && registeredCount >= ticketLimit) ? '0 3px 12px rgba(220, 53, 69, 0.3)' : 'none',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  const isValid = category &&
                    (isAlreadyRegistered ? (bulkMembers.length > 0 && areBulkMembersValid()) : (category === 'BNI_MADURAI' ? (manualName && mobileNumber.length === 10 && emailAddress && manualCompany) : (selectedMember && mobileNumber.length === 10))) &&
                    !loading &&
                    !(ticketLimit > 0 && registeredCount >= ticketLimit)
                  if (isValid) {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 5px 18px rgba(220, 53, 69, 0.4)'
                  }
                }}
                onMouseOut={(e) => {
                  const isValid = category &&
                    (isAlreadyRegistered ? (bulkMembers.length > 0 && areBulkMembersValid()) : (category === 'BNI_MADURAI' ? (manualName && mobileNumber.length === 10 && emailAddress && manualCompany) : (selectedMember && mobileNumber.length === 10))) &&
                    !loading &&
                    !(ticketLimit > 0 && registeredCount >= ticketLimit)
                  if (isValid) {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 3px 12px rgba(220, 53, 69, 0.3)'
                  }
                }}
              >
                {loading ? 'Submitting...' : (ticketLimit > 0 && registeredCount >= ticketLimit) ? 'Tickets Full' : (isAlreadyRegistered ? 'Add Additional Members' : 'Submit Registration')}
              </button>
            </div>
          </form>

          {/* Back Button */}
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button
              onClick={() => router.push('/')}
              style={{
                background: 'linear-gradient(135deg, #6c757d 0%, #5a6268 100%)',
                color: '#ffffff',
                padding: '12px 30px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 3px 12px rgba(108, 117, 125, 0.3)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 5px 18px rgba(108, 117, 125, 0.4)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 3px 12px rgba(108, 117, 125, 0.3)'
              }}
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && successData && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            animation: 'fadeIn 0.3s ease-in-out'
          }}
          onClick={() => setShowSuccessModal(false)}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
              borderRadius: '20px',
              maxWidth: '550px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              animation: 'slideUp 0.4s ease-out',
              border: '3px solid #28a745'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="success-modal-header" style={{
              background: 'linear-gradient(135deg, #28a745 0%, #218838 100%)',
              padding: '30px 25px',
              borderRadius: '17px 17px 0 0',
              textAlign: 'center',
              position: 'relative'
            }}>
              <div style={{
                fontSize: '4rem',
                marginBottom: '10px',
                animation: 'bounce 1s ease-in-out'
              }}>
                ✓
              </div>
              <h2 style={{
                fontSize: '1.8rem',
                fontWeight: '800',
                color: '#ffffff',
                margin: 0,
                textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
              }}>
                Registration Successful!
              </h2>
              <p style={{
                fontSize: '1rem',
                color: '#e8f5e9',
                margin: '10px 0 0 0',
                fontWeight: '500'
              }}>
                {successData.successCount} member{successData.successCount > 1 ? 's' : ''} registered
              </p>
            </div>

            {/* Body */}
            <div className="success-modal-body" style={{ padding: '30px 25px' }}>
              {/* Registered Members List */}
              <div style={{ marginBottom: '25px' }}>
                <h3 style={{
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  color: '#333',
                  marginBottom: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '1.3rem' }}>🎟️</span>
                  Registered Members
                </h3>
                <div style={{
                  background: '#f8f9fa',
                  borderRadius: '12px',
                  padding: '15px',
                  border: '2px solid #e9ecef'
                }}>
                  {successData.registrationResults.map((reg: any, index: number) => (
                    <div
                      key={index}
                      style={{
                        background: '#ffffff',
                        padding: '15px',
                        borderRadius: '10px',
                        marginBottom: index < successData.registrationResults.length - 1 ? '12px' : '0',
                        border: '2px solid #28a745',
                        boxShadow: '0 2px 8px rgba(40, 167, 69, 0.1)'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'start',
                        gap: '12px'
                      }}>
                        <div style={{
                          fontSize: '1.5rem',
                          flexShrink: 0
                        }}>
                          👤
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{
                            fontSize: '1.1rem',
                            fontWeight: '700',
                            color: '#333',
                            margin: '0 0 8px 0'
                          }}>
                            {reg.name}
                          </p>
                          <div style={{
                            display: 'grid',
                            gap: '6px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{
                                fontSize: '0.85rem',
                                color: '#666',
                                fontWeight: '600',
                                minWidth: '55px'
                              }}>
                                Ticket:
                              </span>
                              <span style={{
                                fontSize: '1rem',
                                fontWeight: '700',
                                color: '#28a745',
                                background: '#e8f5e9',
                                padding: '4px 12px',
                                borderRadius: '6px'
                              }}>
                                {reg.ticketNo}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{
                                fontSize: '0.85rem',
                                color: '#666',
                                fontWeight: '600',
                                minWidth: '55px'
                              }}>
                                Mobile:
                              </span>
                              <span style={{
                                fontSize: '0.95rem',
                                color: '#333',
                                fontWeight: '600'
                              }}>
                                {reg.mobile}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Remaining Tickets */}
              {successData.remainingTickets && (
                <div style={{
                  background: 'linear-gradient(135deg, #fff3cd 0%, #ffe8a1 100%)',
                  padding: '15px',
                  borderRadius: '12px',
                  marginBottom: '25px',
                  border: '2px solid #ffc107',
                  textAlign: 'center'
                }}>
                  <p style={{
                    fontSize: '0.9rem',
                    color: '#856404',
                    margin: '0 0 5px 0',
                    fontWeight: '600'
                  }}>
                    Remaining Tickets
                  </p>
                  <p style={{
                    fontSize: '1.5rem',
                    fontWeight: '800',
                    color: '#ff6600',
                    margin: 0
                  }}>
                    {successData.remainingTickets}
                  </p>
                </div>
              )}

              {/* Confirmation Message */}
              <div style={{
                background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                padding: '20px',
                borderRadius: '12px',
                border: '3px solid #2196f3',
                textAlign: 'center',
                marginBottom: '20px',
                boxShadow: '0 4px 12px rgba(33, 150, 243, 0.2)'
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>
                  🎉
                </div>
                <p style={{
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  color: '#1565c0',
                  margin: 0,
                  lineHeight: '1.6'
                }}>
                  Your Ticket Will Be Confirmed by the BNI Registration Team
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowSuccessModal(false)}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #28a745 0%, #218838 100%)',
                  color: '#ffffff',
                  padding: '15px',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(40, 167, 69, 0.3)',
                  transition: 'all 0.3s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(40, 167, 69, 0.4)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(40, 167, 69, 0.3)'
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Partial Success Modal */}
      {showPartialModal && partialData && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            animation: 'fadeIn 0.3s ease-in-out'
          }}
          onClick={() => setShowPartialModal(false)}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
              borderRadius: '20px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              animation: 'slideUp 0.4s ease-out',
              border: '3px solid #ff9800'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="success-modal-header" style={{
              background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
              padding: '30px 25px',
              borderRadius: '17px 17px 0 0',
              textAlign: 'center',
              position: 'relative'
            }}>
              <div style={{
                fontSize: '4rem',
                marginBottom: '10px',
                animation: 'bounce 1s ease-in-out'
              }}>
                ⚠️
              </div>
              <h2 style={{
                fontSize: '1.8rem',
                fontWeight: '800',
                color: '#ffffff',
                margin: 0,
                textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
              }}>
                Partial Success
              </h2>
              <p style={{
                fontSize: '1rem',
                color: '#fff3e0',
                margin: '10px 0 0 0',
                fontWeight: '500'
              }}>
                {partialData.successCount} succeeded, {partialData.failCount} failed
              </p>
            </div>

            {/* Body */}
            <div className="success-modal-body" style={{ padding: '30px 25px' }}>
              {/* Successful Registrations */}
              {partialData.successfulRegistrations.length > 0 && (
                <div style={{ marginBottom: '25px' }}>
                  <h3 style={{
                    fontSize: '1.1rem',
                    fontWeight: '700',
                    color: '#28a745',
                    marginBottom: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '1.3rem' }}>✓</span>
                    Successful ({partialData.successCount})
                  </h3>
                  <div style={{
                    background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                    borderRadius: '12px',
                    padding: '15px',
                    border: '2px solid #28a745'
                  }}>
                    {partialData.successfulRegistrations.map((reg: any, index: number) => (
                      <div
                        key={index}
                        style={{
                          background: '#ffffff',
                          padding: '12px 15px',
                          borderRadius: '10px',
                          marginBottom: index < partialData.successfulRegistrations.length - 1 ? '10px' : '0',
                          border: '2px solid #28a745',
                          boxShadow: '0 2px 6px rgba(40, 167, 69, 0.15)'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                          flexWrap: 'wrap'
                        }}>
                          <div style={{ flex: 1, minWidth: '200px' }}>
                            <p style={{
                              fontSize: '1rem',
                              fontWeight: '700',
                              color: '#333',
                              margin: '0 0 4px 0'
                            }}>
                              {reg.name}
                            </p>
                            <p style={{
                              fontSize: '0.85rem',
                              color: '#666',
                              margin: 0
                            }}>
                              Ticket: <span style={{
                                fontWeight: '700',
                                color: '#28a745'
                              }}>{reg.ticketNo}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Failed Registrations */}
              {partialData.failedRegistrations.length > 0 && (
                <div style={{ marginBottom: '25px' }}>
                  <h3 style={{
                    fontSize: '1.1rem',
                    fontWeight: '700',
                    color: '#dc3545',
                    marginBottom: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '1.3rem' }}>✗</span>
                    Failed ({partialData.failCount})
                  </h3>
                  <div style={{
                    background: 'linear-gradient(135deg, #fff0f0 0%, #ffe6e6 100%)',
                    borderRadius: '12px',
                    padding: '15px',
                    border: '2px solid #dc3545'
                  }}>
                    {partialData.failedRegistrations.map((reg: any, index: number) => (
                      <div
                        key={index}
                        style={{
                          background: '#ffffff',
                          padding: '15px',
                          borderRadius: '10px',
                          marginBottom: index < partialData.failedRegistrations.length - 1 ? '10px' : '0',
                          border: '2px solid #dc3545',
                          boxShadow: '0 2px 6px rgba(220, 53, 69, 0.15)'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'start',
                          gap: '12px'
                        }}>
                          <div style={{
                            fontSize: '1.5rem',
                            flexShrink: 0,
                            marginTop: '2px'
                          }}>
                            ❌
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{
                              fontSize: '1rem',
                              fontWeight: '700',
                              color: '#333',
                              margin: '0 0 8px 0'
                            }}>
                              {reg.name}
                            </p>
                            <div style={{
                              background: '#fff5f5',
                              padding: '10px',
                              borderRadius: '6px',
                              border: '1px solid #ffcccb'
                            }}>
                              <p style={{
                                fontSize: '0.9rem',
                                color: '#d32f2f',
                                margin: 0,
                                lineHeight: '1.5',
                                fontWeight: '600'
                              }}>
                                {reg.error}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confirmation Message for Successful ones */}
              {partialData.successCount > 0 && (
                <div style={{
                  background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '3px solid #2196f3',
                  textAlign: 'center',
                  marginBottom: '20px',
                  boxShadow: '0 4px 12px rgba(33, 150, 243, 0.2)'
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>
                    🎉
                  </div>
                  <p style={{
                    fontSize: '1.1rem',
                    fontWeight: '700',
                    color: '#1565c0',
                    margin: 0,
                    lineHeight: '1.6'
                  }}>
                    Your Ticket Will Be Confirmed by the BNI Registration Team
                  </p>
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={() => setShowPartialModal(false)}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                  color: '#ffffff',
                  padding: '15px',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(255, 152, 0, 0.3)',
                  transition: 'all 0.3s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 152, 0, 0.4)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 152, 0, 0.3)'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(50px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes bounce {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.2);
          }
        }

        @keyframes warningPulse {
          0%, 100% {
            box-shadow: 0 4px 12px rgba(255, 193, 7, 0.3);
            border-color: #ffc107;
          }
          50% {
            box-shadow: 0 6px 20px rgba(255, 107, 0, 0.5);
            border-color: #ff6b00;
          }
        }

        .header-bar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          z-index: 100;
          padding: 18px 0;
          border-bottom: 3px solid #dc3545;
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .header-logo-link {
          display: block;
          cursor: pointer;
          text-decoration: none;
          transition: transform 0.2s ease;
        }

        .header-logo-link:hover {
          transform: scale(1.05);
        }

        .header-logo {
          height: 65px;
          width: auto;
          object-fit: contain;
          border-radius: 8px;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
          box-shadow: 0 0 15px rgba(255, 102, 0, 0.6),
                      0 0 25px rgba(255, 102, 0, 0.4),
                      0 0 35px rgba(255, 102, 0, 0.3);
          animation: logoGlow 2s ease-in-out infinite;
        }

        @keyframes logoGlow {
          0%, 100% {
            box-shadow: 0 0 15px rgba(255, 102, 0, 0.6),
                        0 0 25px rgba(255, 102, 0, 0.4),
                        0 0 35px rgba(255, 102, 0, 0.3);
          }
          50% {
            box-shadow: 0 0 20px rgba(255, 102, 0, 0.8),
                        0 0 35px rgba(255, 102, 0, 0.6),
                        0 0 50px rgba(255, 102, 0, 0.4);
          }
        }

        .header-title {
          font-size: 1.85rem;
          font-weight: 800;
          margin: 0;
          font-family: 'Inter', sans-serif;
          letter-spacing: 0.5px;
        }

        .bni-text {
          color: #ff0000;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
        }

        .chettinad-text {
          color: #000000;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.05);
        }

        @media (max-width: 768px) {
          .header-logo {
            height: 50px;
          }

          .header-title {
            font-size: 1.4rem;
          }
        }

        @media (max-width: 480px) {
          .header-logo {
            height: 45px;
          }

          .header-title {
            font-size: 1.2rem;
          }
        }

        /* Mobile Responsive Styles */
        .container {
          max-width: 750px;
          margin: 0 auto;
          padding: 20px;
          padding-top: 120px;
        }

        .page-title {
          text-align: center;
          font-size: 2.5rem;
          font-weight: 800;
          color: #dc3545;
          margin-bottom: 30px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
        }

        .form-card {
          background: #ffffff;
          padding: 35px;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          border: 2px solid #dc3545;
        }

        @media (max-width: 768px) {
          .container {
            padding: 15px;
            padding-top: 100px;
          }

          .page-title {
            font-size: 1.8rem;
            margin-bottom: 20px;
            letter-spacing: 1px;
          }

          .form-card {
            padding: 25px;
            border-radius: 10px;
          }
        }

        @media (max-width: 480px) {
          .container {
            padding: 10px;
            padding-top: 90px;
          }

          .page-title {
            font-size: 1.4rem;
            margin-bottom: 15px;
            letter-spacing: 0.5px;
            line-height: 1.3;
          }

          .form-card {
            padding: 20px 15px;
            border-radius: 8px;
            border-width: 1px;
          }
        }

        /* Form Element Mobile Styles */
        @media (max-width: 480px) {
          select,
          input,
          button {
            font-size: 0.95rem !important;
          }

          label {
            font-size: 0.9rem !important;
          }

          .form-card > form > div {
            margin-bottom: 18px !important;
          }

          /* Back button mobile */
          .form-card > div:last-child button {
            padding: 10px 24px !important;
            font-size: 0.9rem !important;
          }

          /* Submit button mobile */
          .form-card > form > div:last-child button {
            padding: 12px 24px !important;
            font-size: 0.95rem !important;
          }
        }

        @media (max-width: 380px) {
          .page-title {
            font-size: 1.2rem;
          }

          select option {
            font-size: 0.8rem;
          }
        }

        /* Ensure dropdown options wrap text properly on mobile */
        @media (max-width: 768px) {
          select {
            word-wrap: break-word;
            white-space: normal;
          }

          select option {
            white-space: normal;
            word-wrap: break-word;
            padding: 8px 4px;
          }
        }

        /* Already Registered Section Mobile Styles */
        @media (max-width: 768px) {
          /* Already Registered Warning Box - Tablet */
          div[style*="Already Registered as Primary Member"] {
            padding: 18px !important;
          }

          div[style*="Already Registered as Primary Member"] h3 {
            font-size: 1.05rem !important;
          }

          div[style*="Already Registered as Primary Member"] p {
            font-size: 0.9rem !important;
          }

          /* Registration Details Grid - Tablet */
          div[style*="Already Registered as Primary Member"] div[style*="grid"] span {
            font-size: 0.82rem !important;
          }

          /* Registration History - Tablet */
          div[style*="📋 All Registrations"] {
            font-size: 0.85rem !important;
          }

          div[style*="📋 All Registrations"] + div > div {
            font-size: 0.82rem !important;
            padding: 7px !important;
          }
        }

        @media (max-width: 480px) {
          /* Already Registered Warning Box - Mobile */
          div[style*="linear-gradient(135deg, #fff3cd 0%, #ffe8a1 100%)"] {
            padding: 12px !important;
            margin-bottom: 18px !important;
            overflow: hidden !important;
            word-wrap: break-word !important;
          }

          /* Flex Container - Adjust gap for mobile */
          div[style*="linear-gradient(135deg, #fff3cd 0%, #ffe8a1 100%)"] > div[style*="display: flex"] {
            gap: 8px !important;
            flex-wrap: nowrap !important;
          }

          /* Warning Icon - Smaller on Mobile */
          div[style*="linear-gradient(135deg, #fff3cd 0%, #ffe8a1 100%)"] > div > div:first-child {
            font-size: 1.5rem !important;
            flex-shrink: 0 !important;
          }

          /* Content Container - Prevent overflow */
          div[style*="linear-gradient(135deg, #fff3cd 0%, #ffe8a1 100%)"] > div > div:last-child {
            flex: 1 !important;
            min-width: 0 !important;
            overflow: hidden !important;
          }

          /* Heading - Compact on Mobile */
          div[style*="linear-gradient(135deg, #fff3cd 0%, #ffe8a1 100%)"] h3 {
            font-size: 0.9rem !important;
            margin-bottom: 6px !important;
            line-height: 1.3 !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
          }

          /* Description Text - Smaller on Mobile */
          div[style*="linear-gradient(135deg, #fff3cd 0%, #ffe8a1 100%)"] p {
            font-size: 0.8rem !important;
            line-height: 1.4 !important;
            margin-bottom: 8px !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
          }

          /* Registration Details Card - Compact */
          div[style*="linear-gradient(135deg, #fff3cd 0%, #ffe8a1 100%)"] div[style*="background: #fff"] {
            padding: 10px !important;
            margin-bottom: 10px !important;
            overflow: hidden !important;
          }

          /* Details Labels and Values - Very Compact */
          div[style*="linear-gradient(135deg, #fff3cd 0%, #ffe8a1 100%)"] div[style*="grid"] {
            gap: 6px !important;
          }

          div[style*="linear-gradient(135deg, #fff3cd 0%, #ffe8a1 100%)"] div[style*="grid"] > div {
            overflow: hidden !important;
            word-wrap: break-word !important;
          }

          div[style*="linear-gradient(135deg, #fff3cd 0%, #ffe8a1 100%)"] div[style*="grid"] span {
            font-size: 0.75rem !important;
            display: inline-block !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
            max-width: 100% !important;
          }

          div[style*="linear-gradient(135deg, #fff3cd 0%, #ffe8a1 100%)"] div[style*="grid"] span:first-child {
            margin-bottom: 2px !important;
            display: block !important;
          }

          /* Registration History Title - Compact */
          div[style*="📋 All Registrations"] {
            font-size: 0.8rem !important;
            margin-bottom: 8px !important;
            word-wrap: break-word !important;
          }

          /* Registration History Cards - Compact */
          div[style*="📋 All Registrations"] ~ div[style*="maxHeight"] {
            max-height: 150px !important;
          }

          div[style*="📋 All Registrations"] ~ div[style*="maxHeight"] > div {
            font-size: 0.75rem !important;
            padding: 6px !important;
            margin-bottom: 5px !important;
            word-wrap: break-word !important;
            overflow: hidden !important;
          }

          /* Registration Type Badge - Smaller */
          div[style*="📋 All Registrations"] ~ div[style*="maxHeight"] span[style*="fontWeight"] {
            font-size: 0.65rem !important;
            padding: 2px 5px !important;
            white-space: nowrap !important;
          }

          /* Contact Info in History - Smaller */
          div[style*="📋 All Registrations"] ~ div[style*="maxHeight"] div[style*="fontSize: 0.75rem"] {
            font-size: 0.7rem !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
          }

          /* Date/Time in History - Even Smaller */
          div[style*="📋 All Registrations"] ~ div[style*="maxHeight"] div[style*="fontSize: 0.7rem"] {
            font-size: 0.65rem !important;
            word-wrap: break-word !important;
          }

          /* Guidance Message Box - Compact */
          div[style*="background: #fff5e6"] {
            padding: 10px !important;
            overflow: hidden !important;
          }

          div[style*="background: #fff5e6"] p {
            font-size: 0.78rem !important;
            line-height: 1.5 !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
          }

          div[style*="background: #fff5e6"] strong {
            font-size: 0.78rem !important;
            word-wrap: break-word !important;
          }
        }

        @media (max-width: 380px) {
          /* Extra Small Mobile - Even More Compact */
          div[style*="linear-gradient(135deg, #fff3cd 0%, #ffe8a1 100%)"] {
            padding: 10px !important;
            margin-bottom: 15px !important;
          }

          /* Icon even smaller for very small screens */
          div[style*="linear-gradient(135deg, #fff3cd 0%, #ffe8a1 100%)"] > div > div:first-child {
            font-size: 1.3rem !important;
          }

          div[style*="linear-gradient(135deg, #fff3cd 0%, #ffe8a1 100%)"] h3 {
            font-size: 0.85rem !important;
            line-height: 1.2 !important;
          }

          div[style*="linear-gradient(135deg, #fff3cd 0%, #ffe8a1 100%)"] p {
            font-size: 0.75rem !important;
            line-height: 1.3 !important;
          }

          div[style*="linear-gradient(135deg, #fff3cd 0%, #ffe8a1 100%)"] div[style*="background: #fff"] {
            padding: 8px !important;
          }

          div[style*="linear-gradient(135deg, #fff3cd 0%, #ffe8a1 100%)"] div[style*="grid"] span {
            font-size: 0.7rem !important;
          }

          div[style*="background: #fff5e6"] {
            padding: 8px !important;
          }

          div[style*="background: #fff5e6"] p {
            font-size: 0.72rem !important;
            line-height: 1.4 !important;
          }

          div[style*="background: #fff5e6"] strong {
            font-size: 0.72rem !important;
          }
        }

        /* Ticket Availability & Member Info Mobile Styles */
        @media (max-width: 480px) {
          /* Ticket Availability Box - Mobile */
          div[style*="Ticket Availability"] {
            padding: 12px !important;
            margin-bottom: 18px !important;
          }

          div[style*="Ticket Availability"] p {
            font-size: 0.82rem !important;
          }

          div[style*="Ticket Availability"] p[style*="1.1rem"] {
            font-size: 0.95rem !important;
          }

          div[style*="Ticket Availability"] p[style*="0.85rem"] {
            font-size: 0.75rem !important;
          }

          div[style*="Ticket Availability"] div[style*="2rem"] {
            font-size: 1.5rem !important;
          }

          /* Company Info Box - Mobile */
          div[style*="linear-gradient(135deg, #f0f8ff 0%, #e6f2ff 100%)"] {
            padding: 12px !important;
            margin-bottom: 18px !important;
          }

          div[style*="linear-gradient(135deg, #f0f8ff 0%, #e6f2ff 100%)"] p {
            font-size: 0.8rem !important;
          }

          div[style*="linear-gradient(135deg, #f0f8ff 0%, #e6f2ff 100%)"] p[style*="1.05rem"] {
            font-size: 0.92rem !important;
          }

          /* Bulk Member Section - Mobile */
          div[style*="Add Additional Members"] {
            padding: 15px !important;
            margin-bottom: 18px !important;
          }

          div[style*="Add Additional Members"] h3 {
            font-size: 0.95rem !important;
          }

          /* Ticket Limit Status Box - Mobile */
          div[style*="Ticket Limit Status"] {
            padding: 10px !important;
            margin-bottom: 15px !important;
          }

          div[style*="Ticket Limit Status"] p {
            font-size: 0.8rem !important;
            margin: 0 0 5px 0 !important;
          }

          div[style*="Registering Now"] {
            font-size: 0.8rem !important;
          }
        }

        /* Bulk Member Input Fields Mobile Styles */
        @media (max-width: 480px) {
          /* Bulk member cards */
          div[style*="background: #f8f9fa"] > div[style*="background: #ffffff"] {
            padding: 12px !important;
            margin-bottom: 12px !important;
          }

          /* Bulk member form labels */
          div[style*="background: #ffffff"] label {
            font-size: 0.85rem !important;
          }

          /* Bulk member inputs */
          div[style*="background: #ffffff"] input {
            font-size: 0.85rem !important;
            padding: 8px !important;
          }

          /* Remove member buttons */
          div[style*="background: #ffffff"] button[style*="#dc3545"] {
            padding: 6px 10px !important;
            font-size: 0.8rem !important;
          }
        }

        /* Mobile Responsive Modal Styles */
        @media (max-width: 768px) {
          /* Success Modal Mobile */
          .success-modal-container {
            padding: 15px !important;
          }

          .success-modal-header {
            padding: 20px 15px !important;
          }

          .success-modal-header div {
            font-size: 3rem !important;
          }

          .success-modal-header h2 {
            font-size: 1.4rem !important;
          }

          .success-modal-header p {
            font-size: 0.9rem !important;
          }

          .success-modal-body {
            padding: 20px 15px !important;
          }

          .success-modal-body h3 {
            font-size: 1rem !important;
          }

          .success-modal-body p {
            font-size: 0.85rem !important;
          }
        }

        @media (max-width: 480px) {
          /* Adjust modal padding and font sizes for small mobile */
          .success-modal-header {
            padding: 15px 12px !important;
          }

          .success-modal-header div {
            font-size: 2.5rem !important;
          }

          .success-modal-header h2 {
            font-size: 1.2rem !important;
          }

          .success-modal-header p {
            font-size: 0.85rem !important;
          }

          .success-modal-body {
            padding: 15px 12px !important;
          }

          .success-modal-body h3 {
            font-size: 0.95rem !important;
          }

          .success-modal-body p {
            font-size: 0.8rem !important;
          }

          /* Modal button mobile */
          .success-modal-body button {
            padding: 12px !important;
            font-size: 1rem !important;
          }
        }
      `}</style>
    </div>
  )
}
