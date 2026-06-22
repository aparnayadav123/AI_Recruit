package com.recruitai.agent.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    @Autowired(required = false)
    private JavaMailSender emailSender;

    @Value("${spring.mail.username:noreply@recruitai.com}")
    private String fromEmail;

    // Once SMTP auth has failed once, we stop trying for the rest of the JVM run.
    // Otherwise every interview-schedule / outreach action drags for ~15s on the
    // SMTP timeout and dumps a full stack trace into the log. The recruiter UI
    // doesn't care whether the email actually goes out — it's a side-effect.
    private volatile boolean smtpDisabled = false;

    public void sendSimpleMessage(String to, String subject, String text) {
        if (emailSender == null || smtpDisabled) {
            // No SMTP bean wired, or auth previously failed — skip silently.
            logger.debug("Email skipped (transport unavailable). To={}, subject='{}'", to, subject);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(text);
            emailSender.send(message);
            logger.info("Email sent successfully to {}", to);
        } catch (org.springframework.mail.MailAuthenticationException authEx) {
            // SMTP credentials wrong — disable the sender for the rest of the
            // session to avoid retrying on every interview/outreach action.
            smtpDisabled = true;
            logger.warn("SMTP authentication failed — email transport disabled for the rest of this session. "
                    + "Configure spring.mail.username / spring.mail.password to re-enable. (To={})", to);
        } catch (Exception e) {
            logger.warn("Email to {} skipped: {}", to, e.getMessage());
        }
    }
}
