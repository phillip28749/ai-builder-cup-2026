# Agent Instructions

## Project context

This repository contains a hackathon proof of concept for AsensoPost Studio. Keep implementation decisions aligned with the high-level constraints below and the detailed specifications linked here.

## General instructions

- Treat this as a focused proof of concept. Prefer clear, demonstrable behavior and a cohesive experience over production-scale scope.
- Follow the technical, design, and testing requirements in [TECH_SPEC.md](TECH_SPEC.md), [DESIGN_SPEC.md](DESIGN_SPEC.md), and [TEST_SPEC.md](TEST_SPEC.md).
- Keep user-facing claims accurate. Clearly identify sample data, simulated integrations, and fallback AI behavior.
- Preserve owner control over customer commitments and orders.
- Keep the application usable on mobile and desktop, with accessible controls and clear feedback for loading, success, empty, and error states.
- Do not introduce unrelated features or complexity beyond the POC requirements.

## Technology and deployment constraints

- The hackathon prototype must use Google Cloud as its primary application platform and deploy on **Cloud Run or Firebase Hosting**.
- Integrate a Google AI model, preferably Gemini, for a meaningful AI capability.
- Keep model credentials and privileged integration logic on the server side.
- Use Google Sheets for product, stock, or order data when practical; support a clearly labeled demo fallback if external connectivity is unavailable.
- Do not make a non-Google cloud provider or paid third-party service necessary for the core demonstration.
- Do not add environment setup documentation, environment variable inventories, secrets, or deployment credentials to this file.

## Project specifications

- [Technical specification](TECH_SPEC.md)
- [Design specification](DESIGN_SPEC.md)
- [Testing specification](TEST_SPEC.md)

These files hold detailed requirements. Keep this agent file limited to durable, high-level repository guidance.
