import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { format, differenceInSeconds, parseISO, addDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Moon, Sun, AlertCircle } from 'lucide-react';

interface PrayerTimes {
  Imsak: string;
  Aksam: string;
}

function App() {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [countdown, setCountdown] = useState<string>('');
  const [workCountdown, setWorkCountdown] = useState<string>('');
  const [nextPrayer, setNextPrayer] = useState<'iftar' | 'sahur'>('iftar');
  const [error, setError] = useState<string | null>(null);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const toggleRef = useRef<HTMLDivElement>(null);

  const handleThemeToggle = () => {
    setIsDarkTheme(prev => !prev);
  };

  useEffect(() => {
    const fetchPrayerTimes = async () => {
      try {
        setError(null);
        const today = format(new Date(), 'dd.MM.yyyy');
        const response = await axios.get(
          `https://api.aladhan.com/v1/timingsByCity/${today}?city=Ankara&country=Turkey&method=13`,
          { timeout: 10000 }
        );
        
        if (!response.data?.data?.timings) {
          throw new Error('Invalid data received from API');
        }
        
        const timings = response.data.data.timings;
        setPrayerTimes({
          Imsak: timings.Fajr,
          Aksam: timings.Maghrib
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Namaz vakitleri alınamadı';
        setError(errorMessage);
        console.error('Prayer times fetch error:', error);
      }
    };

    fetchPrayerTimes();
    
    const retryInterval = setInterval(() => {
      if (error) {
        fetchPrayerTimes();
      }
    }, 300000);

    return () => clearInterval(retryInterval);
  }, [error]);

  useEffect(() => {
    if (!prayerTimes) return;

    const updateCountdown = () => {
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      
      const iftarTime = parseISO(`${today}T${prayerTimes.Aksam}`);
      const sahurTime = parseISO(`${today}T${prayerTimes.Imsak}`);
      const nextDaySahurTime = addDays(sahurTime, 1);
      
      const workEndTime = parseISO(`${today}T17:00:00`);
      const nextDayWorkEndTime = addDays(workEndTime, 1);

      let targetTime: Date;
      let workTargetTime: Date;

      if (now > iftarTime) {
        targetTime = nextDaySahurTime;
        workTargetTime = nextDayWorkEndTime;
        setNextPrayer('sahur');
      } else if (now < sahurTime) {
        targetTime = sahurTime;
        workTargetTime = workEndTime;
        setNextPrayer('sahur');
      } else {
        targetTime = iftarTime;
        workTargetTime = workEndTime;
        setNextPrayer('iftar');
      }

      const diff = differenceInSeconds(targetTime, now);
      const workDiff = differenceInSeconds(workTargetTime, now);

      const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      };

      setCountdown(formatTime(diff));
      setWorkCountdown(formatTime(Math.max(0, workDiff)));
    };

    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [prayerTimes]);

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 relative z-10 ${isDarkTheme ? 'night-theme' : 'day-theme'}`}>
        <div className="bg-black/60 backdrop-blur-lg rounded-2xl p-8 text-center text-white shadow-xl max-w-md border border-red-800/30">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-300" />
          <h2 className="text-2xl font-bold mb-4">Bağlantı Hatası</h2>
          <p className="text-lg opacity-90 mb-4">
            Namaz vakitleri şu anda alınamıyor. Lütfen internet bağlantınızı kontrol edin ve sayfayı yenileyin.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-red-900/40 hover:bg-red-900/60 transition-colors px-6 py-2 rounded-lg"
          >
            Yenile
          </button>
        </div>
      </div>
    );
  }

  if (!prayerTimes) {
    return (
      <div className={`min-h-screen flex items-center justify-center relative z-10 ${isDarkTheme ? 'night-theme' : 'day-theme'}`}>
        <div className="text-white text-2xl animate-pulse">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col items-center p-4 relative z-10 transition-all duration-700 ${isDarkTheme ? 'night-theme bg-gradient-to-b from-blue-900/20 to-black/40' : 'day-theme bg-gradient-to-b from-orange-400/20 to-blue-500/20'}`}>
      <div className="fixed top-8 right-8">
        <div 
          className={`theme-toggle-wrapper ${isDarkTheme ? 'night' : 'day'}`}
          onClick={handleThemeToggle}
          ref={toggleRef}
        >
          <div className="theme-toggle-track">
            <div className="theme-icon-wrapper">
              <div className="theme-icon">
                {isDarkTheme ? '🌙' : '☀️'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 text-blue-400">Ankara</h1>
          <p className="text-xl text-blue-300/80">{format(new Date(), 'd MMMM yyyy', { locale: tr })}</p>
        </div>

        <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-8 text-center text-white shadow-xl border border-blue-900/30">
          {/* Escape countdown section */}
          <div className="mb-8 bg-black/40 rounded-xl p-6 border border-blue-900/30">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-4xl">🏃</span>
            </div>
            <div className="flex items-center justify-center">
              <div className="text-7xl font-bold countdown-text text-blue-400">{workCountdown}</div>
            </div>
            <p className="text-blue-300 text-lg mt-2">Özgürlüğe Kalan Süre</p>
          </div>

          {/* Prayer times section */}
          <div className="bg-black/40 rounded-xl p-4 border border-orange-900/30">
            <div className="flex items-center justify-center mb-2">
              {nextPrayer === 'iftar' ? (
                <Sun className="w-6 h-6 text-orange-400" />
              ) : (
                <Moon className="w-6 h-6 text-orange-400" />
              )}
            </div>
            <div className="text-3xl font-bold countdown-text text-orange-400 mb-2">{countdown}</div>
            <div className="grid grid-cols-2 gap-4 text-sm text-orange-300/90">
              <div>
                <p>İftar</p>
                <p className="font-semibold">{prayerTimes.Aksam}</p>
              </div>
              <div>
                <p>Sahur</p>
                <p className="font-semibold">{prayerTimes.Imsak}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;