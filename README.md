# Karim Centre (KC) Electricity Software

This monorepo contains the electricity management software for Karim Centre (KC). It includes both the legacy desktop application and the modern web-based successor.

## Repository Structure

- **[kc-electricity-software](./kc-electricity-software)**: Legacy VB6 / Crystal Reports desktop application source, reports, and documentation.
- **[kc-electricity-software-v2](./kc-electricity-software-v2)**: Modern web application successor built with Next.js, React, and TypeScript.

---

## Getting Started

### Web Application (v2)

To run the Next.js web application locally:

1. Navigate to the `kc-electricity-software-v2` directory:
   ```bash
   cd kc-electricity-software-v2
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure the local environment variables in `kc-electricity-software-v2/.env.local` (see `kc-electricity-software-v2/.env.example` for details).
4. Run the development server:
   ```bash
   npm run dev
   ```

### Legacy Desktop Application

The legacy files and database backups are located in `kc-electricity-software`. Please refer to the documentation inside that directory for legacy database restoration and execution instructions.
