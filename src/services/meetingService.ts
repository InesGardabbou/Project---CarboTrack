/**
 * Meeting Service
 * Handles all API calls related to Microsoft Teams meetings
 */

export interface Meeting {
  id: string;
  subject: string;
  startDateTime: string;
  endDateTime: string;
  joinWebUrl: string;
  organizer?: string;
  participants?: number;
}

export interface CreateMeetingRequest {
  startDateTime: string;
  endDateTime: string;
  subject: string;
  userId?: string;
}

class MeetingService {
  private baseUrl = '/api';
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
    };
  }

  /**
   * Fetch all meetings for the current user
   */
  async getMeetings(): Promise<Meeting[]> {
    try {
      const response = await fetch(`${this.baseUrl}/meetings`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch meetings: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching meetings:', error);
      throw error;
    }
  }

  /**
   * Create a new Teams meeting
   */
  async createMeeting(request: CreateMeetingRequest): Promise<Meeting> {
    try {
      const response = await fetch(`${this.baseUrl}/meetings`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Failed to create meeting: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating meeting:', error);
      throw error;
    }
  }

  /**
   * Get meeting details by ID
   */
  async getMeetingById(id: string): Promise<Meeting> {
    try {
      const response = await fetch(`${this.baseUrl}/meetings/${id}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch meeting: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching meeting details:', error);
      throw error;
    }
  }

  /**
   * Update a meeting
   */
  async updateMeeting(id: string, updates: Partial<Meeting>): Promise<Meeting> {
    try {
      const response = await fetch(`${this.baseUrl}/meetings/${id}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`Failed to update meeting: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating meeting:', error);
      throw error;
    }
  }

  /**
   * Delete a meeting
   */
  async deleteMeeting(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/meetings/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete meeting: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting meeting:', error);
      throw error;
    }
  }
}

export const meetingService = new MeetingService();
