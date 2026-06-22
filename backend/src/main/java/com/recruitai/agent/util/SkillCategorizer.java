package com.recruitai.agent.util;

import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Categorizes skills into standardized categories for better analysis
 * Categories: Programming Languages, Frameworks, Tools, Cloud/DevOps, Databases
 */
@Component
public class SkillCategorizer {

    // Skill category definitions
    private static final Map<String, Set<String>> SKILL_CATEGORIES = new HashMap<>();

    static {
        // Programming Languages
        SKILL_CATEGORIES.put("Programming Languages", new HashSet<>(Arrays.asList(
                "Java", "Python", "JavaScript", "TypeScript", "C#", "C++", "C", "PHP", "Go", "Rust",
                "Swift", "Kotlin", "Scala", "Ruby", "Perl", "R", "MATLAB", "Dart", "Objective-C",
                "Visual Basic", "Assembly", "Haskell", "Elixir", "Clojure", "F#", "Groovy")));

        // Frameworks
        SKILL_CATEGORIES.put("Frameworks", new HashSet<>(Arrays.asList(
                "React", "Angular", "Vue", "Vue.js", "Next.js", "Nuxt.js", "Express", "Express.js",
                "Spring Boot", "Spring", "Hibernate", "Django", "Flask", "FastAPI", "Laravel",
                "ASP.NET", ".NET", "Ruby on Rails", "Rails", "jQuery", "Bootstrap", "Tailwind CSS",
                "Material-UI", "Ant Design", "Svelte", "Ember.js", "Backbone.js", "Meteor",
                "NestJS", "Koa", "Fastify", "Struts", "Play Framework", "Quarkus", "Micronaut",
                "React Native", "Flutter", "Ionic", "Xamarin", "Electron", "TensorFlow", "PyTorch",
                "Keras", "Scikit-learn", "Pandas", "NumPy", "SciPy")));

        // Tools
        SKILL_CATEGORIES.put("Tools", new HashSet<>(Arrays.asList(
                "Git", "GitHub", "GitLab", "Bitbucket", "SVN", "Jira", "Confluence", "Trello",
                "Asana", "Slack", "VS Code", "IntelliJ IDEA", "Eclipse", "Visual Studio",
                "PyCharm", "WebStorm", "Postman", "Insomnia", "Swagger", "Figma", "Adobe XD",
                "Sketch", "Photoshop", "Illustrator", "Maven", "Gradle", "npm", "Yarn", "Webpack",
                "Vite", "Babel", "ESLint", "Prettier", "SonarQube", "Selenium", "Cypress",
                "Playwright", "Appium", "JUnit", "TestNG", "Mockito", "Jest", "Mocha", "Chai",
                "Cucumber", "JMeter", "LoadRunner", "Gatling", "Tableau", "Power BI", "Looker",
                "Grafana", "Kibana", "Splunk", "New Relic", "Datadog", "Excel", "Google Analytics")));

        // Cloud/DevOps
        SKILL_CATEGORIES.put("Cloud/DevOps", new HashSet<>(Arrays.asList(
                "AWS", "Amazon Web Services", "Azure", "Microsoft Azure", "GCP", "Google Cloud Platform",
                "Google Cloud", "Docker", "Kubernetes", "K8s", "Jenkins", "CircleCI", "Travis CI",
                "GitLab CI", "GitHub Actions", "Terraform", "Ansible", "Puppet", "Chef", "CloudFormation",
                "Helm", "Istio", "Prometheus", "ELK Stack", "CI/CD", "DevOps", "Nginx", "Apache",
                "Tomcat", "IIS", "Linux", "Unix", "Ubuntu", "CentOS", "Red Hat", "Windows Server",
                "Bash", "Shell Scripting", "PowerShell", "Vagrant", "OpenStack", "VMware", "Heroku",
                "Netlify", "Vercel", "DigitalOcean", "Linode", "CloudFlare")));

        // Databases
        SKILL_CATEGORIES.put("Databases", new HashSet<>(Arrays.asList(
                "SQL", "MySQL", "PostgreSQL", "Oracle", "Oracle DB", "Microsoft SQL Server",
                "SQL Server", "SQLite", "MariaDB", "MongoDB", "Cassandra", "Redis", "Elasticsearch",
                "DynamoDB", "Firebase", "Firestore", "Couchbase", "CouchDB", "Neo4j", "GraphQL",
                "InfluxDB", "TimescaleDB", "Snowflake", "BigQuery", "Redshift", "Athena",
                "Aurora", "RDS", "CosmosDB", "HBase", "Hive", "Spark SQL", "Presto", "Druid")));
    }

