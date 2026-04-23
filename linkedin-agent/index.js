require('dotenv').config();
const { chromium } = require('playwright');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// MongoDB Schema to match Java Backend
const CandidateSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    role: String,
    phone: String,
    skills: [String],
    experience: Number,
    education: [String],
    industry: String,
    locality: String,
    source: { type: String, default: 'LinkedIn Agent' },
    status: { type: String, default: 'New' },
    fitScore: { type: Number, default: 0 },
    jobId: String,
    shortlisted: { type: Boolean, default: false },
    currentOrganization: String,
    noticePeriod: Number,
    currentSalary: String,
    salaryExpectation: String,
    relevantExperience: Number,
    country: String,
    availableFrom: String,
    salaryType: String,
    summary: String,
    visaType: String,
    visaValidity: String,
    reasonForChange: String,
    recentlyAppliedCompanies: String,
    japaneseLanguageProficiency: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { collection: 'candidates' });

const Candidate = mongoose.model('Candidate', CandidateSchema);

// Skill Segregation / Company Analysis Logic using AI
async function segregateSkills(profileData) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Dynamic prompt based on data type input
    const prompt = `You are an AI recruitment agent.
    
    Tasks:
    Analyze the provided LinkedIn raw data, including a specifically extracted CONTACT INFO section.
    
    DATA: ${JSON.stringify(profileData)}

    CRITICAL: Look for Email and Phone inside the 'contactInfo' field and 'rawText'. 
    If not found, strictly return "Extract or null" for those fields.

    1. DETECT if this is a PERSONAL PROFILE or a COMPANY PAGE based on the fields present.

    2. OUTPUT JSON accordingly:

    === IF PERSON ===
    {
      "type": "person",
      "name": "Full Name",
      "email": "Email address found in contactInfo or text",
      "phone": "Phone number found in contactInfo or text",
      "role": "Current professional title",
      "skills": ["Combined Technical and Soft Skills"],
      "experience": "Total years of experience as a number (e.g., 8)",
      "education": ["Degrees and schools"],
      "industry": "Professional industry",
      "currentOrganization": "Current employer name",
      "noticePeriod": "Notice period in days as a number (e.g., 30)",
      "locality": "Extract city/region/country as Job Locality",
      "summary": "Professional summary or bio",
      "visaType": "Visa status if visible",
      "japaneseLanguageProficiency": "Japanese skill level (e.g., N1, N2, Native, Conversational, or None)",
      "languageSkills": ["Other languages known"],
      "technical_segregation": {
        "languages": ["Programming languages"],
        "frameworks": ["Frameworks/Libraries"],
        "tools": ["Tools/Cloud/DevOps"]
      }
    }

    === IF COMPANY ===
    {
      "type": "company",
      "name": "Company Name",
      "industry": "Industry",
      "description": "Short summary",
      "specialties": ["Core competencies"],
      "tech_stack": ["Inferred tech stack"],
      "website": "URL",
      "location": "HQ Location",
      "size": "Company size"
    }

    ONLY return the valid JSON object. Do not include markdown or backticks.`;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text().replace(/```json|```/g, '').trim();
        return JSON.parse(responseText);
    } catch (error) {
        console.error('AI Processing Error:', error);
        return null;
    }
}

const fs = require('fs');
const path = require('path');

const SESSION_FILE = path.join(__dirname, 'session.json');

// Helper to load session
function getProfileSession() {
    if (fs.existsSync(SESSION_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
        } catch (e) {
            console.error('Failed to load session file', e);
        }
    }
    return null;
}

