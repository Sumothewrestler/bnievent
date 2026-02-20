export interface EventFeedback {
  id: number
  registration: number
  ticket_no: string
  attendee_name: string
  registration_category: string
  overall_rating: number
  venue_rating: number | null
  food_rating: number | null
  speaker_rating: number | null
  networking_rating: number | null
  organization_rating: number | null
  recommendation_score: number | null
  liked_most: string | null
  improvements: string | null
  additional_comments: string | null
  attend_future: 'YES' | 'NO' | 'MAYBE' | null
  submitted_at: string
  ip_address: string | null
  user_agent: string | null
  average_rating: number
  nps_category: 'Promoter' | 'Passive' | 'Detractor' | null
}

export interface FeedbackListResponse {
  success: boolean
  total_feedback: number
  average_rating: number
  nps_score: number
  promoters: number
  detractors: number
  feedback: EventFeedback[]
}
