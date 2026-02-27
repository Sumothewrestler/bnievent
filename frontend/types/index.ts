export interface EventFeedback {
  id: number
  registration: number
  ticket_no: string
  attendee_name: string
  attendee_mobile: string
  registration_category: string
  overall_rating: number
  speaker_rating: number
  attend_future: 'YES' | 'NO' | 'MAYBE'
  submitted_at: string
  ip_address: string | null
  user_agent: string | null
  average_rating: number
}

export interface FeedbackListResponse {
  success: boolean
  total_feedback: number
  average_rating: number
  average_speaker_rating: number
  join_bni: {
    yes: number
    maybe: number
    no: number
  }
  feedback: EventFeedback[]
}