// Scraper Logic
async function scrapeLinkedIn(url) {
    console.log(`🚀 Agent navigating to: ${url}`);
    // Run in visible mode to avoid anti-bot detection
    const browser = await chromium.launch({ headless: false });

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    });

    // 1. Try to load saved session first
    const savedSession = getProfileSession();
    if (savedSession) {
        console.log('🍪 Loading saved LinkedIn session...');
        await context.addCookies(savedSession);
    } else if (process.env.LINKEDIN_SESSION_COOKIE) {
        // Fallback to env var
        await context.addCookies([{
            name: 'li_at',
            value: process.env.LINKEDIN_SESSION_COOKIE,
            domain: '.www.linkedin.com',
            path: '/'
        }]);
    }

    const page = await context.newPage();

    // URL Cleaning & Formatting for Company Pages
    let targetUrl = url;
    if (url.includes('/company/') && !url.includes('/about/')) {
        // Ensure we scrape the ABOUT section for companies
        // Remove trailing slashes and potential query params
        const baseUrl = url.split('?')[0].replace(/\/+$/, '');
        targetUrl = `${baseUrl}/about/`;
    }

    try {
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Check if we hit a login wall
        if (page.url().includes('login') || (await page.locator('form.login__form').isVisible().catch(() => false)) || (await page.locator('.auth-wall__content').isVisible().catch(() => false))) {
            console.error('❌ Login Wall Detected! Session might be expired.');
            throw new Error('Hit LinkedIn login wall. Please click "Connect LinkedIn" to re-authenticate.');
        }

        let data = {};
        const isCompany = url.includes('/company/');

        if (isCompany) {
            // === COMPANY PAGE EXTRACTION ===
            console.log('🏢 Detected Company Page');
            await page.waitForSelector('h1', { timeout: 10000 }).catch(() => { });

            data = {
                type: 'company',
                rawText: await page.evaluate(() => document.body.innerText),
                name: await page.locator('h1').first().innerText().catch(() => 'Unknown Company'),
                tagline: await page.locator('.org-top-card-summary__tagline, .top-card-layout__headline').first().innerText().catch(() => ''),
                about: await page.locator('.org-grid__content-height-enforcer p, section.artdeco-card .break-words').first().innerText().catch(() => ''),
                website: await page.locator('a[href^="http"]:has-text("Website"), .org-page-details__definition-text a').first().getAttribute('href').catch(() => null),
                specialties: await page.locator('.org-page-details__definition-text:has-text("Specialties")').innerText().catch(() => ''),
                location: await page.locator('.org-top-card-summary-info-list__icon-item:first-child').innerText().catch(() => '')
            };

        } else {
            // === PERSONAL PROFILE EXTRACTION ===
            console.log('👤 Detected Personal Profile');
            
            // Wait for profile content
            await page.waitForSelector('h1.text-heading-xlarge, .top-card-layout__title', { timeout: 15000 }).catch(() => {});
            
            // 1. EXTRACT HIDDEN CONTACT INFO (Email, Phone)
            let contactInfo = "";
            try {
                // Look for the "Contact info" link
                const contactLink = page.locator('a[href*="/contact-info/"]').first();
                if (await contactLink.isVisible()) {
                    await contactLink.click();
                    // Wait for the contact info section to appear (usually a modal or sidebar)
                    await page.waitForSelector('.pv-contact-info', { timeout: 5000 }).catch(() => {});
                    contactInfo = await page.evaluate(() => {
                        const section = document.querySelector('.pv-contact-info') || document.querySelector('.artdeco-modal__content');
                        return section ? section.innerText : "";
                    });
                    // Close modal if it's there
                    await page.keyboard.press('Escape').catch(() => {});
                }
            } catch (e) {
                console.log("Contact info extraction failed", e.message);
            }

            data = {
                type: 'person',
                url: url,
                name: await page.locator('h1.text-heading-xlarge, .top-card-layout__title, .pv-top-card--list > li:first-child').first().innerText().catch(() => null),
                headline: await page.locator('.text-body-medium, .top-card-layout__headline, .pv-top-card--list > li:nth-child(2)').first().innerText().catch(() => null),
                location: await page.locator('.text-body-small.inline.t-black--light').first().innerText().catch(() => null),
                about: await page.locator('#about ~ .display-flex .pv-shared-text-with-see-more, .summary > p, section.summary').innerText().catch(() => null),
                experience: await page.locator('#experience ~ .display-flex, .experience-item, .pv-profile-section.experience-section').allInnerTexts().catch(() => []),
                languages: await page.locator('#languages ~ .display-flex, .pv-profile-section.languages-section').allInnerTexts().catch(() => []),
                contactInfo: contactInfo,
                rawText: await page.evaluate(() => document.body.innerText)
            };
        }

        await browser.close();
        return data;
    } catch (error) {
        console.error('Scraping Error:', error);
        await browser.close();
        throw error;
    }
}

// === NEW OAUTH 2.0 AUTH FLOW ENDPOINTS ===

const axios = require('axios');
const qs = require('qs');

// Configuration
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
// Ensure redirect URI matches your LinkedIn App settings exactly
const LINKEDIN_REDIRECT_URI = 'http://localhost:8090/auth/linkedin/callback';

