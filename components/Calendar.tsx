'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import Modal from './models/Modal';

interface Event {
    id: string;
    title: string;
    start: string;
    end: string;
    allDay: boolean;
    desc?: string;
}

interface CalendarProps {
    operationalStart: string;
    operationalEnd: string;
}

export default function Calendar({ operationalStart, operationalEnd }: CalendarProps) {
    const { data: session } = useSession();
    const [events, setEvents] = useState<Event[]>([]);
    const [isCalendarLoaded, setIsCalendarLoaded] = useState(false);
    const calendarRef = useRef<FullCalendar>(null);

    // Modal state for viewing event details
    const [modalOpen, setModalOpen] = useState(false);
    const [modalData, setModalData] = useState({
        id: '',
        title: '',
        start: '',
        end: '',
        desc: '',
    });

    // Responsive view state: listWeek for small screens, dayGridMonth for larger ones
    const [calendarView, setCalendarView] = useState('dayGridMonth');

    useEffect(() => {
        setIsCalendarLoaded(true);
    }, []);

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

    const headerToolbar =
        calendarView === 'listWeek'
            ? { left: 'prev,next', center: 'title', right: '' }
            : { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' };

    // Convert a day string (e.g., "mon") to a numeric index (0=Sunday, 1=Monday, etc.)
    const dayToIndex = (day: string) => {
        const days: { [key: string]: number } = {
            sun: 0,
            mon: 1,
            tue: 2,
            wed: 3,
            thu: 4,
            fri: 5,
            sat: 6,
        };
        return days[day.toLowerCase()];
    };

    // Compute an array of operational day indexes based on the start and end props
    const getBusinessDays = (start: string, end: string): number[] => {
        const startIndex = dayToIndex(start);
        const endIndex = dayToIndex(end);
        const days: number[] = [];
        if (startIndex <= endIndex) {
            for (let i = startIndex; i <= endIndex; i++) {
                days.push(i);
            }
        } else {
            // For wrap-around scenarios (e.g. Fri to Tue)
            for (let i = startIndex; i < 7; i++) {
                days.push(i);
            }
            for (let i = 0; i <= endIndex; i++) {
                days.push(i);
            }
        }
        return days;
    };

    const businessDays = getBusinessDays(operationalStart, operationalEnd);

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
                    start: event.start?.dateTime || event.start?.date,
                    end: event.end?.dateTime || event.end?.date,
                    allDay: !event.start?.dateTime,
                    desc: event.description || '',
                }));

                // Filter events to only include those on operational (business) days
                const filteredEvents = formattedEvents.filter((event: any) => {
                    const eventDate = new Date(event.start);
                    return businessDays.includes(eventDate.getDay());
                });

                setEvents(filteredEvents);
                console.log('Fetched events:', filteredEvents);
            }
        } catch (error) {
            console.error('Error fetching events:', error);
        }
    };

    const handleEventClick = (clickInfo: any) => {
        setModalData({
            id: clickInfo.event.id,
            title: clickInfo.event.title,
            start: clickInfo.event.startStr,
            end: clickInfo.event.endStr,
            desc: clickInfo.event.extendedProps.desc || '',
        });
        setModalOpen(true);
    };

    if (!isCalendarLoaded) {
        return (
            <div className="flex items-center justify-center h-screen">
                Loading calendar...
            </div>
        );
    }

    return (
        <div className="container">
            <div>
                <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                    initialView={calendarView}
                    headerToolbar={headerToolbar}
                    events={events}
                    editable={false}
                    selectable={false}
                    dayMaxEvents={true}
                    weekends={true}
                    eventClick={handleEventClick}
                    height="auto"
                    eventColor="black"
                    eventTextColor="white"
                    handleWindowResize={true}
                    views={{
                        timeGridWeek: { allDaySlot: false },
                        timeGridDay: { allDaySlot: false },
                    }}
                    businessHours={{
                        // Mark the operational days as business hours (full day)
                        daysOfWeek: businessDays, // e.g. [1, 2, 3] for mon, tue, wed
                        startTime: '00:00',
                        endTime: '24:00',
                    }}
                />
            </div>

            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={() => setModalOpen(false)}
                title="Event Details"
                actionLabel="Close"
                autoWidth
                selfActionButton={true}
                body={
                    <div className="flex flex-col gap-2 min-w-[350px]">
                        <div>
                            <h2 className="text-xl font-semibold">{modalData.title}</h2>
                            <div className="flex gap-2 text-sm place-items-center">
                                <p>
                                    {modalData.start
                                        ? new Date(modalData.start).toLocaleDateString('en-UK', {
                                            weekday: 'long',
                                            month: 'long',
                                            day: 'numeric',
                                        })
                                        : 'N/A'}
                                </p>
                                <span className="shadow-md font-black rounded-full">&bull;</span>
                                <p>
                                    {modalData.start
                                        ? new Date(modalData.start).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: true,
                                        })
                                        : 'N/A'}{' '}
                                    –{' '}
                                    {modalData.end
                                        ? new Date(modalData.end).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: true,
                                        })
                                        : 'N/A'}
                                </p>
                            </div>
                        </div>
                        <div>
                            <p>{modalData.desc}</p>
                        </div>
                    </div>
                }
            />
        </div>
    );
}
