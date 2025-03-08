import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { format, differenceInSeconds, parseISO, addDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Moon, Sun, AlertCircle, Clock } from 'lucide-react';

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
      
      // Set fixed 17:00 (5 PM) time
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
      <div className="min-h-screen bg-gradient-to-b from-red-900 to-red-700 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center text-white shadow-xl max-w-md">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-300" />
          <h2 className="text-2xl font-bold mb-4">Bağlantı Hatası</h2>
          <p className="text-lg opacity-90 mb-4">
            Namaz vakitleri şu anda alınamıyor. Lütfen internet bağlantınızı kontrol edin ve sayfayı yenileyin.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-white/20 hover:bg-white/30 transition-colors px-6 py-2 rounded-lg"
          >
            Yenile
          </button>
        </div>
      </div>
    );
  }

  if (!prayerTimes) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-700 flex items-center justify-center">
        <div className="text-white text-2xl animate-pulse">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center text-white shadow-xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Ankara</h1>
          <p className="text-xl opacity-90">{format(new Date(), 'd MMMM yyyy', { locale: tr })}</p>
        </div>
        
        <div className="flex items-center justify-center mb-6">
          {nextPrayer === 'iftar' ? (
            <Sun className="w-16 h-16 text-yellow-300" />
          ) : (
            <Moon className="w-16 h-16 text-yellow-300" />
          )}
        </div>

        <div className="mb-6">
          <h2 className="text-2xl mb-2">
            {nextPrayer === 'iftar' ? 'İftara Kalan Süre' : 'Sahura Kalan Süre'}
          </h2>
          <div className="text-6xl font-bold font-mono">{countdown}</div>
        </div>

        <div className="mb-6 bg-white/5 rounded-xl p-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <h3 className="text-lg">🏃‍♂️</h3>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Clock className="w-6 h-6 text-yellow-300" />
            <div className="text-3xl font-bold font-mono text-yellow-300">{workCountdown}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-lg opacity-80">İftar</p>
            <p className="text-2xl font-semibold">{prayerTimes.Aksam}</p>
          </div>
          <div>
            <p className="text-lg opacity-80">Sahur</p>
            <p className="text-2xl font-semibold">{prayerTimes.Imsak}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;