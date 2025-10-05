import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import Modal from './modals/Modal';
import axios from "axios";

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
    listingId: string;
}

export default function Calendar({ operationalStart, operationalEnd, listingId }: CalendarProps) {
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
        try {
            const res = await axios.get("/api/calendar/events", {
                params: { listingId },
            });
            const data = res.data;

            if (data) {
                const formattedEvents = data.map((event: any) => ({
                    id: event.id,
                    title: event.summary || 'Busy',
                    start: event.start?.dateTime || event.start?.date,
                    end: event.end?.dateTime || event.end?.date,
                    allDay: !event.start?.dateTime,
                    desc: event.description || '',
                }));

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
    }, [listingId, businessDays]);

    useEffect(() => {
        if (session) {
            fetchEvents();
        }
    }, [session, fetchEvents]);

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
                displayEventEnd={true}
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