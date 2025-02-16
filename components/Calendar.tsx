'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession, signIn } from 'next-auth/react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';

interface Event {
    id: string;
    title: string;
    start: string;
    end: string;
    allDay: true;
}

type ModalMode = 'add' | 'edit';

export default function Calendar() {
    const { data: session, status } = useSession();
    const [events, setEvents] = useState<Event[]>([]);
    const [isCalendarLoaded, setIsCalendarLoaded] = useState(false);
    const calendarRef = useRef<FullCalendar>(null);

    // Modal state for add/edit events
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<ModalMode>('add');
    const [modalData, setModalData] = useState({
        id: '',
        title: '',
        start: '',
        end: '',
    });

    // Responsive view state: use listWeek for small screens, dayGridMonth for larger ones
    const [calendarView, setCalendarView] = useState('dayGridMonth');

    // Set the calendar as loaded on mount
    useEffect(() => {
        setIsCalendarLoaded(true);
    }, []);

    // Update the calendar view based on window size
    useEffect(() => {
        const updateCalendarView = () => {
            if (window.innerWidth < 768) {
                setCalendarView('listWeek');
            } else {
                setCalendarView('dayGridMonth');
            }
        };

        window.addEventListener('resize', updateCalendarView);
        updateCalendarView();
        return () => window.removeEventListener('resize', updateCalendarView);
    }, []);

    // Conditional headerToolbar based on view
    const headerToolbar =
        calendarView === 'listWeek'
            ? { left: 'prev,next', center: 'title', right: '' }
            : { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' };

    // Fetch events only if the user is signed in
    useEffect(() => {
        if (session) {
            fetchEvents();
        }
    }, [session]);

    const fetchEvents = async () => {
        try {
            const res = await fetch('/api/calendar/events');
            const data = await res.json();

            if (data) {
                const formattedEvents = data.map((event: any) => ({
                    id: event.id,
                    title: event.summary || 'Busy',
                    start: event.start?.date, // using date instead of dateTime
                    end: event.end?.date,     // using date instead of dateTime
                    allDay: true,
                }));
                setEvents(formattedEvents);
                console.log('Fetched events:', formattedEvents);
            }
        } catch (error) {
            console.error('Error fetching events:', error);
        }
    };

    // Open modal for adding a new event
    const handleDateSelect = (selectInfo: any) => {
        if (!session) {
            alert('Please sign in to add events');
            return;
        }
        setModalMode('add');
        setModalData({
            id: '',
            title: '',
            start: selectInfo.startStr, // should be in YYYY-MM-DD format
            end: selectInfo.endStr,     // should be in YYYY-MM-DD format
        });
        setModalOpen(true);
    };

    // Open modal for editing an existing event
    const handleEventClick = (clickInfo: any) => {
        setModalMode('edit');
        setModalData({
            id: clickInfo.event.id,
            title: clickInfo.event.title,
            start: clickInfo.event.startStr,
            end: clickInfo.event.endStr,
        });
        setModalOpen(true);
    };

    // Handle changes in the modal input fields
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setModalData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    // Submit the modal form to either add or update an event
    const handleModalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = modalMode === 'add' ? '/api/calendar/create-event' : '/api/calendar/update-event';
        const method = modalMode === 'add' ? 'POST' : 'PUT';
        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: modalData.id,
                    title: modalData.title,
                    start: modalData.start,
                    end: modalData.end,
                }),
            });
            if (response.ok) {
                setModalOpen(false);
                fetchEvents();
                if (calendarRef.current) {
                    const calendarApi = (calendarRef.current as any).getApi();
                    calendarApi.refetchEvents();
                }
            }
        } catch (error) {
            console.error('Error submitting event:', error);
            alert('Failed to submit event');
        }
    };

    // Delete an event
    const handleDeleteEvent = async () => {
        try {
            const response = await fetch('/api/calendar/delete-event', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: modalData.id }),
            });
            if (response.ok) {
                setModalOpen(false);
                fetchEvents();
                if (calendarRef.current) {
                    const calendarApi = (calendarRef.current as any).getApi();
                    calendarApi.refetchEvents();
                }
            }
        } catch (error) {
            console.error('Error deleting event:', error);
            alert('Failed to delete event');
        }
    };

    if (!isCalendarLoaded) {
        return (
            <div className="flex items-center justify-center h-screen">
                Loading calendar...
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4">
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-center">
                <h1 className="text-2xl font-bold">Property Calendar</h1>
                {status === 'loading' ? (
                    <div>Loading...</div>
                ) : !session ? (
                    <button
                        onClick={() => signIn('google')}
                        className="mt-4 sm:mt-0 px-4 py-2 border border-gray-300 rounded hover:bg-gray-200 transition-colors"
                    >
                        Sign in with Google
                    </button>
                ) : null}
            </div>

            <div className="bg-white rounded-lg shadow-lg p-4 w-full overflow-x-auto">
                <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                    initialView={calendarView}
                    headerToolbar={headerToolbar}
                    events={events}
                    editable={true}
                    selectable={true}
                    selectMirror={true}
                    dayMaxEvents={true}
                    weekends={true}
                    select={handleDateSelect}
                    eventClick={handleEventClick}
                    height="auto"
                    eventColor="black"
                    eventTextColor="white"
                />
            </div>

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black bg-opacity-50">
                    <div className="relative w-full max-w-md p-6 bg-white rounded-lg shadow-lg">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h2 className="text-xl font-bold">
                                {modalMode === 'add' ? 'Add New Event' : 'Edit Event'}
                            </h2>
                            <button onClick={() => setModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                                X
                            </button>
                        </div>
                        <form onSubmit={handleModalSubmit} className="mt-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Event Title</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={modalData.title}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Start Date</label>
                                <input
                                    type="date"
                                    name="start"
                                    value={modalData.start}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">End Date</label>
                                <input
                                    type="date"
                                    name="end"
                                    value={modalData.end}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                                    required
                                />
                            </div>
                            <div className="flex justify-end space-x-3 pt-4 border-t">
                                {modalMode === 'edit' && (
                                    <button
                                        type="button"
                                        onClick={handleDeleteEvent}
                                        className="rounded-full text-red hover:opacity-90 py-2 transition w-full border border-red"
                                    >
                                        Delete
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    className="bg-black rounded-full text-white hover:opacity-90 py-2 transition w-full border border-black"
                                >
                                    {modalMode === 'add' ? 'Add Event' : 'Update Event'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
