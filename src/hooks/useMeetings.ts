import { useEffect, useState } from 'react';
import { meetingService, type Meeting } from '@/services/meetingService';

interface UseMeetingsResult {
  meetings: Meeting[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch and manage meetings
 */
export function useMeetings(): UseMeetingsResult {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await meetingService.getMeetings();
      setMeetings(Array.isArray(data) ? data : []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load meetings';
      setError(errorMessage);
      console.error('Error in useMeetings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  return {
    meetings,
    loading,
    error,
    refetch: fetchMeetings,
  };
}
