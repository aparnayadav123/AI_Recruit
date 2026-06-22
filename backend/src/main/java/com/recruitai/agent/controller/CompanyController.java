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
    public ResponseEntity<Company> updateCompany(@RequestBody Company company) {
        Optional<Company> existing = companyRepository.findTopByOrderByIdAsc();
        if (existing.isPresent()) {
            Company current = existing.get();
            current.setName(company.getName());
            current.setLogo(company.getLogo());
            current.setWebsite(company.getWebsite());
            current.setDescription(company.getDescription());
            current.setHeadquarters(company.getHeadquarters());
            current.setSize(company.getSize());
            return ResponseEntity.ok(companyRepository.save(current));
        } else {
            return ResponseEntity.ok(companyRepository.save(company));
        }
    }
}
