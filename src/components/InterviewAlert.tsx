import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { X, Calendar, Clock, Video, Phone, MapPin, Volume2, VolumeX } from 'lucide-react';

interface Interview {
    id: string;
    candidateName: string;
    candidateId?: string;
    startTime: string; // ISO string
    type: string;
    notes: string;
    status: string;
}

const InterviewAlert: React.FC = () => {
    const navigate = useNavigate();
    const [upcomingInterview, setUpcomingInterview] = useState<Interview | null>(null);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const alertedInterviews = useRef<Set<string>>(new Set());
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Initialize audio with local base64 to avoid network blocks
        // Short "ding" sound
        const audioSrc = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//oeAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIwAXFxcXFxcXFxcXFxcXFxcXIyMjIyMjIyMjIyMjIyMjIyMjREREREQUFBRERERERERE//oeAAABpAAAAAAAAAAAAAAAGAAAAAAA/iAAADJMAAAAAAAAAAAAAAA//uUZAAP8AAANAAAAAABAAAgAAAKqqqaq//uUACA/wAAANIAAAAAEAACAAAAqqqpqr/+5RAID/AAADSAAAAAAQAAIAAACqqqmkv/7lEAgP8AAANIAAAAAEAACAAAAqqqppL/+5RAID/AAADSAAAAAAQAAIAAACqqqmkv/7lEAgP8AAANIAAAAAEAACAAAAqqqpp//7lEAgP8AAANIAAAAAEAACAAAAqqqp//7lEAgP8AAANIAAAAAEAACAAAAqqqp//7lEAgP8AAANIAAAAAEAACAAAAqqqp//7lEAgP8AAANIAAAAAEAACAAAAqqqp//7lEAgP8AAANIAAAAAEAACAAAAqqqp//7lEAgP8AAANIAAAAAEAACAAAAqqqp//7lEAgP8AAANIAAAAAEAACAAAAqqqp//7lEAgP8AAANIAAAAAEAACAAAAqqqp//7lEAgP8AAANIAAAAAEAACAAAAqqqp//7lEAgP8AAANIAAAAAEAACAAAAqqqp//7lEAgP8AAANIAAAAAEAACAAAAqqqp//7lEAgP8AAANIAAAAAEAACAAAAqqqp//7lEAgP8AAANIAAAAAEAACAAAAqqqp//7lEAgP8AAANIAAAAAEAACAAAAqqqp//7lEAgP8AAANIAAAAAEAACAAAAqqqp//7lEAgP8AAANIAAAAAEAACAAAAqqqp";
        audioRef.current = new Audio(audioSrc);
    }, []);

    useEffect(() => {
        const checkInterviews = async () => {
            try {
                const response = await api.get('/interviews');
                const interviews: Interview[] = response.data;

                const now = new Date();
                const notificationThreshold = 15 * 60 * 1000; // 15 minutes in milliseconds

                const imminent = interviews.find(interview => {
                    if (interview.status !== 'Scheduled') return false;

                    const start = new Date(interview.startTime);
                    const diff = start.getTime() - now.getTime();

                    // Notify if start time is within next 15 mins AND hasn't been passed yet (allow 5 sec buffer)
                    return diff > 0 && diff <= notificationThreshold;
                });

                if (imminent && !alertedInterviews.current.has(imminent.id)) {
                    setUpcomingInterview(imminent);
                    alertedInterviews.current.add(imminent.id);

                    // Play sound if enabled
                    if (soundEnabled && audioRef.current) {
                        try {
                            audioRef.current.play().catch(e => console.error("Audio play failed (user interaction needed first?)", e));
                        } catch (err) {
                            console.error("Audio error", err);
                        }
                    }
                    // Always try to vibrate
                    if (navigator.vibrate) {
                        navigator.vibrate([200, 100, 200]);
                    }
                }

            } catch (error) {
                console.error("Failed to check interviews:", error);
            }
        };

        // Initial check
        checkInterviews();

        // Poll every 1 minute
        const interval = setInterval(checkInterviews, 60000);

        return () => clearInterval(interval);
    }, []);

    if (!upcomingInterview) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="bg-white border-l-4 border-indigo-600 border-2 border-blue-200 rounded-lg shadow-2xl p-4 w-96 flex flex-col gap-3 relative">
                <div className="absolute top-2 right-2 flex items-center gap-1">
                    <button
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className="text-gray-400 hover:text-indigo-600 p-1"
                        title={soundEnabled ? "Mute Sound" : "Enable Sound"}
                    >
                        {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={() => setUpcomingInterview(null)}
                        className="text-gray-400 hover:text-gray-600 p-1"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-100 rounded-full text-indigo-600">
                        <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-gray-900">Upcoming Interview!</h4>
                        <p className="text-sm text-gray-600 font-medium">Starting in less than 15 minutes</p>
                    </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 space-y-2 border border-blue-100">
                    <div className="flex items-center gap-2 text-gray-800 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        {upcomingInterview.candidateName}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        {new Date(upcomingInterview.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        <span className="text-gray-400">|</span>
                        {upcomingInterview.type === 'Video' && <Video className="w-4 h-4" />}
                        {upcomingInterview.type === 'Phone' && <Phone className="w-4 h-4" />}
                        {upcomingInterview.type === 'On-site' && <MapPin className="w-4 h-4" />}
                        {upcomingInterview.type}
                    </div>
                </div>

                <div className="flex gap-2 mt-1">
                    <button
                        onClick={() => {
                            if (upcomingInterview) {
                                navigate(`/candidates/${upcomingInterview.candidateId || upcomingInterview.id}`);
                                setUpcomingInterview(null);
                            }
                        }}
                        className="flex-1 px-3 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition"
                    >
                        Join / View Details
                    </button>
                    <button
                        onClick={() => setUpcomingInterview(null)}
                        className="px-3 py-2 bg-gray-100 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-200 transition"
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InterviewAlert;