// 1. Initial Authorization Redirect
app.get('/auth/linkedin', (req, res) => {
    if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
        return res.status(500).send('Error: LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET are not set in environment variables.');
    }

    const scope = 'r_liteprofile r_emailaddress'; // Basic profile + email
    const state = Math.random().toString(36).substring(7); // CSRF protection

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(LINKEDIN_REDIRECT_URI)}&state=${state}&scope=${encodeURIComponent(scope)}`;

    res.redirect(authUrl);
});

// === HYBRID AUTH: OAUTH (Identity) + COOKIES (Scraping) ===

// 1. Interactive Login (Capture REAL Cookies for Scraper)
app.post('/agent/login', async (req, res) => {
    console.log('🔐 Starting interactive login flow...');
    let browser = null;
    try {
        browser = await chromium.launch({ headless: false }); // Visible
        const context = await browser.newContext();
        const page = await context.newPage();

        await page.goto('https://www.linkedin.com/login');
        console.log('⏳ Waiting for user to log in...');

        // Wait for feed - indicating success
        await page.waitForURL('**/feed/**', { timeout: 180000 });

        console.log('✅ Login detected! Capturing cookies...');
        const cookies = await context.cookies();

        // Save these REAL cookies for the scraper
        const sessionCookies = cookies.filter(c => c.domain.includes('linkedin.com'));
        fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionCookies, null, 2));

        console.log('💾 Cookies saved to session.json');
        await browser.close();

        res.json({ status: 'success', message: 'Agent successfully authenticated for scraping!' });

    } catch (error) {
        if (browser) await browser.close();
        res.status(500).json({ error: 'Login timed out. Please try again.' });
    }
});

// 2. OAuth Callback (Identity Verification only)
app.get('/auth/linkedin/callback', async (req, res) => {
    // ... OAuth logic to get Name/Email for UI welcome message ...
    // Note: We do NOT overwrite session.json with the access token here anymore
    // because access_token != li_at cookie.

    const { code } = req.query;
    if (!code) return res.redirect('http://localhost:3000/linkedin-agent?error=No+code');

    try {
        // Exchange token just to get user details
        const tokenResp = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', qs.stringify({
            grant_type: 'authorization_code',
            code,
            redirect_uri: LINKEDIN_REDIRECT_URI,
            client_id: LINKEDIN_CLIENT_ID,
            client_secret: LINKEDIN_CLIENT_SECRET
        }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

        const accessToken = tokenResp.data.access_token;

        // Fetch User Name for UI
        const profileResponse = await axios.get('https://api.linkedin.com/v2/me', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        // Redirect with success + name
        const firstName = profileResponse.data.localizedFirstName;
        res.redirect(`http://localhost:3000/linkedin-agent?status=success&name=${encodeURIComponent(firstName)}`);

    } catch (err) {
        console.error('OAuth Error:', err.message);
        res.redirect('http://localhost:3000/linkedin-agent?error=OAuth+Failed');
    }
});

// 3. Status Check
app.get('/agent/status', (req, res) => {
    const hasCookies = fs.existsSync(SESSION_FILE);
    res.json({ connected: hasCookies, configured: true });
});

// Agent API Endpoint (Scraping)
app.post('/agent/fetch', async (req, res) => {
    // ... (Keep existing scraping logic for fetch functionality) ...
    const { url, jobId } = req.body;
    if (!url) return res.status(400).json({ error: 'LinkedIn URL is required' });

    try {
        // 1. Fetch text content from LinkedIn (Using stored session or fresh login)
        const rawData = await scrapeLinkedIn(url);

        // 2. Segregate skills and info using Gemini Agent
        const analysis = await segregateSkills(rawData);

        if (!analysis) {
            return res.status(500).json({ error: 'AI failed to process profile data' });
        }

        // 3. Save to MongoDB in common format
        const newCandidate = new Candidate({
            ...analysis,
            email: analysis.email || `pending-${Math.random().toString(36).substr(2, 5)}@linkedin.com`,
            jobId: jobId || null,
            source: 'LinkedIn Agent'
        });

        const savedCandidate = await newCandidate.save();
        console.log('✨ Agent saved candidate successfully:', savedCandidate.name);

        res.json({
            status: 'success',
            message: 'LinkedIn Agent processed and saved candidate',
            candidateId: savedCandidate._id,
            data: analysis
        });

    } catch (err) {
        console.error('Agent Failure:', err);
        res.status(500).json({ status: 'failed', error: err.message });
    }
});

// Database Connection and Server Start
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB');
        const PORT = process.env.PORT || 8090;
        app.listen(PORT, () => {
            console.log(`🤖 LinkedIn Recruitment Agent is ONLINE on port ${PORT}`);
            console.log(`📍 Endpoint: POST http://localhost:${PORT}/agent/fetch`);
            console.log(`🔗 OAuth Callback: http://localhost:${PORT}/auth/linkedin/callback`);
        });
    })
    .catch(err => console.error('❌ MongoDB Connection Error:', err));
