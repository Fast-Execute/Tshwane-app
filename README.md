# Tshwane Bus Fare Points Refill App

> **Status: interactive browser demo.** The sign-in, refill and balance flows run entirely in your browser with fake data; no real accounts or payments yet.  
> See [PROJECT_STATUS.md](PROJECT_STATUS.md) for the current completion figure, roadmap, and known gaps.

A dynamic solution for streamlining bus fare point refilling services and fostering local community connections in Tshwane (Pretoria), South Africa.

## 🚌 Overview

The Tshwane Bus Fare Points Refill App is a web-based platform that enables users to conveniently refill their bus fare points for public transportation. This application simplifies the payment process and provides users with an efficient way to manage their transportation credits.

## ✨ Features

- **User Dashboard**: View current balance, transaction history, and account details
- **Points Refill**: Quick and easy top-up of bus fare points
- **Home Page**: Overview of services and quick access to key features
- **Secure Transactions** *(planned)*: Ozow hosted checkout with verified webhooks; the current build is a demo and processes no payments
- **Mobile Responsive**: Fully responsive design for all devices
- **Community Focused**: Supporting local transportation needs

## 🎨 Design

- Built with **Bootstrap 5** for responsive design
- Green color theme representing sustainability and public transport
- Intuitive user interface for all user levels
- Accessibility-first approach

## 📁 Project Structure

```
Tshwane-app/
├── index.html           # Home page
├── login.html           # Sign in (demo)
├── register.html        # Create account (demo)
├── dashboard.html       # User dashboard
├── PointsRefill.html    # Points refill page
├── bus-stops.html       # Bus stop map (Leaflet / OpenStreetMap)
├── css/style.css        # Custom styles
├── js/
│   ├── script.js        # Demo auth, dashboard and refill logic
│   ├── bus-stops-map.js # Bus stop map and directions
│   └── app-config*.js   # Public runtime config (Supabase URL / publishable key)
├── database/            # Schema, Supabase migrations, security and API docs
├── supabase/            # Edge Functions (rider-api, ozow-webhook) and config
├── PROJECT_STATUS.md    # Roadmap, completion tracking, known gaps
└── README.md            # This file
```

## 🚀 Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/Fast-Execute/Tshwane-app.git
   ```

2. Open `index.html` in your web browser or serve through a local server

3. Navigate through the app using the navigation menu

## 🛠️ Technologies Used

- **HTML5** - Markup structure
- **CSS3** - Styling and animations
- **Bootstrap 5** - Responsive framework
- **JavaScript** - Interactivity and functionality
- **Bootstrap Icons** - Icon library

## 📱 Pages

### Home (index.html)

Landing page with:
- App overview and benefits
- Quick start guide
- Call-to-action buttons
- How it works section

### Dashboard (dashboard.html)

User account page with:
- Current balance display
- Recent transactions
- Quick refill button
- Account information
- Transaction history

### Points Refill (PointsRefill.html)

Refill management page with:
- Refill amount selection
- Payment method options
- Transaction processing
- Confirmation details
- Receipt generation

## 💚 Color Scheme

- **Primary Green**: #27ae60 (Main brand color)
- **Dark Green**: #1e8449 (Hover states, accents)
- **Light Green**: #d5f4e6 (Backgrounds, highlights)
- **White**: #ffffff (Cards, text areas)
- **Dark Gray**: #2c3e50 (Text)

## 🤝 Contributing

Contributions are welcome! Please open an issue for planned work and use [PROJECT_STATUS.md](PROJECT_STATUS.md) to understand the delivery roadmap.

## 📄 License

This project is licensed under the Apache License 2.0 - see the LICENSE file for details.

## 👤 Author

**Fast-Execute** - Database & Front-End Developer

---

**Made with 💚 for the Tshwane community**
