import type { EventClickArg, EventContentArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getCalendarEventsAction } from "@/app/actions/calendarActions";
import { formatISTDate } from '@/lib/utils';

import Modal from './modals/Modal';

interface Event {
    id: string;
    title: string;
    start: string;
    end: string;
    allDay: boolean;
    desc?: string;
}

interface CalendarEventResponse {
    id: string;
    summary?: string;
    start?: {
        dateTime?: string;
        date?: string;
    };
    end?: {
        dateTime?: string;
        date?: string;
    };
    description?: string;
}

interface CalendarProps {
    operationalStart: string;
    operationalEnd: string;
    listingId: string;
    googleCalendarConnected?: boolean;
    onError?: () => void;
}

export default function Calendar({ operationalStart, operationalEnd, listingId, googleCalendarConnected, onError }: CalendarProps) {
    const { data: session } = useSession();
    const [events, setEvents] = useState<Event[]>([]);
    const [isCalendarLoaded, setIsCalendarLoaded] = useState(false);
    const calendarRef = useRef<FullCalendar>(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [modalData, setModalData] = useState({
        id: '',
        title: '',
        start: '',
        end: '',
        desc: '',
    });

    const [calendarView, setCalendarView] = useState('dayGridMonth');

    const renderEventContent = (eventInfo: EventContentArg) => {
        return (
            <div className="flex flex-col min-w-0 py-1 px-1.5">
                {eventInfo.timeText && (
                    <div className="text-[9px] opacity-75 font-bold uppercase tracking-tight leading-none mb-1">
                        {eventInfo.timeText}
                    </div>
                )}
                <div className="text-[10px] font-medium truncate">
                    {eventInfo.event.title}
                </div>
            </div>
        );
    };

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
        return days[day?.toLowerCase()];
    };

    const businessDays = useMemo(() => {
        const startIndex = dayToIndex(operationalStart);
        const endIndex = dayToIndex(operationalEnd);
        const days: number[] = [];
        if (startIndex <= endIndex) {
            for (let i = startIndex; i <= endIndex; i++) {
                days.push(i);
            }
        } else {
            for (let i = startIndex; i < 7; i++) {
                days.push(i);
            }
            for (let i = 0; i <= endIndex; i++) {
                days.push(i);
            }
        }
        return days;
    }, [operationalStart, operationalEnd]);

    const fetchEvents = useCallback(async () => {
        if (!googleCalendarConnected) return;
        try {
            const data = await getCalendarEventsAction(listingId);

            if (data) {
                const formattedEvents: Event[] = (data as CalendarEventResponse[]).map((event) => ({
                    id: event.id,
                    title: event.summary || 'Busy',
                    start: event.start?.dateTime || event.start?.date || '',
                    end: event.end?.dateTime || event.end?.date || '',
                    allDay: !event.start?.dateTime,
                    desc: event.description || '',
                }));

                const filteredEvents = formattedEvents.filter((event) => {
                    const eventDate = new Date(event.start);
                    return businessDays.includes(eventDate.getDay());
                });

                setEvents(filteredEvents);
            }
        } catch (error: unknown) {
            console.error('Error fetching events:', error);
            const err = error as { status?: number; code?: number };
            if (err.status === 400 || err.code === 400) {
                if (onError) onError();
            }
        }
    }, [listingId, businessDays, googleCalendarConnected, onError]);

    useEffect(() => {
        if (session) {
            fetchEvents();
        }
    }, [session, fetchEvents]);

    const handleEventClick = (clickInfo: EventClickArg) => {
        setModalData({
            id: clickInfo.event.id,
            title: clickInfo.event.title,
            start: clickInfo.event.startStr,
            end: clickInfo.event.endStr,
            desc: (clickInfo.event.extendedProps as { desc?: string }).desc || '',
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
        <div className="select-none h-full bg-background rounded-2xl border border-border p-5">
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
                eventContent={renderEventContent}
                handleWindowResize={true}
                displayEventEnd={true}
                buttonText={{
                    month: "Month",
                    week: "Week",
                    day: "Day",
                    list: "List",
                    today: "Today"
                }}
                eventTimeFormat={{
                    hour: 'numeric',
                    minute: '2-digit',
                    meridiem: 'short'
                }}
                views={{
                    timeGridWeek: { allDaySlot: false },
                    timeGridDay: { allDaySlot: false },
                }}
                businessHours={{
                    daysOfWeek: businessDays,
                    startTime: '00:00',
                    endTime: '24:00',
                }}
            />

            <Modal
                isOpen={modalOpen}
                onCloseAction={() => setModalOpen(false)}
                onSubmitAction={() => setModalOpen(false)}
                title="Event Details"
                actionLabel="Close"
                selfActionButton={true}
                body={
                    <div className="flex flex-col gap-2 min-w-87.5">
                        <div>
                            <h2 className="text-xl font-semibold">{modalData.title}</h2>
                            <div className="flex gap-2 text-sm place-items-center">
                                <p>
                                    {modalData.start
                                        ? formatISTDate(modalData.start, {
                                            weekday: "long",
                                            month: "long",
                                            day: "numeric",
                                        })
                                        : "N/A"}
                                </p>
                                <span className="shadow-sm font-foreground rounded-full">&bull;</span>
                                <p>
                                    {modalData.start
                                        ? new Date(modalData.start).toLocaleTimeString("en-IN", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            hour12: true,
                                            timeZone: "Asia/Kolkata",
                                        })
                                        : "N/A"}{" "}
                                    {" "}
                                    {modalData.end
                                        ? new Date(modalData.end).toLocaleTimeString("en-IN", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            hour12: true,
                                            timeZone: "Asia/Kolkata",
                                        })
                                        : "N/A"}
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
