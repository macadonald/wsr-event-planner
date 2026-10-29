// Using `type` (not `interface`) — required so Row extends Record<string, unknown>
// passes Supabase's GenericSchema conditional type check.

export type Role = 'admin' | 'planner' | 'viewer'
export type EventStatus = 'planning' | 'finalized'
export type EventType = 'In-House Group' | 'Outside Group' | 'Wedding' | 'Ranch Event' | 'Other'

export type Profile = {
  id: string
  full_name: string | null
  email: string | null
  role: Role
  active: boolean
  created_at: string
}

export type Department = {
  id: string
  name: string
  color: string
  sort_order: number
  active: boolean
  created_at: string
}

export type DepartmentRecipient = {
  id: string
  department_id: string
  name: string
  email: string
  created_at: string
}

export type Event = {
  id: string
  name: string
  event_type: EventType | null
  start_date: string        // 'YYYY-MM-DD' — never parse with new Date()
  end_date: string          // 'YYYY-MM-DD'
  start_time: string | null // 'HH:MM'
  end_time: string | null
  pax: number | null
  location: string | null
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  onsite_contact: string | null
  description: string | null
  special_notes: string | null
  status: EventStatus
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export type EventBilling = {
  id: string
  event_id: string
  room_rental: number | null
  billing_due_date: string | null // 'YYYY-MM-DD'
  billing_method: string | null
  package: string | null
  notes: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export type ScheduleItem = {
  id: string
  event_id: string
  item_date: string        // 'YYYY-MM-DD'
  start_time: string | null // 'HH:MM'
  end_time: string | null
  title: string
  location: string | null
  notes: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export type TimeType = 'at' | 'by'

export type Assignment = {
  id: string
  event_id: string
  department_id: string
  task: string
  task_date: string          // 'YYYY-MM-DD'
  task_time: string | null   // 'HH:MM'; null = untimed / shows under "General"
  time_type: TimeType        // 'at' = happens at that time; 'by' = must be done by that time
  notes: string | null
  repeat_group_id: string | null
  completed_at: string | null
  completed_by: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export type EventNote = {
  id: string
  event_id: string
  content: string
  note_date: string | null   // 'YYYY-MM-DD'
  print_on_dept_sheets: boolean
  sort_order: number
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

// Convenience join types used by queries with nested selects
export type DepartmentWithRecipients = Department & { department_recipients: DepartmentRecipient[] }

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'> & { created_at?: string }
        Update: Partial<Omit<Profile, 'id'>>
        Relationships: []
      }
      departments: {
        Row: Department
        Insert: Omit<Department, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<Department, 'id'>>
        Relationships: []
      }
      department_recipients: {
        Row: DepartmentRecipient
        Insert: Omit<DepartmentRecipient, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<DepartmentRecipient, 'id'>>
        Relationships: []
      }
      events: {
        Row: Event
        Insert: Omit<Event, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<Event, 'id'>>
        Relationships: []
      }
      event_billing: {
        Row: EventBilling
        Insert: Omit<EventBilling, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<EventBilling, 'id'>>
        Relationships: []
      }
      schedule_items: {
        Row: ScheduleItem
        Insert: Omit<ScheduleItem, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<ScheduleItem, 'id'>>
        Relationships: []
      }
      assignments: {
        Row: Assignment
        Insert: Omit<Assignment, 'id' | 'created_at' | 'updated_at' | 'time_type' | 'completed_at' | 'completed_by' | 'repeat_group_id'> & { id?: string; created_at?: string; updated_at?: string; time_type?: TimeType; completed_at?: string | null; completed_by?: string | null; repeat_group_id?: string | null }
        Update: Partial<Omit<Assignment, 'id'>>
        Relationships: []
      }
      event_notes: {
        Row: EventNote
        Insert: Omit<EventNote, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<EventNote, 'id'>>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
  }
}
