// This script is now browser-compatible and designed to be run from seed-shows.html
// It uses existing API constants and UI helpers (addLog, updateStatus)

const PRICING = {
    'Standard': { 'REGULAR': 200, 'PREMIUM': 350, 'VIP': 600 },
    'IMAX': { 'REGULAR': 450, 'PREMIUM': 700, 'VIP': 1200 },
    'Gold': { 'REGULAR': 800, 'PREMIUM': 1500, 'VIP': 2500 },
    'VIP': { 'REGULAR': 800, 'PREMIUM': 1500, 'VIP': 2500 }
};

const SHOW_TIMES = ['10:00:00', '14:00:00', '18:00:00', '22:00:00'];
const START_DATE = new Date();
const NUM_DAYS = 7;

// Helper to get end time (3 hours later)
function getEndShowTime(startTimeStr) {
    const [hours, minutes, seconds] = startTimeStr.split(':').map(Number);
    let endHours = (hours + 3) % 24;
    return `${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// Global function to be called by the UI
window.runBrowserSeeding = async function() {
    try {
        window.addLog("--- Starting Comprehensive Seeding ---");
        
        // 1. Fetch Movies
        window.updateStatus("Fetching NOW_SHOWING movies...", 5);
        // Using existing Movies object from api.js if available, or direct fetch
        const moviesResp = await fetch(`${BASE_URL}/api/movies/now-showing?pageSize=100`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('sc_token')}` }
        });
        const moviesData = await moviesResp.json();
        const movies = moviesData.content || [];
        
        if (movies.length === 0) {
            window.addLog("No movies found! Please ensure movies are marked as NOW_SHOWING.", "error");
            return;
        }
        window.addLog(`Loaded ${movies.length} movies.`, "success");

        // 2. Fetch Theaters
        window.updateStatus("Fetching theaters...", 10);
        const theatersResp = await fetch(`${BASE_URL}/api/theatre/list?pageSize=100`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('sc_token')}` }
        });
        const theatersData = await theatersResp.json();
        const theaters = theatersData.content || [];
        window.addLog(`Loaded ${theaters.length} theaters.`, "success");

        let totalShowsCreated = 0;
        let showCountToday = 0;

        // Process Theaters
        for (let tIndex = 0; tIndex < theaters.length; tIndex++) {
            const theater = theaters[tIndex];
            const theaterProgress = 10 + (tIndex / theaters.length * 85);
            window.updateStatus(`Processing: ${theater.name}`, theaterProgress);
            window.addLog(`Theater: ${theater.name} (ID: ${theater.id})`);

            // Fetch Screens for Theater
            const screensResp = await fetch(`${BASE_URL}/api/screens/theatre/${theater.id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('sc_token')}` }
            });
            const screens = await screensResp.json();

            if (!screens || screens.length === 0) {
                window.addLog(`  No screens found for ${theater.name}`, "warning");
                continue;
            }

            // Iterate Screens
            for (const screen of screens) {
                const screenType = screen.screenType || 'Standard';
                const pricing = PRICING[screenType] || PRICING['Standard'];

                // Iterate Dates
                for (let day = 0; day < NUM_DAYS; day++) {
                    const currentDate = new Date(START_DATE.getTime() + (day * 24 * 60 * 60 * 1000));
                    const dateStr = formatDate(currentDate);

                    // Iterate Time Slots
                    for (const timeStr of SHOW_TIMES) {
                        const randomMovie = movies[Math.floor(Math.random() * movies.length)];
                        
                        // Pick language: favor English for global movies, otherwise Hindi or first available
                        const isGlobal = ['Inception', 'Interstellar', 'The Dark Knight', 'Barbie', 'Oppenheimer', 'Gladiator', 'Spider-Man'].some(t => randomMovie.title.includes(t));
                        
                        let lang = 'Hindi';
                        if (isGlobal && Math.random() > 0.3) {
                            lang = 'English';
                        } else if (randomMovie.languages && randomMovie.languages.length > 0) {
                            // Extract language name from nested objects if present
                            const lObj = randomMovie.languages[Math.floor(Math.random() * randomMovie.languages.length)];
                            lang = lObj.name || lObj.languageName || 'Hindi';
                        }

                        const showPayload = {
                             movieId: randomMovie.id,
                             screenId: screen.id,
                             showDate: dateStr,
                             showTime: timeStr,
                             endTime: getEndShowTime(timeStr),
                             language: lang,
                             // Use Screen's native type (IMAX, Gold, etc.) or default to REGULAR
                             screenType: screen.screenType || 'REGULAR',
                             seatPrices: pricing,
                             status: 'UPCOMING'
                        };

                        try {
                             const res = await fetch(`${BASE_URL}/api/show/create`, {
                                 method: 'POST',
                                 headers: { 
                                     'Content-Type': 'application/json',
                                     'Authorization': `Bearer ${localStorage.getItem('sc_token')}` 
                                 },
                                 body: JSON.stringify(showPayload)
                             });
                             
                             if (res.ok) {
                                 totalShowsCreated++;
                             } else {
                                 const err = await res.text();
                                 window.addLog(`  Failed at ${dateStr} ${timeStr}: ${err.substring(0, 50)}...`, "error");
                             }
                        } catch (e) {
                             // Silent fail for single show creation
                        }
                    }
                }
            }
            window.addLog(`  Done with ${theater.name}. Added shows.`);
        }

        window.updateStatus("Seeding Complete", 100);
        window.markSeedingComplete(totalShowsCreated);

    } catch (error) {
        window.addLog(`Fatal Error: ${error.message}`, "error");
        console.error(error);
    }
};