    /**
     * Categorize a list of skills
     * 
     * @param skills List of skill names
     * @return Map of category -> list of skills in that category
     */
    public Map<String, List<String>> categorize(List<String> skills) {
        if (skills == null || skills.isEmpty()) {
            return new HashMap<>();
        }

        Map<String, List<String>> categorized = new LinkedHashMap<>();
        Set<String> uncategorized = new HashSet<>();

        for (String skill : skills) {
            if (skill == null || skill.trim().isEmpty()) {
                continue;
            }

            String trimmedSkill = skill.trim();
            boolean categorizedFlag = false;

            for (Map.Entry<String, Set<String>> entry : SKILL_CATEGORIES.entrySet()) {
                String category = entry.getKey();
                Set<String> categorySkills = entry.getValue();

                // Case-insensitive matching
                if (categorySkills.stream().anyMatch(s -> s.equalsIgnoreCase(trimmedSkill))) {
                    categorized.computeIfAbsent(category, k -> new ArrayList<>()).add(trimmedSkill);
                    categorizedFlag = true;
                    break;
                }
            }

            if (!categorizedFlag) {
                uncategorized.add(trimmedSkill);
            }
        }

        // Add uncategorized skills to "Other" category
        if (!uncategorized.isEmpty()) {
            categorized.put("Other", new ArrayList<>(uncategorized));
        }

        return categorized;
    }

    /**
     * Get category for a single skill
     * 
     * @param skill Skill name
     * @return Category name or "Other" if not found
     */
    public String getCategory(String skill) {
        if (skill == null || skill.trim().isEmpty()) {
            return "Other";
        }

        String trimmedSkill = skill.trim();

        for (Map.Entry<String, Set<String>> entry : SKILL_CATEGORIES.entrySet()) {
            String category = entry.getKey();
            Set<String> categorySkills = entry.getValue();

            if (categorySkills.stream().anyMatch(s -> s.equalsIgnoreCase(trimmedSkill))) {
                return category;
            }
        }

        return "Other";
    }

    /**
     * Get all skills in a specific category
     * 
     * @param skills   List of all skills
     * @param category Category name
     * @return List of skills in that category
     */
    public List<String> getSkillsByCategory(List<String> skills, String category) {
        if (skills == null || skills.isEmpty() || category == null) {
            return new ArrayList<>();
        }

        return skills.stream()
                .filter(skill -> getCategory(skill).equalsIgnoreCase(category))
                .collect(Collectors.toList());
    }

    /**
     * Get count of skills by category
     * 
     * @param skills List of skills
     * @return Map of category -> count
     */
    public Map<String, Integer> getCategoryCounts(List<String> skills) {
        Map<String, List<String>> categorized = categorize(skills);
        Map<String, Integer> counts = new LinkedHashMap<>();

        for (Map.Entry<String, List<String>> entry : categorized.entrySet()) {
            counts.put(entry.getKey(), entry.getValue().size());
        }

        return counts;
    }

    /**
     * Check if a skill exists in the known categories
     */
    public boolean isKnownSkill(String skill) {
        if (skill == null || skill.trim().isEmpty()) {
            return false;
        }

        String trimmedSkill = skill.trim();

        return SKILL_CATEGORIES.values().stream()
                .anyMatch(categorySkills -> categorySkills.stream().anyMatch(s -> s.equalsIgnoreCase(trimmedSkill)));
    }

    /**
     * Get all available categories
     */
    public Set<String> getAvailableCategories() {
        return SKILL_CATEGORIES.keySet();
    }
}
