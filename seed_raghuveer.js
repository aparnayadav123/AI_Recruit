import axios from 'axios';

const API_URL = 'http://localhost:8089/api/candidates';

const raghuveerData = {
    name: "Raghuveer Sakuru",
    email: "raghuveer.sakuru@zolix.ai",
    phone: "+91 98450 12345", 
    role: "Founder, CEO",
    currentOrganization: "Zolix.AI",
    location: "Bengaluru, Karnataka, India",
    locality: "Bengaluru",
    country: "India",
    experience: 25.0,
    relevantExperience: 18.0,
    skills: ["AI", "Sales Growth", "Engineering", "Consulting", "HR Tech", "Project Management", "Product Strategy"],
    currentSalary: "₹25M+",
    salaryExpectation: "N/A (Founder)",
    noticePeriod: 0,
    visaType: "USA (Consulting Background)",
    summary: "Began journey as an engineer in the U.S., consulting for global companies such as Sun Microsystems, Fair Isaac, Kellogg, Oracle, and Xilinx. Over 18 years at Kenexa (acquired by IBM). Currently Founder and CEO @ Zolix.AI driving sales growth and HR tech innovation.",
    status: "New",
    source: "LinkedIn Extension",
    uploadedBy: "Boligerla Aparna",
    japaneseLanguageProficiency: "N/A"
};

async function seed() {
    try {
        console.log('🌱 Seeding Raghuveer Sakuru...');
        const response = await axios.post(API_URL, raghuveerData);
        console.log('✅ Success:', response.data.id);
    } catch (error) {
        console.error('❌ Failed:', error.response ? error.response.data : error.message);
    }
}

seed();
