package com.recruitai.agent.controller;

import com.recruitai.agent.entity.Company;
import com.recruitai.agent.repository.CompanyRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Optional;

@RestController
@RequestMapping("/api/company")
public class CompanyController {

    @Autowired
    private CompanyRepository companyRepository;

    @GetMapping
    public ResponseEntity<Company> getCompany() {
        return ResponseEntity.ok(companyRepository.findTopByOrderByIdAsc().orElse(new Company()));
    }

    @PutMapping
    public ResponseEntity<?> updateCompany(@RequestBody Company company) {
        if (company != null) {
            if (company.getName() != null && company.getName().length() > 100) {
                return ResponseEntity.badRequest().body(java.util.Map.of("message", "Company name is too long (max 100).", "error", "Company name is too long (max 100)."));
            }
            if (company.getWebsite() != null && !company.getWebsite().isBlank()) {
                String ws = company.getWebsite().trim();
                if (!isValidUrl(ws)) {
                    return ResponseEntity.badRequest().body(java.util.Map.of("message", "Enter a valid URL (https://...).", "error", "Enter a valid URL (https://...)."));
                }
            }
            if (company.getDescription() != null && company.getDescription().length() > 500) {
                return ResponseEntity.badRequest().body(java.util.Map.of("message", "Description is too long (max 500).", "error", "Description is too long (max 500)."));
            }
            if (company.getHeadquarters() != null && company.getHeadquarters().length() > 100) {
                return ResponseEntity.badRequest().body(java.util.Map.of("message", "Headquarters is too long (max 100).", "error", "Headquarters is too long (max 100)."));
            }
        }

        Optional<Company> existing = companyRepository.findTopByOrderByIdAsc();
        if (existing.isPresent()) {
            Company current = existing.get();
            current.setName(company != null ? company.getName() : null);
            current.setLogo(company != null ? company.getLogo() : null);
            current.setWebsite(company != null ? company.getWebsite() : null);
            current.setDescription(company != null ? company.getDescription() : null);
            current.setHeadquarters(company != null ? company.getHeadquarters() : null);
            current.setSize(company != null ? company.getSize() : null);
            return ResponseEntity.ok(companyRepository.save(current));
        } else {
            return ResponseEntity.ok(companyRepository.save(company != null ? company : new Company()));
        }
    }

    private boolean isValidUrl(String url) {
        try {
            java.net.URI uri = new java.net.URI(url);
            String scheme = uri.getScheme();
            if (scheme == null || (!scheme.equalsIgnoreCase("http") && !scheme.equalsIgnoreCase("https"))) {
                return false;
            }
            return uri.getHost() != null && !uri.getHost().isBlank();
        } catch (Exception e) {
            return false;
        }
    }
}
