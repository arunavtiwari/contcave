'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import FullCalendar from '@fullcalendar/react'; // Import FullCalendar directly
import dayGridPlugin from '@fullcalendar/daygrid'; // Import plugins statically
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';

interface Event {
    id: string;
    title: string;
    start: string;
    end: string;
    allDay?: boolean;
}

export default function Calendar() {
    const { data: session, status } = useSession();
    const [events, setEvents] = useState<Event[]>([]);
    const [isCalendarLoaded, setIsCalendarLoaded] = useState(false);

    useEffect(() => {
        setIsCalendarLoaded(true);
    }, []);

    useEffect(() => {
        if (session) {
            fetchEvents();
        }
    }, [session]);

    const fetchEvents = async () => {
        try {
            const res = await fetch('/api/calendar/events');
            const data = await res.json();

            if (data.items) {
                const formattedEvents = data.items.map((event: any) => ({
                    id: event.id,
                    title: event.summary || 'Busy',
                    start: event.start?.dateTime || event.start?.date,
                    end: event.end?.dateTime || event.end?.date,
                    allDay: !event.start?.dateTime,
                }));
                setEvents(formattedEvents);
            }
        } catch (error) {
            console.error('Error fetching events:', error);
        }
    };

    const handleDateSelect = async (selectInfo: any) => {
        if (!session) {
            alert('Please sign in to add events');
            return;
        }

        const title = prompt('Enter event title:');
        if (!title) return;

        try {
            const response = await fetch('/api/calendar/create-event', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title,
                    start: selectInfo.startStr,
                    end: selectInfo.endStr,
                }),
            });

            if (response.ok) {
                await fetchEvents();
            }
        } catch (error) {
            console.error('Error creating event:', error);
            alert('Failed to create event');
        }
    };

    if (!isCalendarLoaded) {
        return <div>Loading calendar...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-6 flex justify-between items-center">
                <h1 className="text-2xl font-bold">Property Calendar</h1>
                {status === 'loading' ? (
                    <div>Loading...</div>
                ) : session ? (
                    <button
                        onClick={() => signOut()}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    >
                        Sign Out
                    </button>
                ) : (
                    <button
                        onClick={() => signIn('google')}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                        Sign in with Google
                    </button>
                )}
            </div>

            <div className="bg-white rounded-lg shadow-lg p-4">
                <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek,timeGridDay',
                    }}
                    events={events}
                    editable={true}
                    selectable={true}
                    selectMirror={true}
                    dayMaxEvents={true}
                    weekends={true}
                    select={handleDateSelect}
                    height="auto"
                />
            </div>
        </div>
    );
}
