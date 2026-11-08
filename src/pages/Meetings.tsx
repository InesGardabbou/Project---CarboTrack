import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Video,
  Clock,
  Users,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

type Meeting = {
  id: string;
  subject: string;
  startDateTime: string;
  endDateTime: string;
  joinWebUrl: string;
  organizer?: string;
  participants?: number;
};

export default function Meetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Replace with your actual API endpoint
      const response = await fetch('/api/meetings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch meetings');
      }

      const data = await response.json();
      setMeetings(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      // Set mock data for demo purposes
      setMeetings([
        {
          id: '1',
          subject: 'Weekly Team Sync',
          startDateTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          endDateTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
          joinWebUrl: 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_test@thread.skype/0',
          organizer: 'John Doe',
          participants: 5,
        },
        {
          id: '2',
          subject: 'Project Planning',
          startDateTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          endDateTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(),
          joinWebUrl: 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_test2@thread.skype/0',
          organizer: 'Jane Smith',
          participants: 8,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const isUpcoming = (startTime: string) => {
    return new Date(startTime) > new Date();
  };

  const isSoon = (startTime: string) => {
    const now = new Date();
    const meetingTime = new Date(startTime);
    const diffMinutes = (meetingTime.getTime() - now.getTime()) / (1000 * 60);
    return diffMinutes > 0 && diffMinutes <= 15;
  };

  const handleJoinMeeting = (meeting: Meeting) => {
    // Open Teams in a new window since iframe is blocked by CSP
    window.open(meeting.joinWebUrl, 'teams_meeting', 'width=1200,height=800');
  };

  return (
    <Layout title="Planned Meetings" subtitle="Your upcoming Microsoft Teams meetings">
      <div className="space-y-6">
        {/* Error Message */}
        {error && !loading && meetings.length === 0 && (
          <div className="p-4 rounded-lg bg-warning/10 border border-warning/30 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Unable to load meetings</p>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 rounded-lg bg-muted/50 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && meetings.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-12 rounded-lg border border-border bg-muted/30">
            <Calendar className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <h3 className="text-lg font-semibold text-foreground">No meetings planned</h3>
            <p className="text-sm text-muted-foreground mt-1">
              You don't have any upcoming meetings scheduled.
            </p>
          </div>
        )}

        {/* Meetings List */}
        {!loading && meetings.length > 0 && (
          <div className="grid gap-4">
            {meetings.map((meeting) => (
              <Card
                key={meeting.id}
                className="p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Meeting Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-foreground truncate">
                        {meeting.subject}
                      </h3>
                      {isSoon(meeting.startDateTime) && (
                        <Badge variant="destructive" className="shrink-0">
                          Starting soon
                        </Badge>
                      )}
                      {!isUpcoming(meeting.startDateTime) && (
                        <Badge variant="secondary" className="shrink-0">
                          Past
                        </Badge>
                      )}
                    </div>

                    {/* Meeting Details */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>
                          {format(parseISO(meeting.startDateTime), 'PPp')} -{' '}
                          {format(parseISO(meeting.endDateTime), 'p')}
                        </span>
                      </div>

                      {meeting.organizer && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>Organized by {meeting.organizer}</span>
                        </div>
                      )}

                      {meeting.participants !== undefined && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>{meeting.participants} participants</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Join Button */}
                  {isUpcoming(meeting.startDateTime) && (
                    <Button
                      className="gap-2 shrink-0"
                      onClick={() => handleJoinMeeting(meeting)}
                    >
                      <Video className="h-4 w-4" />
                      <span className="hidden sm:inline">Join Meeting</span>
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Refresh Button */}
        {!loading && (
          <div className="flex justify-center pt-4">
            <Button variant="outline" onClick={fetchMeetings} className="gap-2">
              <Calendar className="h-4 w-4" />
              Refresh Meetings
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
