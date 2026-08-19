1. Why this ingestion strategy over the obvious alternative you rejected?
I chose to use public job APIs and RSS feeds instead of directly scraping major job websites. The main reason was reliability and simplicity within the assignment time limit. Public APIs give structured data that is easier to process and store, while also avoiding issues like CAPTCHAs, changing HTML layouts, and site-specific restrictions. It also made the ingestion pipeline easier to demonstrate end-to-end, from fetching the data to storing it in MongoDB.


2. One trade-off you made under the time limit, and what you’d do with a real week.
The biggest trade-off was keeping the number of data sources small. I focused on getting the complete pipeline working — ingestion, processing, MongoDB storage, API endpoints, and the frontend — instead of spending most of the time adding more sources.
With a full week, I would add more reliable job-specific sources, improve the RSS filtering, add better validation and deduplication, and add automated tests and monitoring around the scraping pipeline.

3. Where did you use AI tools, and what did you personally verify or change afterward?
I used AI mainly on the frontend to help with the animations, hover-glow effects, and some error corrections while developing the application. I didn't just use the generated code as-is. I tested the frontend myself, checked whether the components were actually working with my backend APIs, fixed errors that came up during integration, and adjusted the UI and code where the generated solution didn't fit my project. I personally verified the API calls, scraper flow, MongoDB data, and the final behavior of the application.

**Built by**: Dhanush Puppala  
**Stack**: Node.js + Express + React + MongoDB + Cheerio  
**Deployment**: Railway (backend) + Vercel (frontend)  
**Code time**: ~19 hours  
**Ethical stance**: Scrape what's public; respect what's private.
